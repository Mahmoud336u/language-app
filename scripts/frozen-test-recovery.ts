
import type { IntegrityResult } from './check-test-integrity.ts';
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
export async function verifyFrozenRecovery(options: RecoveryOptions, inspection: IntegrityResult,
  readJson: ReadGitHubJson, git?: ReadGit): Promise<RecoveryDecision> {
  void options; void inspection; void readJson; void git;
  return { ok: false, status: 'blocked', fingerprint: '0'.repeat(64) };
}
