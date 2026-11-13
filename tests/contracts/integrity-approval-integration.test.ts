// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { inspectRepository } from '../../scripts/check-test-integrity';
import { approvalFingerprint } from '../../scripts/integrity-approval';
import { runTrustedGate } from '../../scripts/run-test-integrity';

const repositories: string[] = [];
const original = "import { it, expect } from 'vitest'; it('contract', () => expect(2).toBe(2));\n";
function git(repo: string, ...args: string[]): string {
  const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], {
    cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }
  });
  if (result.status !== 0) throw new Error(`Git fixture failed: ${args[0]}`);
  return result.stdout.trim();
}
function fixture(ownerText = 'Repository owner: @owner\n') {
  const repo = mkdtempSync(join(tmpdir(), 'unpause-owner-approval-'));
  repositories.push(repo);
  const write = (path: string, text: string) => { mkdirSync(dirname(join(repo, path)), { recursive: true }); writeFileSync(join(repo, path), text); };
  const commit = () => { git(repo, 'add', '--all'); git(repo, 'commit', '-m', 'fixture'); return git(repo, 'rev-parse', 'HEAD'); };
  git(repo, 'init', '--initial-branch=main');
  git(repo, 'config', 'user.name', 'Fixture');
  git(repo, 'config', 'user.email', 'fixture@example.invalid');
  write('AGENTS.md', ownerText);
  write('tests/contracts/existing.test.ts', original);
  const base = commit();
  git(repo, 'switch', '-c', 'feature');
  write('package.json', '{"private":true}\n');
  const head = commit();
  const options = { repo, repository: 'owner/repository', pullRequest: 4, base, head };
  return { repo, write, commit, options };
}
afterEach(() => { for (const repo of repositories.splice(0)) rmSync(repo, { recursive: true, force: true }); });

describe('trusted runner with real Git history', () => {
  it('keeps the raw checker rejecting governance while the wrapper records exact owner approval', async () => {
    const f = fixture();
    const inspection = inspectRepository(f.options);
    expect(inspection.ok).toBe(false);
    const fingerprint = approvalFingerprint({ ...f.options, owner: 'owner' }, inspection);
    const read = vi.fn(async (path: string) => path.includes('/comments?') ? [{
      id: 1, user: { login: 'owner', type: 'User' }, created_at: '2026-11-13T12:00:00Z', updated_at: '2026-11-13T12:00:00Z',
      body: `/integrity-approve ${fingerprint}\nReason: Reviewed the package manifest.`,
      html_url: 'https://github.com/owner/repository/pull/4#issuecomment-1'
    }] : { number: 4, state: 'open', base: { sha: f.options.base, repo: { full_name: 'owner/repository' } }, head: { sha: f.options.head } });
    const report = await runTrustedGate(f.options, read);
    expect(report.decision.status).toBe('owner-approved');
    expect(report.inspection).toEqual(inspection);
    expect(git(f.repo, 'status', '--porcelain')).toBe('');
  });

  it('uses the base owner even if the PR changes AGENTS and installs a hostile checker', async () => {
    const f = fixture();
    const marker = join(f.repo, 'PAYLOAD_EXECUTED');
    f.write('AGENTS.md', 'Repository owner: @attacker\n');
    f.write('scripts/check-test-integrity.ts', `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'unsafe');`);
    f.options.head = f.commit();
    const inspection = inspectRepository(f.options);
    const fingerprint = approvalFingerprint({ ...f.options, owner: 'attacker' }, inspection);
    const read = vi.fn(async (path: string) => path.includes('/comments?') ? [{
      id: 1, user: { login: 'attacker', type: 'User' }, created_at: '2026-11-13T12:00:00Z', updated_at: '2026-11-13T12:00:00Z',
      body: `/integrity-approve ${fingerprint}\nReason: Forged authorization.`, html_url: 'https://github.com/owner/repository/pull/4#issuecomment-1'
    }] : { number: 4, state: 'open', base: { sha: f.options.base, repo: { full_name: 'owner/repository' } }, head: { sha: f.options.head } });
    const report = await runTrustedGate(f.options, read);
    expect(report.decision.status).toBe('approval-required');
    expect(report.decision.fingerprint).toBe(approvalFingerprint({ ...f.options, owner: 'owner' }, inspection));
    expect(existsSync(marker)).toBe(false);
  });

  it('blocks frozen-contract tampering before asking GitHub for approval', async () => {
    const f = fixture();
    f.write('tests/contracts/existing.test.ts', original.replace('toBe(2)', 'toBeTruthy()'));
    f.options.head = f.commit();
    const read = vi.fn();
    const report = await runTrustedGate(f.options, read);
    expect(report.decision.status).toBe('blocked');
    expect(report.inspection.violations.some(({ code }) => code === 'FROZEN_CHANGE')).toBe(true);
    expect(read).not.toHaveBeenCalled();
  });

  it.each(['No owner recorded\n', 'Repository owner: @owner\nRepository owner: @attacker\n'])('rejects missing or ambiguous trusted owner: %s', async (owner) => {
    const f = fixture(owner);
    const read = vi.fn();
    await expect(runTrustedGate(f.options, read)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });

  it.each([{ base: 'HEAD' }, { head: '--option' }, { pullRequest: Number.NaN }, { repository: 'owner/../other' }])('rejects invalid workflow metadata before network access: %j', async (change) => {
    const f = fixture();
    const read = vi.fn();
    await expect(runTrustedGate({ ...f.options, ...change }, read)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });

  it('the workflow entry point fails closed on missing metadata without disclosing credentials', () => {
    const result = spawnSync(process.execPath, [resolve('scripts/run-test-integrity.ts')], {
      cwd: process.cwd(), encoding: 'utf8', env: { PATH: process.env.PATH, GH_TOKEN: 'DO_NOT_PRINT_THIS_TOKEN' }
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('INTEGRITY_GATE_ERROR');
    expect(result.stdout + result.stderr).not.toContain('DO_NOT_PRINT_THIS_TOKEN');
  });
});
