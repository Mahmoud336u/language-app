// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inspectRepository } from '../../scripts/check-test-integrity';

const repositories: string[] = [];
const path = 'tests/deployment/headers.spec.ts';

function fixture(approved: boolean) {
  const repo = mkdtempSync(join(tmpdir(), 'unpause-deployment-integrity-'));
  repositories.push(repo);
  const git = (...args: string[]) => {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo, encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }
    });
    if (result.status !== 0) throw new Error(`Git fixture failed: ${result.stderr}`);
    return result.stdout.trim();
  };
  const write = (file: string, value: string) => {
    mkdirSync(dirname(join(repo, file)), { recursive: true });
    writeFileSync(join(repo, file), value);
  };
  const commit = (message: string) => {
    git('add', '--all');
    git('commit', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Fixture author');
  git('config', 'user.email', 'fixture@example.invalid');
  write('AGENTS.md', 'Repository owner: @owner\n');
  write('docs/product-decisions.md', `## D-20: Header assertions\n**Status:** ${approved ? 'APPROVED' : 'PROPOSED'}\n**Approved by:** @owner\n**Approval reference:** https://github.com/owner/repository/pull/20\n`);
  write(path, "it('headers', () => expect(headers).toContain('nosniff'));\n");
  const base = commit('trusted baseline');
  git('switch', '-c', 'feature');
  write(path, "it('headers', () => expect(headers).toEqual(['nosniff', 'no-referrer']));\n");
  return { repo, base, write, commit };
}

afterEach(() => {
  for (const repo of repositories.splice(0)) rmSync(repo, { recursive: true, force: true });
});

it('requires trusted owner approval for deployment-test revisions', () => {
  const f = fixture(false);
  const head = f.commit('test: revise headers\n\nDecision: D-20');
  const result = inspectRepository({ repo: f.repo, base: f.base, head });
  expect(result.ok).toBe(false);
  expect(result.violations).toContainEqual(expect.objectContaining({ code: 'TIER2_APPROVAL', path, commit: head }));
});

it('reports an approved deployment revision with its decision and commit', () => {
  const f = fixture(true);
  const head = f.commit('test: tighten headers\n\nDecision: D-20');
  const result = inspectRepository({ repo: f.repo, base: f.base, head });
  expect(result.ok).toBe(true);
  expect(result.revisions).toEqual([{ path, commit: head, decision: 'D-20' }]);
});

it('rejects a deployment revision mixed with implementation', () => {
  const f = fixture(true);
  f.write('src/headers.ts', 'export const header = "nosniff";\n');
  const head = f.commit('change code and tests\n\nDecision: D-20');
  const result = inspectRepository({ repo: f.repo, base: f.base, head });
  expect(result.ok).toBe(false);
  expect(result.violations).toContainEqual(expect.objectContaining({ code: 'TIER2_COMMIT_SCOPE', path, commit: head }));
});
