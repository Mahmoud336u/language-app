import type { IntegrityResult } from './check-test-integrity.ts';
import type { ApprovalDecision, ReadGitHubJson } from './integrity-approval.ts';

export interface TrustedGateOptions {
  repo: string;
  repository: string;
  pullRequest: number;
  base: string;
  head: string;
}

export interface GateReport {
  inspection: IntegrityResult;
  decision: ApprovalDecision;
}

export function runTrustedGate(_options: TrustedGateOptions, _readJson: ReadGitHubJson): Promise<GateReport> {
  return Promise.reject(new Error('Trusted approval runner is not implemented.'));
}
