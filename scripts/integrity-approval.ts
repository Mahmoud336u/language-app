import type { IntegrityResult } from './check-test-integrity.ts';
import { createHash } from 'node:crypto';

export interface ApprovalContext {
  repository: string;
  pullRequest: number;
  owner: string;
  base: string;
  head: string;
}

export interface ApprovalDecision {
  ok: boolean;
  status: 'clean' | 'blocked' | 'approval-required' | 'owner-approved';
  fingerprint: string;
  approval?: { id: number; url: string; reason: string };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateContext(context: ApprovalContext): void {
  if (!/^[\w-]+\/[\w.-]+$/.test(context.repository)
    || context.repository.split('/').some((part) => part === '.' || part === '..')
    || !Number.isSafeInteger(context.pullRequest) || context.pullRequest < 1
    || !/^[\w-]+$/.test(context.owner)
    || !/^[a-f0-9]{40}$/.test(context.base) || !/^[a-f0-9]{40}$/.test(context.head)) {
    throw new Error('Invalid approval context.');
  }
}

export function approvalFingerprint(context: ApprovalContext, inspection: IntegrityResult): string {
  validateContext(context);
  const findings = inspection.violations.map(({ code, path, commit }) => [code, path, commit]);
  findings.sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
  return createHash('sha256').update(JSON.stringify([
    'unpause-integrity-approval-v1', context.repository, context.pullRequest, context.owner,
    context.base, context.head, findings
  ])).digest('hex');
}

export function evaluateApproval(context: ApprovalContext, inspection: IntegrityResult, comments: unknown[]): ApprovalDecision {
  const fingerprint = approvalFingerprint(context, inspection);
  if (inspection.ok && inspection.violations.length === 0) return { ok: true, status: 'clean', fingerprint };
  if (inspection.ok || inspection.violations.length === 0 || inspection.violations.some(({ code }) => code !== 'GOVERNANCE_CHANGE')) {
    return { ok: false, status: 'blocked', fingerprint };
  }
  const required: ApprovalDecision = { ok: false, status: 'approval-required', fingerprint };
  const commands = comments.filter((value): value is Record<string, unknown> => record(value)
    && record(value.user) && value.user.type === 'User' && typeof value.user.login === 'string'
    && value.user.login.toLowerCase() === context.owner.toLowerCase()
    && typeof value.body === 'string' && value.body.trim().startsWith('/integrity-')
    && typeof value.id === 'number' && Number.isSafeInteger(value.id) && value.id > 0);
  commands.sort((a, b) => Number(b.id) - Number(a.id));
  const latest = commands[0];
  if (!latest || typeof latest.created_at !== 'string' || !Number.isFinite(Date.parse(latest.created_at))
    || latest.created_at !== latest.updated_at || typeof latest.body !== 'string') return required;
  const command = /^\/integrity-approve ([a-f0-9]{64})\r?\nReason: ([^\r\n]+)$/.exec(latest.body.trim());
  const reason = command?.[2]?.trim();
  if (command?.[1] !== fingerprint || !reason || typeof latest.id !== 'number') return required;
  const prefix = `https://github.com/${context.repository}`;
  if (latest.html_url !== `${prefix}/pull/${context.pullRequest}#issuecomment-${latest.id}`
    && latest.html_url !== `${prefix}/issues/${context.pullRequest}#issuecomment-${latest.id}`) return required;
  return { ok: true, status: 'owner-approved', fingerprint,
    approval: { id: latest.id, url: latest.html_url, reason } };
}

export type ReadGitHubJson = (path: string) => Promise<unknown>;

function assertCurrentPullRequest(context: ApprovalContext, value: unknown): void {
  if (!record(value) || value.number !== context.pullRequest || value.state !== 'open'
    || !record(value.head) || value.head.sha !== context.head
    || !record(value.base) || value.base.sha !== context.base
    || !record(value.base.repo) || value.base.repo.full_name !== context.repository) {
    throw new Error('PR identity, state, base, or head changed; run a fresh check.');
  }
}

export async function verifyGitHubApproval(context: ApprovalContext, inspection: IntegrityResult, readJson: ReadGitHubJson): Promise<ApprovalDecision> {
  const initial = evaluateApproval(context, inspection, []);
  if (initial.status === 'blocked') return initial;
  const root = `/repos/${context.repository}`;
  const prPath = `${root}/pulls/${context.pullRequest}`;
  assertCurrentPullRequest(context, await readJson(prPath));
  const comments: unknown[] = [];
  if (initial.status === 'approval-required') {
    for (let page = 1; page <= 20; page++) {
      const values = await readJson(`${root}/issues/${context.pullRequest}/comments?per_page=100&page=${page}`);
      if (!Array.isArray(values) || values.length > 100) throw new Error('Invalid approval comment page.');
      comments.push(...values);
      if (values.length < 100) break;
      if (page === 20) throw new Error('Approval history exceeds the inspection limit.');
    }
  }
  assertCurrentPullRequest(context, await readJson(prPath));
  return evaluateApproval(context, inspection, comments);
}

export function githubReader(token: string, request: typeof fetch = fetch): ReadGitHubJson {
  return async (path) => {
    const endpoint = /^\/repos\/[\w-]+\/[\w.-]+\/(pulls\/[1-9]\d*|issues\/[1-9]\d*\/comments\?per_page=100&page=[1-9]\d*)$/;
    if (!token || !endpoint.test(path) || path.split('/').includes('..') || path.split('/').includes('.')) {
      throw new Error('Unsupported GitHub approval request.');
    }
    try {
      const response = await request(`https://api.github.com${path}`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      });
      if (!response.ok || !response.body) throw new Error('GitHub approval evidence unavailable.');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.byteLength;
        if (length > 1024 * 1024) {
          await reader.cancel();
          throw new Error('Approval response exceeds the inspection limit.');
        }
        chunks.push(next.value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      // Do not log the token, request headers, or server-supplied error bodies.
      throw new Error('GitHub approval evidence unavailable, malformed, or exceeds limits.');
    }
  };
}
