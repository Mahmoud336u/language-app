export interface Violation {
  code: string;
  path: string;
  commit: string;
  message: string;
}

export interface IntegrityResult {
  ok: boolean;
  violations: Violation[];
  revisions: { path: string; commit: string; decision: string }[];
  commitsChecked: number;
}

export interface IntegrityOptions {
  repo: string;
  base: string;
  head: string;
}

interface TreeEntry { mode: string; type: string; oid: string }
interface Change { status: string; path: string }

const isFrozen = (path: string) => /^(tests\/(contracts|support|helpers|fixtures)\/|tests\/setup\.[cm]?[jt]sx?$)/.test(path);
const isTier2 = (path: string) => /^tests\/(ui|e2e|deployment|visual|accessibility)\//.test(path) || /(^|\/)(__snapshots__|__screenshots__)\//.test(path) || path.endsWith('.snap');
const isTest = (path: string) => path.startsWith('tests/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
const isSource = (path: string) => /\.[cm]?[jt]sx?$/.test(path);
const isGovernance = (path: string) =>
  /^(AGENTS\.md|docs\/(tdd-policy|product-decisions)\.md|package(?:-lock)?\.json|npm-shrinkwrap\.json|\.npmrc|\.nvmrc|\.gitattributes)$/.test(path)
  || /^(\.github|scripts)\//.test(path)
  || /(^|\/)(tsconfig[^/]*\.json|(?:vitest|vite|playwright|eslint|tailwind|postcss)[^/]*\.config\.[^/]+|(?:vitest|vite|playwright|eslint|tailwind|postcss)\.config\.[^/]+|wrangler\.[^/]+|\.eslintrc[^/]*|\.eslintignore)$/.test(path);

// Git reads only objects. No checkout, diff drivers, hooks, replacement objects,
// shell interpolation, repository dependencies, or PR-provided code are used.
function reader(repo: string) {
  return (...args: string[]): string => {
    const result = spawnSync('git', [
      '-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false',
      '-c', 'diff.external=', '-c', 'core.attributesFile=/dev/null', ...args
    ], {
      cwd: resolve(repo), encoding: 'utf8', timeout: 20_000, maxBuffer: 32 * 1024 * 1024,
      env: {
        PATH: process.env.PATH ?? '/usr/bin:/bin', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8',
        GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
        GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0'
      }
    });
    if (result.status !== 0 || result.error) throw new Error('Git history is unavailable, invalid, or exceeds inspection limits.');
    return result.stdout;
  };
}

type GitReader = ReturnType<typeof reader>;

function commitOid(git: GitReader, ref: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/@{}^~+-]*$/.test(ref)) throw new Error('Invalid revision.');
  const oid = git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
  if (!/^[a-f0-9]{40,64}$/.test(oid)) throw new Error('Invalid commit object.');
  return oid;
}

function tree(git: GitReader, oid: string): Map<string, TreeEntry> {
  const entries = new Map<string, TreeEntry>();
  for (const record of git('ls-tree', '-rz', '--full-tree', oid).split('\0')) {
    if (!record) continue;
    const tab = record.indexOf('\t');
    const [mode, type, hash] = record.slice(0, tab).split(' ');
    if (tab < 0 || !mode || !type || !hash) throw new Error('Invalid tree record.');
    entries.set(record.slice(tab + 1), { mode, type, oid: hash });
  }
  return entries;
}

function changes(git: GitReader, parent: string, commit: string): Change[] {
  const records = git('diff-tree', '--no-commit-id', '--no-ext-diff', '--no-textconv', '--no-renames', '-r', '--raw', '-z', parent, commit).split('\0');
  const result: Change[] = [];
  for (let index = 0; index < records.length - 1; index += 2) {
    const header = records[index];
    const path = records[index + 1];
    const status = header?.split(' ').at(-1);
    if (!header?.startsWith(':') || !path || !status) throw new Error('Invalid change record.');
    result.push({ status, path });
  }
  return result;
}

function textBlob(git: GitReader, entry: TreeEntry | undefined): string {
  if (!entry || entry.type !== 'blob' || !/^100(644|755)$/.test(entry.mode)) return '';
  const size = Number(git('cat-file', '-s', entry.oid).trim());
  if (!Number.isSafeInteger(size) || size > 2 * 1024 * 1024) throw new Error('Protected source exceeds inspection limit.');
  return git('cat-file', 'blob', entry.oid);
}

function approvedDecisions(git: GitReader, baseTree: Map<string, TreeEntry>): Set<string> {
  const owner = /^Repository owner: @([\w-]+)\s*$/m.exec(textBlob(git, baseTree.get('AGENTS.md')))?.[1];
  const approved = new Set<string>();
  if (!owner) return approved;
  const source = textBlob(git, baseTree.get('docs/product-decisions.md'));
  for (const section of source.split(/(?=^## D-\d+:)/m)) {
    const id = /^## (D-\d+):/m.exec(section)?.[1];
    const author = /^\*\*Approved by:\*\* @([\w-]+)\s*$/m.exec(section)?.[1];
    const reference = /^\*\*Approval reference:\*\* (https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/[1-9]\d*(?:#[\w-]+)?)\s*$/m.test(section);
    if (id && author === owner && reference && /^\*\*Status:\*\* APPROVED\s*$/m.test(section)) approved.add(id);
  }
  return approved;
}

interface Token { value: string; literal: boolean }

// Conservative lexical inspection, not an execution engine. Strings/comments
// are inert except when used as computed property names. Semantic weakening and
// dynamically generated calls still require owner review.
function tokens(source: string): Token[] {
  const result: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index] ?? '';
    if (/\s/.test(char)) { index++; continue; }
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index + 2);
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) throw new Error('Unterminated source comment.');
      index = end + 2;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      let value = '';
      let closed = false;
      index++;
      while (index < source.length) {
        const next = source[index++];
        if (next === char) { closed = true; break; }
        if (next === '\\') { value += source[index++] ?? ''; }
        else value += next;
      }
      if (!closed) throw new Error('Unterminated source literal.');
      result.push({ value, literal: true });
      continue;
    }
    const word = /^[\w$]+/.exec(source.slice(index))?.[0];
    if (word) { result.push({ value: word, literal: false }); index += word.length; }
    else { result.push({ value: char, literal: false }); index++; }
  }
  return result;
}

function hasBypass(source: string): boolean {
  const stream = tokens(source);
  const forbidden = new Set(['skip', 'only', 'fixme', 'todo', 'skipIf', 'runIf']);
  return stream.some((token, index) => {
    const previous = stream[index - 1]?.value;
    const next = stream[index + 1]?.value;
    if (!token.literal && /^(xit|xtest|xdescribe|fit|fdescribe)$/.test(token.value)) return true;
    return forbidden.has(token.value) && (previous === '.' || (previous === '[' && next === ']') || (!token.literal && next === ':'));
  });
}

function decisionTrailer(message: string): string | undefined {
  const block = message.trim().split(/\n\s*\n/).at(-1) ?? '';
  const lines = block.split('\n');
  if (!lines.every((line) => /^[A-Za-z][A-Za-z-]*: .+$/.test(line))) return undefined;
  const matches = lines.filter((line) => /^Decision: D-\d+$/.test(line));
  return matches.length === 1 ? matches[0]?.slice('Decision: '.length) : undefined;
}

export function inspectRepository(options: IntegrityOptions): IntegrityResult {
  const result: IntegrityResult = { ok: true, violations: [], revisions: [], commitsChecked: 0 };
  const seen = new Set<string>();
  const report = (code: string, path: string, commit: string, message: string) => {
    const key = JSON.stringify([code, path, commit]);
    if (!seen.has(key)) { result.violations.push({ code, path, commit, message }); seen.add(key); }
  };
  try {
    const git = reader(options.repo);
    if (git('rev-parse', '--is-shallow-repository').trim() !== 'false') throw new Error('Full history is required.');
    const base = commitOid(git, options.base);
    const head = commitOid(git, options.head);
    const mergeBase = git('merge-base', base, head).trim();
    if (!/^[a-f0-9]{40,64}$/.test(mergeBase)) throw new Error('A common base is required.');
    const approved = approvedDecisions(git, tree(git, base));
    const baseline = tree(git, mergeBase);
    const frozen = new Map([...baseline].filter(([path]) => isFrozen(path)));
    const commits = git('rev-list', '--reverse', '--topo-order', `${mergeBase}..${head}`).trim().split('\n').filter(Boolean);
    if (commits.length > 2000) throw new Error('History exceeds the 2000-commit inspection limit.');
    for (const commit of commits) {
      const current = tree(git, commit);
      const parentLine = git('rev-list', '--parents', '-n', '1', commit).trim().split(' ');
      const parents = parentLine.slice(1);
      if (!parents.length) throw new Error('Unexpected root commit in feature history.');
      const allChanges = new Map<string, Change>();
      const tier2Revisions = new Set<string>();
      for (const parent of parents) {
        for (const change of changes(git, parent, commit)) {
          allChanges.set(change.path, change);
          if (isFrozen(change.path)) {
            const entry = current.get(change.path);
            const known = frozen.get(change.path);
            if (change.status !== 'A' || (known && (known.oid !== entry?.oid || known.mode !== entry.mode))) {
              report('FROZEN_CHANGE', change.path, commit, 'Frozen content changed after its first commit; restoration does not erase history.');
            }
          }
          if (isTier2(change.path) && change.status !== 'A') tier2Revisions.add(change.path);
          if (isTest(change.path) && change.status === 'D') report('TEST_DELETION', change.path, commit, 'Test deletion requires explicit owner review.');
        }
      }
      const decision = decisionTrailer(git('show', '-s', '--format=%B', commit));
      for (const path of tier2Revisions) {
        if (!decision || !approved.has(decision)) report('TIER2_APPROVAL', path, commit, 'Revision requires an owner-approved decision version in trusted base history.');
        else result.revisions.push({ path, commit, decision });
        if ([...allChanges.keys()].some((changedPath) => !isTier2(changedPath))) {
          report('TIER2_COMMIT_SCOPE', path, commit, 'Tier 2 revisions must be in a dedicated test-only commit.');
        }
      }
      for (const { path, status } of allChanges.values()) {
        if (isGovernance(path)) report('GOVERNANCE_CHANGE', path, commit, 'Protected enforcement or governance change requires owner review; no trailer can waive it.');
        if (status !== 'D' && isTest(path)) {
          const entry = current.get(path);
          if (!entry || entry.type !== 'blob' || entry.mode !== '100644') report('UNSAFE_TEST_FILE', path, commit, 'Tests must be regular non-executable files.');
          else if (isSource(path) && hasBypass(textBlob(git, entry))) report('TEST_BYPASS', path, commit, 'Executable skip, focus, or conditional-disable pattern detected.');
        }
      }
      for (const [path, entry] of current) {
        if (isFrozen(path) && !frozen.has(path)) frozen.set(path, entry);
      }
      result.commitsChecked++;
    }
  } catch (error) {
    report('HISTORY_UNAVAILABLE', '', '', error instanceof Error ? error.message : 'Inspection failed.');
  }
  result.ok = result.violations.length === 0;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key || !['--repo', '--base', '--head'].includes(key) || !value || values.has(key)) {
      process.stderr.write('Usage: node scripts/check-test-integrity.ts --repo PATH --base REF --head REF\n');
      process.exit(2);
    }
    values.set(key, value);
  }
  const repo = values.get('--repo');
  const base = values.get('--base');
  const head = values.get('--head');
  if (!repo || !base || !head) {
    process.stderr.write('Repository, trusted base, and head are required.\n');
    process.exit(2);
  }
  const result = inspectRepository({ repo, base, head });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exitCode = result.ok ? 0 : 1;
}
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

