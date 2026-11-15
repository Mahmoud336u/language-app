import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { IntegrityResult } from './check-test-integrity.ts';
import { approvalFingerprint } from './integrity-approval.ts';
import type { ApprovalContext, ReadGitHubJson } from './integrity-approval.ts';

export type ReadGit = (...args: string[]) => string;
export interface RecoveryOptions extends ApprovalContext { repo: string }
export interface RecoveryDecision {
  ok: boolean;
  status: 'blocked' | 'correction-approval-required' | 'owner-approved-correction';
  fingerprint: string;
  authorization?: { path: string; blob: string; entry: Record<string, unknown> };
  evidence?: { commit: string; parents: string[]; blob: string }[];
  approval?: { id: number; url: string; reason: string };
}

const registryPath = 'scripts/frozen-test-exceptions.json';
const identity = {
  id: 'pr-13-mechanical-fixture-access', repository: 'Mahmoud336u/language-app', pullRequest: 13,
  path: 'tests/contracts/session-state.test.ts',
  correctionCommit: 'cc973a5e446e08e2c72a0944f270c24bd8b3773f',
  beforeBlob: '6ef64c1f535b0360cf6edb5a6fcd621c245f3f7c',
  afterBlob: 'cbc38e844126fc816515478e079b2e94f861bd83', fileMode: '100644'
} as const;

const sha = /^[a-f0-9]{40}$/;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireEvidence(condition: unknown): asserts condition {
  if (!condition) throw new Error('Recovery evidence is invalid or unavailable.');
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

function gitReader(repo: string): ReadGit {
  return (...args) => {
    const result = spawnSync('git', [
      '-c', 'core.hooksPath=/dev/null',
      '-c', 'core.fsmonitor=false',
      '-c', 'diff.external=',
      '-c', 'core.attributesFile=/dev/null',
      ...args
    ], {
      cwd: resolve(repo),
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 256 * 1024,
      env: {
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_SYSTEM: '/dev/null',
        GIT_NO_REPLACE_OBJECTS: '1',
        GIT_TERMINAL_PROMPT: '0',
        GIT_OPTIONAL_LOCKS: '0'
      }
    });
    requireEvidence(result.status === 0 && !result.error);
    return result.stdout;
  };
}

function treeEntry(git: ReadGit, ref: string, path: string) {
  requireEvidence(sha.test(ref));
  const source = git('ls-tree', '-z', '--full-tree', ref, '--', path);
  if (source === '') return undefined;

  const match = /^100644 blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(source);
  requireEvidence(match?.[1] && match[2] === path);
  return match[1];
}

function ancestors(git: ReadGit, ref: string, firstParent = false): string[] {
  requireEvidence(sha.test(ref));
  const result = git(
    'rev-list',
    ...(firstParent ? ['--first-parent'] : []),
    '--max-count=2001',
    ref
  ).trim().split('\n');

  requireEvidence(
    result.length <= 2000
    && result.every(value => sha.test(value))
    && result[0] === ref
  );
  return result;
}

function parentsOf(git: ReadGit, ref: string): string[] {
  requireEvidence(sha.test(ref));
  const result = git('rev-list', '--parents', '-n', '1', ref).trim().split(' ');
  requireEvidence(result[0] === ref && result.every(value => sha.test(value)));
  return result.slice(1);
}

function proof(options: RecoveryOptions, inspection: IntegrityResult, git: ReadGit) {
  requireEvidence(git('rev-parse', '--is-shallow-repository').trim() === 'false');

  const blob = treeEntry(git, options.base, registryPath);
  if (!blob) return undefined;

  const size = Number(git('cat-file', '-s', blob).trim());
  requireEvidence(Number.isSafeInteger(size) && size > 0 && size <= 65536);

  const text = git('cat-file', 'blob', blob);
  requireEvidence(Buffer.byteLength(text) === size);

  const record: unknown = JSON.parse(text);
  requireEvidence(
    object(record)
    && exactKeys(record, ['version', 'exceptions'])
    && record.version === 1
    && Array.isArray(record.exceptions)
    && record.exceptions.length === 1
  );

  const entry: unknown = record.exceptions[0];
  requireEvidence(
    object(entry)
    && exactKeys(entry, [...Object.keys(identity), 'reason'])
    && Object.entries(identity).every(([key, value]) => entry[key] === value)
    && typeof entry.reason === 'string'
    && entry.reason.trim().length > 0
  );

  const authorization = {
    path: registryPath,
    blob,
    entry: { ...identity, reason: entry.reason }
  };

  const reachable = new Set(ancestors(git, options.head));
  requireEvidence(reachable.has(identity.correctionCommit));

  const correctionParents = parentsOf(git, identity.correctionCommit);
  const originalParent = correctionParents[0];
  requireEvidence(
    correctionParents.length === 1
    && originalParent
    && treeEntry(git, originalParent, identity.path) === identity.beforeBlob
    && treeEntry(git, identity.correctionCommit, identity.path) === identity.afterBlob
    && treeEntry(git, options.head, identity.path) === identity.afterBlob
  );

  const frozen = inspection.violations.filter(value => value.code === 'FROZEN_CHANGE');
  requireEvidence(frozen.some(value => value.commit === identity.correctionCommit));

  const evidence = frozen.map(finding => {
    requireEvidence(finding.path === identity.path && reachable.has(finding.commit));

    const parents = parentsOf(git, finding.commit);
    if (finding.commit !== identity.correctionCommit) {
      const first = parents[0];
      requireEvidence(
        parents.length >= 2
        && first
        && ancestors(git, first, true).includes(identity.correctionCommit)
        && treeEntry(git, first, identity.path) === identity.afterBlob
        && treeEntry(git, finding.commit, identity.path) === identity.afterBlob
      );
    }

    return { commit: finding.commit, parents, blob: identity.afterBlob };
  }).sort((a, b) => compare(a.commit, b.commit));

  return { authorization, evidence };
}

function assertCurrent(options: RecoveryOptions, value: unknown): void {
  requireEvidence(
    object(value)
    && value.number === options.pullRequest
    && value.state === 'open'
    && object(value.head)
    && value.head.sha === options.head
    && object(value.base)
    && value.base.sha === options.base
    && object(value.base.repo)
    && value.base.repo.full_name === options.repository
  );
}

function ownerApproval(options: RecoveryOptions, fingerprint: string, comments: unknown[]) {
  const commands = comments.filter((value): value is Record<string, unknown> =>
    object(value)
    && object(value.user)
    && value.user.type === 'User'
    && typeof value.user.login === 'string'
    && value.user.login.toLowerCase() === options.owner.toLowerCase()
    && typeof value.body === 'string'
    && value.body.trim().startsWith('/integrity-')
    && typeof value.id === 'number'
    && Number.isSafeInteger(value.id)
    && value.id > 0
  );

  commands.sort((a, b) => Number(b.id) - Number(a.id));
  const latest = commands[0];

  if (
    !latest
    || typeof latest.created_at !== 'string'
    || !Number.isFinite(Date.parse(latest.created_at))
    || latest.created_at !== latest.updated_at
    || typeof latest.body !== 'string'
  ) return undefined;

  const command = /^\/integrity-approve-correction ([a-f0-9]{64})\r?\nReason: ([^\r\n]+)$/.exec(latest.body.trim());
  const reason = command?.[2]?.trim();

  if (
    command?.[1] !== fingerprint
    || !reason
    || typeof latest.id !== 'number'
  ) return undefined;

  const root = `https://github.com/${options.repository}`;
  if (
    latest.html_url !== `${root}/pull/${options.pullRequest}#issuecomment-${latest.id}`
    && latest.html_url !== `${root}/issues/${options.pullRequest}#issuecomment-${latest.id}`
  ) return undefined;

  return { id: latest.id, url: latest.html_url, reason };
}

/** The optional Git reader is a test seam; the workflow always uses the object-only reader. */
export async function verifyFrozenRecovery(
  options: RecoveryOptions,
  inspection: IntegrityResult,
  readJson: ReadGitHubJson,
  git: ReadGit = gitReader(options.repo)
): Promise<RecoveryDecision> {
  // Validates workflow metadata too.
  const legacyFingerprint = approvalFingerprint(options, inspection);
  const blocked: RecoveryDecision = {
    ok: false,
    status: 'blocked',
    fingerprint: legacyFingerprint
  };

  if (
    options.repository !== identity.repository
    || options.pullRequest !== identity.pullRequest
    || options.owner.toLowerCase() !== 'mahmoud336u'
    || inspection.ok
    || inspection.violations.length === 0
    || inspection.violations.some(value =>
      !['FROZEN_CHANGE', 'GOVERNANCE_CHANGE'].includes(value.code)
    )
  ) return blocked;

  let verified: ReturnType<typeof proof>;
  try {
    verified = proof(options, inspection, git);
  } catch {
    return blocked;
  }
  if (!verified) return blocked;

  const findings = inspection.violations.map(({ code, path, commit }) => [code, path, commit]);
  findings.sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b)));

  const fingerprint = createHash('sha256').update(JSON.stringify([
    'unpause-exact-correction-v1',
    options.repository,
    options.pullRequest,
    options.owner,
    options.base,
    options.head,
    findings,
    verified.authorization,
    verified.evidence
  ])).digest('hex');

  const pending: RecoveryDecision = {
    ok: false,
    status: 'correction-approval-required',
    fingerprint,
    ...verified
  };

  const root = `/repos/${options.repository}`;
  const prPath = `${root}/pulls/${options.pullRequest}`;

  assertCurrent(options, await readJson(prPath));

  const comments: unknown[] = [];
  for (let page = 1; page <= 20; page++) {
    const values = await readJson(
      `${root}/issues/${options.pullRequest}/comments?per_page=100&page=${page}`
    );
    requireEvidence(Array.isArray(values) && values.length <= 100);
    comments.push(...values);
    if (values.length < 100) break;
    requireEvidence(page < 20);
  }

  assertCurrent(options, await readJson(prPath));

  const approval = ownerApproval(options, fingerprint, comments);
  return approval
    ? { ...pending, ok: true, status: 'owner-approved-correction', approval }
    : pending;
}
