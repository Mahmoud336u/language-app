// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { IntegrityResult } from '../../scripts/check-test-integrity';
import { evaluateApproval } from '../../scripts/integrity-approval';
import { verifyFrozenRecovery } from '../../scripts/frozen-test-recovery';
import type { ReadGit } from '../../scripts/frozen-test-recovery';

const base = 'a'.repeat(40), head = 'b'.repeat(40), parent = 'c'.repeat(40);
const merge = 'd'.repeat(40), recordBlob = 'e'.repeat(40);
const correction = 'cc973a5e446e08e2c72a0944f270c24bd8b3773f';
const before = '6ef64c1f535b0360cf6edb5a6fcd621c245f3f7c';
const after = 'cbc38e844126fc816515478e079b2e94f861bd83';
const file = 'tests/contracts/session-state.test.ts';
const registry = 'scripts/frozen-test-exceptions.json';
const repository = 'Mahmoud336u/language-app';
const entry = { id: 'pr-13-mechanical-fixture-access', repository, pullRequest: 13,
  path: file, correctionCommit: correction, beforeBlob: before, afterBlob: after,
  fileMode: '100644', reason: 'Reviewed exact mechanical fixture-access correction.' };

function fixture() {
  const options = { repo: '/unused-mocked-repository', repository, pullRequest: 13,
    owner: 'Mahmoud336u', base, head };
  const inspection: IntegrityResult = { ok: false, commitsChecked: 4, revisions: [], violations: [
    { code: 'FROZEN_CHANGE', path: file, commit: correction, message: 'Correction' },
    { code: 'FROZEN_CHANGE', path: file, commit: merge, message: 'Inherited' },
    { code: 'GOVERNANCE_CHANGE', path: 'package.json', commit: head, message: 'Protected' }
  ] };
  const state = { text: JSON.stringify({ version: 1, exceptions: [entry] }), present: true,
    registryMode: '100644', shallow: false,
    ancestors: [head, merge, correction, parent, base], firstParents: [correction, parent, base] };
  const trees = new Map([ [head, after], [merge, after], [correction, after], [parent, before] ]);
  const parents = new Map([ [correction, [parent]], [merge, [correction, base]] ]);
  const git = vi.fn<ReadGit>((...args) => {
    if (args[0] === 'rev-parse') return state.shallow ? 'true\n' : 'false\n';
    if (args[0] === 'ls-tree') {
      const ref = args[3], path = args[5];
      if (path === registry) {
        if (ref !== base) throw new Error('Authorization must come from trusted base');
        return state.present ? `${state.registryMode} blob ${recordBlob}\t${registry}\0` : '';
      }
      const blob = ref ? trees.get(ref) : undefined;
      return blob ? `100644 blob ${blob}\t${file}\0` : '';
    }
    if (args[0] === 'cat-file') return args[1] === '-s'
      ? String(Buffer.byteLength(state.text)) : state.text;
    if (args[0] === 'rev-list') {
      if (args.includes('--parents')) {
        const ref = args.at(-1) ?? '';
        return [ref, ...(parents.get(ref) ?? [])].join(' ');
      }
      return (args.includes('--first-parent') ? state.firstParents : state.ancestors).join('\n');
    }
    throw new Error(`Unexpected Git operation: ${args[0]}`);
  });
  const comments: unknown[] = [];
  const pr = { number: 13, state: 'open', head: { sha: head }, base: { sha: base, repo: { full_name: repository } } };
  const read = vi.fn(async (path: string): Promise<unknown> => path.includes('/comments?') ? comments : pr);
  const run = () => verifyFrozenRecovery(options, inspection, read, git);
  return { options, inspection, state, trees, parents, git, comments, pr, read, run };
}
function approval(fingerprint: string, id = 1) {
  return { id, user: { login: 'Mahmoud336u', type: 'User' },
    body: `/integrity-approve-correction ${fingerprint}\nReason: Reviewed all findings.`,
    created_at: '2026-11-15T00:00:00Z', updated_at: '2026-11-15T00:00:00Z',
    html_url: `https://github.com/${repository}/pull/13#issuecomment-${id}` };
}

describe('PR #13 exact correction recovery', () => {
  it('requires a fresh acknowledgment, then preserves raw findings and evidence', async () => {
    const f = fixture(), original = structuredClone(f.inspection);
    const pending = await f.run();
    expect(pending.status).toBe('correction-approval-required');
    f.comments.push(approval(pending.fingerprint));
    const accepted = await f.run();
    expect(accepted).toMatchObject({ ok: true, status: 'owner-approved-correction',
      authorization: { path: registry, blob: recordBlob, entry },
      approval: { id: 1, reason: 'Reviewed all findings.' } });
    expect(accepted.evidence?.map(value => value.commit).sort()).toEqual([correction, merge].sort());
    expect(f.inspection).toEqual(original);
    expect(evaluateApproval(f.options, f.inspection, f.comments).status).toBe('blocked');
  });

  it('does not use a candidate-only record or ask GitHub when authorization is absent', async () => {
    const f = fixture(); f.state.present = false;
    expect((await f.run()).status).toBe('blocked'); expect(f.read).not.toHaveBeenCalled();
  });

  it.each(['{', '{}', JSON.stringify({ version: 2, exceptions: [entry] }),
    JSON.stringify({ version: 1, exceptions: [entry, entry] }),
    JSON.stringify({ version: 1, exceptions: [{ ...entry, extra: true }] }),
    JSON.stringify({ version: 1, exceptions: [entry], extra: true }),
    JSON.stringify({ version: 1, exceptions: [{ ...entry, reason: ' ' }] }), ' '.repeat(65537)
  ])('rejects invalid authorization data %#', async text => {
    const f = fixture(); f.state.text = text;
    expect((await f.run()).ok).toBe(false); expect(f.read).not.toHaveBeenCalled();
  });

  it.each(['id', 'repository', 'pullRequest', 'path', 'correctionCommit', 'beforeBlob', 'afterBlob', 'fileMode'])('rejects changed authorization identity %s', async key => {
    const f = fixture(); f.state.text = JSON.stringify({ version: 1, exceptions: [{ ...entry, [key]: 'wrong' }] });
    expect((await f.run()).status).toBe('blocked');
  });

  it.each([{ repository: 'other/repository' }, { pullRequest: 14 }, { owner: 'another-owner' }])('rejects a different recovery context %j', async change => {
    const f = fixture(); Object.assign(f.options, change);
    expect((await f.run()).status).toBe('blocked'); expect(f.read).not.toHaveBeenCalled();
  });

  it.each([head, parent, correction, merge])('rejects unexpected file content at %s', async ref => {
    const f = fixture(); f.trees.set(ref, 'f'.repeat(40));
    expect((await f.run()).status).toBe('blocked');
  });

  it('rejects a non-regular authorization file', async () => {
    const f = fixture(); f.state.registryMode = '120000';
    expect((await f.run()).status).toBe('blocked');
  });

  it('rejects a correction with multiple parents', async () => {
    const f = fixture(); f.parents.set(correction, [parent, base]);
    expect((await f.run()).status).toBe('blocked');
  });

  it('rejects inherited findings without correction in first-parent ancestry', async () => {
    const f = fixture(); f.state.firstParents = [parent, base];
    expect((await f.run()).status).toBe('blocked');
  });

  it('rejects unreachable correction history and shallow repositories', async () => {
    const f = fixture(); f.state.ancestors = [head, merge];
    expect((await f.run()).status).toBe('blocked');
    const g = fixture(); g.state.shallow = true;
    expect((await g.run()).status).toBe('blocked');
  });

  it.each(['TEST_DELETION', 'TEST_BYPASS', 'TIER2_APPROVAL', 'HISTORY_UNAVAILABLE', 'UNKNOWN_CODE'])('cannot waive %s', async code => {
    const f = fixture(); f.inspection.violations.push({ code, path: file, commit: head, message: 'Unapproved' });
    expect((await f.run()).status).toBe('blocked'); expect(f.read).not.toHaveBeenCalled();
  });

  it('rejects extra frozen edits, including reverted edits with an approved final blob', async () => {
    const f = fixture(); f.parents.set(head, [merge]);
    f.inspection.violations.push({ code: 'FROZEN_CHANGE', path: file, commit: head, message: 'Reverted edit' });
    expect((await f.run()).status).toBe('blocked');
    f.inspection.violations.pop();
    f.inspection.violations.push({ code: 'FROZEN_CHANGE', path: 'tests/contracts/other.test.ts', commit: head, message: 'Another file' });
    expect((await f.run()).status).toBe('blocked');
  });

  it.each(['wrong-author', 'bot', 'edited', 'stale', 'wrong-command', 'wrong-url', 'empty-reason', 'revoked'])('rejects %s acknowledgment', async kind => {
    const f = fixture(), pending = await f.run(), comment = approval(pending.fingerprint);
    if (kind === 'wrong-author') comment.user.login = 'another-owner';
    if (kind === 'bot') comment.user.type = 'Bot';
    if (kind === 'edited') comment.updated_at = '2026-11-15T00:01:00Z';
    if (kind === 'stale') comment.body = approval('f'.repeat(64)).body;
    if (kind === 'wrong-command') comment.body = comment.body.replace('-correction', '');
    if (kind === 'wrong-url') comment.html_url = 'https://github.com/other/repository/pull/13#issuecomment-1';
    if (kind === 'empty-reason') comment.body = `/integrity-approve-correction ${pending.fingerprint}\nReason: `;
    f.comments.push(comment);
    if (kind === 'revoked') f.comments.push({ ...approval(pending.fingerprint, 2), body: `/integrity-revoke ${pending.fingerprint}` });
    expect((await f.run()).status).toBe('correction-approval-required');
  });

  it('binds authorization metadata and the entire finding set into the fingerprint', async () => {
    const f = fixture(), original = await f.run();
    f.comments.push(approval(original.fingerprint));
    f.state.text = JSON.stringify({ version: 1, exceptions: [{ ...entry, reason: 'New reviewed rationale.' }] });
    const changed = await f.run();
    expect(changed.fingerprint).not.toBe(original.fingerprint); expect(changed.ok).toBe(false);
    f.inspection.violations.push({ code: 'GOVERNANCE_CHANGE', path: 'AGENTS.md', commit: head, message: 'Another protected change' });
    expect((await f.run()).fingerprint).not.toBe(changed.fingerprint);
  });

  it.each(['closed', 'head', 'base', 'repository'])('rejects changed PR %s during evidence retrieval', async field => {
    const f = fixture();
    f.read.mockImplementation(async path => {
      if (path.includes('/comments?')) {
        if (field === 'closed') f.pr.state = 'closed';
        if (field === 'head') f.pr.head.sha = 'f'.repeat(40);
        if (field === 'base') f.pr.base.sha = 'f'.repeat(40);
        if (field === 'repository') f.pr.base.repo.full_name = 'other/repository';
        return [];
      }
      return f.pr;
    });
    await expect(f.run()).rejects.toThrow();
  });

  it('rejects unavailable Git and unavailable GitHub evidence', async () => {
    const f = fixture(); f.git.mockImplementation(() => { throw new Error('Missing object'); });
    expect((await f.run()).status).toBe('blocked');
    const g = fixture(); g.read.mockRejectedValue(new Error('API unavailable'));
    await expect(g.run()).rejects.toThrow();
  });

  it('reads bounded comment pages and accepts acknowledgment on a later page', async () => {
    const f = fixture(), pending = await f.run();
    f.read.mockImplementation(async path => path.includes('/comments?')
      ? path.endsWith('page=1') ? Array.from({ length: 100 }, () => ({})) : [approval(pending.fingerprint)] : f.pr);
    expect((await f.run()).ok).toBe(true);
    f.read.mockImplementation(async path => path.includes('/comments?') ? Array.from({ length: 100 }, () => ({})) : f.pr);
    await expect(f.run()).rejects.toThrow();
  });
});
