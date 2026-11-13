import type { IntegrityResult } from './check-test-integrity.ts';

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

// Importable, deliberately non-authorizing seam for meaningful RED assertions.
export function approvalFingerprint(_context: ApprovalContext, _inspection: IntegrityResult): string {
  return '';
}

export function evaluateApproval(_context: ApprovalContext, _inspection: IntegrityResult, _comments: unknown[]): ApprovalDecision {
  return { ok: false, status: 'blocked', fingerprint: '' };
}

export type ReadGitHubJson = (path: string) => Promise<unknown>;

export async function verifyGitHubApproval(_context: ApprovalContext, _inspection: IntegrityResult, _readJson: ReadGitHubJson): Promise<ApprovalDecision> {
  return { ok: false, status: 'blocked', fingerprint: '' };
}

export function githubReader(_token: string, _request: typeof fetch = fetch): ReadGitHubJson {
  return () => Promise.reject(new Error('Approval reader is not implemented.'));
}
