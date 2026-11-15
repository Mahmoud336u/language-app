// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import * as recovery from '../../scripts/frozen-test-recovery';
import { inspectRepository } from '../../scripts/check-test-integrity';
import { runTrustedGate } from '../../scripts/run-test-integrity';

const directories: string[] = [];
function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'unpause-recovery-runner-'));
  directories.push(repo);
  const git = (...args: string[]) => {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }
    });
    if (result.status !== 0) throw new Error('Git fixture failed');
    return result.stdout.trim();
  };
  const write = (file: string, text: string) => {
    mkdirSync(dirname(join(repo, file)), { recursive: true }); writeFileSync(join(repo, file), text);
  };
  const commit = () => { git('add', '--all'); git('commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init', '--initial-branch=main'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  write('AGENTS.md', 'Repository owner: @Mahmoud336u\n');
  write('tests/contracts/session-state.test.ts', "export const expected = 'original';\n");
  const base = commit(); git('switch', '-c', 'feature');
  write('tests/contracts/session-state.test.ts', "export const expected = 'changed';\n");
  const head = commit();
  return { repo, write, commit, options: { repo, repository: 'Mahmoud336u/language-app', pullRequest: 13, base, head } };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const repo of directories.splice(0)) rmSync(repo, { recursive: true, force: true });
});

it('routes blocked findings to separate recovery without changing raw findings', async () => {
  const f = fixture(), inspection = inspectRepository(f.options), read = vi.fn();
  const decision: recovery.RecoveryDecision = { ok: true, status: 'owner-approved-correction', fingerprint: 'f'.repeat(64) };
  const verifier = vi.spyOn(recovery, 'verifyFrozenRecovery').mockResolvedValue(decision);
  const report = await runTrustedGate(f.options, read);
  expect(report).toEqual({ inspection, decision });
  expect(verifier).toHaveBeenCalledWith({ ...f.options, owner: 'Mahmoud336u' }, inspection, read);
});

it('does not invoke correction recovery for a clean result', async () => {
  const f = fixture(), verifier = vi.spyOn(recovery, 'verifyFrozenRecovery');
  const options = { ...f.options, head: f.options.base };
  const read = vi.fn(async () => ({ number: 13, state: 'open', head: { sha: options.head },
    base: { sha: options.base, repo: { full_name: options.repository } } }));
  expect((await runTrustedGate(options, read)).decision.status).toBe('clean');
  expect(verifier).not.toHaveBeenCalled();
});

it('ignores a candidate-only authorization record using real Git objects', async () => {
  const f = fixture();
  f.write('scripts/frozen-test-exceptions.json', readFileSync('scripts/frozen-test-exceptions.json', 'utf8'));
  f.options.head = f.commit();
  const read = vi.fn(), verifier = vi.spyOn(recovery, 'verifyFrozenRecovery');
  expect((await runTrustedGate(f.options, read)).decision.status).toBe('blocked');
  expect(verifier).toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
});
