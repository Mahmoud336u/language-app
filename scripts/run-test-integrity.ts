import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectRepository } from './check-test-integrity.ts';
import type { IntegrityResult } from './check-test-integrity.ts';
import { githubReader, verifyGitHubApproval } from './integrity-approval.ts';
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

export async function runTrustedGate(options: TrustedGateOptions, readJson: ReadGitHubJson): Promise<GateReport> {
  if (!/^[a-f0-9]{40}$/.test(options.base) || !/^[a-f0-9]{40}$/.test(options.head)) {
    throw new Error('Exact base and head commit SHAs are required.');
  }
  const ownerSource = spawnSync('git', [
    '-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false',
    'cat-file', 'blob', `${options.base}:AGENTS.md`
  ], {
    cwd: resolve(options.repo), encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8',
      GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_NO_REPLACE_OBJECTS: '1',
      GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' }
  });
  if (ownerSource.status !== 0 || ownerSource.error) throw new Error('Trusted owner metadata is unavailable.');
  const owners = [...ownerSource.stdout.matchAll(/^Repository owner: @([\w-]+)\s*$/gm)];
  const owner = owners[0]?.[1];
  if (owners.length !== 1 || !owner) throw new Error('Trusted base must identify exactly one repository owner.');
  const inspection = inspectRepository(options);
  const decision = await verifyGitHubApproval({ ...options, owner }, inspection, readJson);
  return { inspection, decision };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const token = process.env.GH_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;
    const base = process.env.BASE_SHA;
    const head = process.env.HEAD_SHA;
    const number = process.env.PR_NUMBER;
    if (!token || !repository || !base || !head || !number || !/^[1-9]\d*$/.test(number)) {
      throw new Error('GitHub token, repository, PR number, and exact commit SHAs are required.');
    }
    const report = await runTrustedGate({ repo: process.env.GITHUB_WORKSPACE ?? '.', repository,
      base, head, pullRequest: Number(number) }, githubReader(token));
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.decision.status === 'approval-required') {
      process.stdout.write('Owner action: review the exact raw findings and full diff/history, then post a NEW PR conversation comment:\n');
      process.stdout.write(`/integrity-approve ${report.decision.fingerprint}\nReason: <specific reason for these protected changes>\n`);
      process.stdout.write('Then rerun this trusted check. Ordinary review badges and commit trailers do not authorize exceptions.\n');
    }
    process.exitCode = report.decision.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`INTEGRITY_GATE_ERROR: ${error instanceof Error ? error.message : 'Inspection failed.'}\n`);
    process.exitCode = 1;
  }
}
