// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inspectRepository } from '../../scripts/check-test-integrity';

const temporaryRepositories: string[] = [];
const original = "import { it, expect } from 'vitest'; it('contract', () => expect(2).toBe(2));\n";
const changed = "import { it, expect } from 'vitest'; it('contract', () => expect(2).toBeTruthy());\n";
const approvedDecision = '## D-20: Foundation layout\n**Status:** APPROVED\n**Approved by:** @owner\n**Approval reference:** https://github.com/owner/repository/pull/20#issuecomment-123\nLayout revision approved.\n';

function git(repo: string, ...args: string[]): string {
  const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_TERMINAL_PROMPT: '0' }
  });
  if (result.status !== 0) throw new Error(`Git fixture failed: ${args[0]}: ${result.stderr}`);
  return result.stdout.trim();
}

function fixture(files: Record<string, string> = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'unpause-integrity-'));
  temporaryRepositories.push(repo);
  git(repo, 'init', '--initial-branch=main');
  git(repo, 'config', 'user.name', 'Fixture author');
  git(repo, 'config', 'user.email', 'fixture@example.invalid');
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), content);
  };
  const commit = (message = 'fixture change') => {
    git(repo, 'add', '--all');
    git(repo, 'commit', '--allow-empty', '-m', message);
    return git(repo, 'rev-parse', 'HEAD');
  };
  write('AGENTS.md', 'Repository owner: @owner\n');
  write('docs/product-decisions.md', approvedDecision);
  write('README.md', 'Fixture repository\n');
  for (const [path, content] of Object.entries(files)) write(path, content);
  const base = commit('trusted baseline');
  git(repo, 'switch', '-c', 'feature');
  const inspect = () => inspectRepository({ repo, base, head: git(repo, 'rev-parse', 'HEAD') });
  return { repo, base, write, commit, inspect };
}

function codes(result: ReturnType<typeof inspectRepository>) {
  return result.violations.map((violation) => violation.code);
}

afterEach(() => {
  for (const repo of temporaryRepositories.splice(0)) rmSync(repo, { recursive: true, force: true });
});

describe('owner-approved M0 integrity contracts', () => {
  it('allows a clean baseline without inventing violations', () => {
    const f = fixture();
    expect(f.inspect()).toEqual({ ok: true, violations: [], revisions: [], commitsChecked: 0 });
  });

  it('allows a new unchanged contract followed by production implementation', () => {
    const f = fixture();
    f.write('tests/contracts/new.test.ts', original);
    f.commit('test: RED');
    f.write('src/feature.ts', 'export const value = 2;');
    f.commit('feat: GREEN');
    const result = f.inspect();
    expect(result.ok).toBe(true);
    expect(result.commitsChecked).toBe(2);
    expect(result.violations).toEqual([]);
  });

  it.each(['tests/contracts/existing.test.ts', 'tests/contracts/fixtures/result.json', 'tests/support/helpers.ts', 'tests/helpers/answers.ts', 'tests/fixtures/data.json', 'tests/setup.ts'])('freezes existing contract/support bytes: %s', (path) => {
    const f = fixture({ [path]: original });
    f.write(path, changed);
    const commit = f.commit();
    const result = f.inspect();
    expect(result.ok).toBe(false);
    expect(result.violations).toContainEqual(expect.objectContaining({ code: 'FROZEN_CHANGE', path, commit }));
  });

  it.each(['modify', 'delete', 'rename', 'type-change'])('rejects frozen %s', (action) => {
    const path = 'tests/contracts/existing.test.ts';
    const f = fixture({ [path]: original });
    if (action === 'modify') f.write(path, changed);
    if (action === 'delete') rmSync(join(f.repo, path));
    if (action === 'rename') git(f.repo, 'mv', path, 'tests/contracts/renamed.test.ts');
    if (action === 'type-change') {
      rmSync(join(f.repo, path));
      symlinkSync('../../README.md', join(f.repo, path));
    }
    f.commit();
    expect(codes(f.inspect())).toContain('FROZEN_CHANGE');
  });

  it('protects a contract from its first feature-branch commit', () => {
    const f = fixture();
    const path = 'tests/contracts/branch.test.ts';
    f.write(path, original);
    f.commit('test: RED');
    f.write(path, changed);
    const tamper = f.commit('change expected outcome');
    expect(f.inspect().violations).toContainEqual(expect.objectContaining({ code: 'FROZEN_CHANGE', path, commit: tamper }));
  });

  it('rejects modification followed by restoration even when the final diff is clean', () => {
    const f = fixture({ 'tests/contracts/existing.test.ts': original });
    f.write('tests/contracts/existing.test.ts', changed);
    const tamper = f.commit();
    f.write('tests/contracts/existing.test.ts', original);
    f.commit('restore original bytes');
    expect(git(f.repo, 'diff', f.base, 'HEAD')).toBe('');
    expect(f.inspect().violations).toContainEqual(expect.objectContaining({ code: 'FROZEN_CHANGE', commit: tamper }));
  });

  it('rejects deletion and re-addition of a branch-created contract', () => {
    const f = fixture();
    const path = 'tests/contracts/branch.test.ts';
    f.write(path, original);
    f.commit();
    rmSync(join(f.repo, path));
    const deletion = f.commit();
    f.write(path, original);
    f.commit();
    expect(f.inspect().violations).toContainEqual(expect.objectContaining({ code: 'FROZEN_CHANGE', commit: deletion }));
  });

  it('allows an unchanged contract imported by a normal merge', () => {
    const f = fixture();
    git(f.repo, 'switch', '-c', 'side');
    f.write('tests/contracts/side.test.ts', original);
    f.commit();
    git(f.repo, 'switch', 'feature');
    f.write('src/feature.ts', 'export const feature = 1;');
    f.commit();
    git(f.repo, 'merge', '--no-ff', 'side', '-m', 'merge side');
    expect(f.inspect().ok).toBe(true);
  });

  it('inspects non-first-parent tampering even when a merge restores the contract', () => {
    const f = fixture({ 'tests/contracts/existing.test.ts': original });
    git(f.repo, 'switch', '-c', 'side');
    f.write('tests/contracts/existing.test.ts', changed);
    const tamper = f.commit();
    f.write('tests/contracts/existing.test.ts', original);
    f.commit();
    git(f.repo, 'switch', 'feature');
    f.write('src/feature.ts', 'export const feature = 1;');
    f.commit();
    git(f.repo, 'merge', '--no-ff', 'side', '-m', 'merge side');
    expect(f.inspect().violations).toContainEqual(expect.objectContaining({ code: 'FROZEN_CHANGE', commit: tamper }));
  });

  it('fails closed when a ref is missing or is an option injection', () => {
    const f = fixture();
    for (const base of ['missing-ref', '--upload-pack=touch unsafe']) {
      expect(codes(inspectRepository({ repo: f.repo, base, head: 'HEAD' }))).toContain('HISTORY_UNAVAILABLE');
    }
  });

  it('fails closed for shallow Git history', () => {
    const f = fixture();
    const clone = mkdtempSync(join(tmpdir(), 'unpause-shallow-'));
    temporaryRepositories.push(clone);
    git(clone, 'clone', '--depth=1', `file://${f.repo}`, '.');
    expect(codes(inspectRepository({ repo: clone, base: 'HEAD', head: 'HEAD' }))).toContain('HISTORY_UNAVAILABLE');
  });

  it.each([
    "test.skip('hidden', () => {});", "it.only('focused', () => {});",
    "xit('hidden', () => {});", "xdescribe('hidden', () => {});",
    "test.fixme(true, 'hidden');", "it.todo('missing');",
    "test['skip']('hidden', () => {});", "test[`only`]('hidden', () => {});",
    "describe.skipIf(true)('hidden', () => {});", "test.runIf(false)('hidden', () => {});",
    "const { skip: hide } = test; hide('hidden', () => {});"
  ])('rejects executable skip/focus forms: %s', (source) => {
    const f = fixture();
    f.write('tests/ui/disabled.test.ts', source);
    f.commit();
    expect(codes(f.inspect())).toContain('TEST_BYPASS');
  });

  it('does not confuse comments or tamper-fixture strings with executable test bypasses', () => {
    const f = fixture();
    f.write('tests/contracts/fixture.test.ts', "// it.only('comment')\nconst source = \"test.skip('fixture')\";\n/* xit('comment') */\n");
    f.commit();
    expect(f.inspect().ok).toBe(true);
  });

  it.each(['vitest.config.ts', 'playwright.config.ts', 'tsconfig.extra.json', 'eslint.config.js', 'package.json', 'package-lock.json', '.npmrc', 'scripts/check-test-integrity.ts', '.github/workflows/ci.yml', 'AGENTS.md', 'docs/product-decisions.md'])('requires owner review for enforcement/governance changes: %s', (path) => {
    const f = fixture();
    f.write(path, 'changed configuration');
    f.commit('Test-Change-Approved: PR #1');
    expect(codes(f.inspect())).toContain('GOVERNANCE_CHANGE');
  });

  it('accepts a dedicated Tier 2 revision bound to an already owner-approved decision', () => {
    const path = 'tests/ui/control.test.ts';
    const f = fixture({ [path]: original });
    f.write(path, original.replace('contract', 'approved layout'));
    const commit = f.commit('test(ui): follow approved layout\n\nDecision: D-20');
    const result = f.inspect();
    expect(result.ok).toBe(true);
    expect(result.revisions).toEqual([{ path, commit, decision: 'D-20' }]);
  });

  it.each(['no trailer', 'mention Decision: D-20 in prose', 'update\n\nDecision: D-99'])('rejects a missing or unapproved Tier 2 decision: %s', (message) => {
    const f = fixture({ 'tests/ui/control.test.ts': original });
    f.write('tests/ui/control.test.ts', changed);
    f.commit(message);
    expect(codes(f.inspect())).toContain('TIER2_APPROVAL');
  });

  it.each([
    approvedDecision.replace('APPROVED', 'PROPOSED'),
    approvedDecision.replace('@owner', '@agent'),
    approvedDecision.replace('**Approval reference:** https://github.com/owner/repository/pull/20#issuecomment-123', '')
  ])('rejects Tier 2 provenance without trusted owner evidence', (decision) => {
    const f = fixture({ 'tests/ui/control.test.ts': original, 'docs/product-decisions.md': decision });
    f.write('tests/ui/control.test.ts', changed);
    f.commit('layout\n\nDecision: D-20');
    expect(codes(f.inspect())).toContain('TIER2_APPROVAL');
  });

  it('does not trust a decision promoted on the PR itself', () => {
    const f = fixture({ 'tests/ui/control.test.ts': original, 'docs/product-decisions.md': approvedDecision.replace('APPROVED', 'PROPOSED') });
    f.write('docs/product-decisions.md', approvedDecision);
    f.commit('agent approves its proposal');
    f.write('tests/ui/control.test.ts', changed);
    f.commit('layout\n\nDecision: D-20');
    expect(codes(f.inspect())).toContain('TIER2_APPROVAL');
  });

  it('rejects a Tier 2 revision mixed with production changes', () => {
    const f = fixture({ 'tests/ui/control.test.ts': original });
    f.write('tests/ui/control.test.ts', changed);
    f.write('src/feature.ts', 'export const value = 1;');
    f.commit('mixed change\n\nDecision: D-20');
    expect(codes(f.inspect())).toContain('TIER2_COMMIT_SCOPE');
  });

  it('rejects Tier 2 deletion even with a decision trailer', () => {
    const f = fixture({ 'tests/e2e/journey.spec.ts': original });
    rmSync(join(f.repo, 'tests/e2e/journey.spec.ts'));
    f.commit('delete test\n\nDecision: D-20');
    expect(codes(f.inspect())).toContain('TEST_DELETION');
  });

  it('rejects changing the same Tier 2 file later on its introduction branch without approval', () => {
    const f = fixture();
    f.write('tests/ui/new.test.ts', original);
    f.commit();
    f.write('tests/ui/new.test.ts', changed);
    f.commit();
    expect(codes(f.inspect())).toContain('TIER2_APPROVAL');
  });

  it('reads Git objects without executing hostile PR code, hooks, or diff helpers', () => {
    const f = fixture({ 'tests/contracts/existing.test.ts': original });
    const marker = join(f.repo, 'PAYLOAD_EXECUTED');
    f.write('scripts/check-test-integrity.ts', `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'unsafe');`);
    f.write('package.json', JSON.stringify({ scripts: { preinstall: `touch '${marker}'` } }));
    f.write('tests/contracts/existing.test.ts', changed);
    f.write('.gitattributes', '*.ts diff=hostile');
    f.commit();
    git(f.repo, 'config', 'diff.hostile.command', `touch '${marker}'`);
    git(f.repo, 'config', 'core.hooksPath', join(f.repo, 'hooks'));
    f.write('hooks/post-checkout', `#!/bin/sh\ntouch '${marker}'\n`);
    const result = f.inspect();
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('FROZEN_CHANGE');
    expect(existsSync(marker)).toBe(false);
    expect(readFileSync(join(f.repo, 'tests/contracts/existing.test.ts'), 'utf8')).toBe(changed);
  });

  it('handles adversarial filenames as data and leaves the worktree untouched', () => {
    const path = 'tests/contracts/a\n$(touch PAYLOAD_EXECUTED).test.ts';
    const f = fixture({ [path]: original });
    f.write(path, changed);
    f.commit();
    const before = git(f.repo, 'status', '--porcelain');
    expect(f.inspect().violations).toContainEqual(expect.objectContaining({ code: 'FROZEN_CHANGE', path }));
    expect(existsSync(join(f.repo, 'PAYLOAD_EXECUTED'))).toBe(false);
    expect(git(f.repo, 'status', '--porcelain')).toBe(before);
  });

  it('rejects arbitrary later contract bytes for seeded examples', () => {
    fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 30 }), (suffix) => {
      const f = fixture({ 'tests/contracts/property.test.ts': original });
      f.write('tests/contracts/property.test.ts', original + suffix);
      f.commit();
      expect(codes(f.inspect())).toContain('FROZEN_CHANGE');
    }), { seed: 20261112, numRuns: 8 });
  });
});
