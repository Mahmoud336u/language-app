// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import type { IntegrityResult } from '../../scripts/check-test-integrity';
import { approvalFingerprint, evaluateApproval, githubReader, verifyGitHubApproval } from '../../scripts/integrity-approval';
import type { ApprovalContext } from '../../scripts/integrity-approval';

const context: ApprovalContext = {
  repository: 'owner/repository', pullRequest: 4, owner: 'owner',
  base: 'a'.repeat(40), head: 'b'.repeat(40)
};
const finding = { code: 'GOVERNANCE_CHANGE', path: 'package.json', commit: 'c'.repeat(40), message: 'Owner review required.' };
const inspection: IntegrityResult = { ok: false, violations: [finding], revisions: [], commitsChecked: 1 };
const clean: IntegrityResult = { ok: true, violations: [], revisions: [], commitsChecked: 1 };
const expectedFingerprint = createHash('sha256').update(JSON.stringify([
  'unpause-integrity-approval-v1', context.repository, context.pullRequest, context.owner,
  context.base, context.head, [[finding.code, finding.path, finding.commit]]
])).digest('hex');
const time = '2026-11-13T12:00:00Z';
function comment(id = 1, body = `/integrity-approve ${expectedFingerprint}\nReason: Reviewed the dependency change.`) {
  return { id, body, user: { login: 'owner', type: 'User' },
    html_url: `https://github.com/owner/repository/pull/4#issuecomment-${id}`,
    created_at: time, updated_at: time };
}
function pr(base = context.base, head = context.head) {
  return { number: 4, state: 'open', base: { sha: base, repo: { full_name: context.repository } }, head: { sha: head } };
}

describe('scoped owner governance acknowledgment', () => {
  it('binds the exact repository, PR, owner, base, head, and historical findings', () => {
    expect(approvalFingerprint(context, inspection)).toBe(expectedFingerprint);
  });

  it('retains authenticated approval evidence while leaving raw findings unchanged', () => {
    const before = structuredClone(inspection);
    expect(evaluateApproval(context, inspection, [comment()])).toEqual({
      ok: true, status: 'owner-approved', fingerprint: expectedFingerprint,
      approval: { id: 1, url: comment().html_url, reason: 'Reviewed the dependency change.' }
    });
    expect(inspection).toEqual(before);
  });

  it('passes a clean inspection without an approval', () => {
    expect(evaluateApproval(context, clean, [])).toMatchObject({ ok: true, status: 'clean' });
  });

  it('reports a governance-only change as requiring approval', () => {
    expect(evaluateApproval(context, inspection, [])).toEqual({ ok: false, status: 'approval-required', fingerprint: expectedFingerprint });
  });

  it.each(['FROZEN_CHANGE', 'TEST_DELETION', 'TEST_BYPASS', 'UNSAFE_TEST_FILE', 'TIER2_APPROVAL', 'TIER2_COMMIT_SCOPE', 'HISTORY_UNAVAILABLE', 'UNKNOWN_FUTURE_CODE'])('never approves %s, even together with governance', (code) => {
    const mixed = { ...inspection, violations: [finding, { ...finding, code }] };
    const body = `/integrity-approve ${approvalFingerprint(context, mixed)}\nReason: Owner acknowledged governance.`;
    expect(evaluateApproval(context, mixed, [comment(1, body)])).toMatchObject({ ok: false, status: 'blocked' });
  });

  it.each([
    { repository: 'owner/another' }, { pullRequest: 5 }, { owner: 'another' },
    { base: 'd'.repeat(40) }, { head: 'e'.repeat(40) }
  ])('rejects replay after context changes: %j', (change) => {
    const changedContext = { ...context, ...change };
    expect(approvalFingerprint(changedContext, inspection)).not.toBe(expectedFingerprint);
    expect(evaluateApproval(changedContext, inspection, [comment()]).ok).toBe(false);
  });

  it.each([{ path: 'package-lock.json' }, { commit: 'd'.repeat(40) }, { code: 'FROZEN_CHANGE' }])('binds each finding field: %j', (change) => {
    const changed = { ...inspection, violations: [{ ...finding, ...change }] };
    expect(approvalFingerprint(context, changed)).not.toBe(expectedFingerprint);
    expect(evaluateApproval(context, changed, [comment()]).ok).toBe(false);
  });

  it('sorts findings deterministically without mutating the supplied result', () => {
    const second = { ...finding, path: 'AGENTS.md' };
    const forward = { ...inspection, violations: [finding, second] };
    const reverse = { ...inspection, violations: [second, finding] };
    expect(approvalFingerprint(context, forward)).toBe(approvalFingerprint(context, reverse));
    expect(forward.violations).toEqual([finding, second]);
    expect(approvalFingerprint(context, forward)).not.toBe(expectedFingerprint);
  });

  it.each([
    { user: { login: 'contributor', type: 'User' } },
    { user: { login: 'owner', type: 'Bot' } },
    { updated_at: '2026-11-13T12:01:00Z' },
    { html_url: 'https://attacker.invalid/approval' },
    { id: -1 }, { body: `/integrity-approve ${expectedFingerprint}` },
    { body: `/integrity-approve ${expectedFingerprint}\nReason:   ` },
    { body: `> /integrity-approve ${expectedFingerprint}\nReason: Quoted approval.` },
    { body: `Test-Change-Approved: PR #4\nReason: A trailer is not approval.` },
    { body: `/integrity-approve ${'0'.repeat(64)}\nReason: Different changes.` },
    { body: `/integrity-approve ${expectedFingerprint}\nReason: Approved.\nUnexpected extra command` }
  ])('rejects unauthenticated or malformed evidence: %j', (change) => {
    expect(evaluateApproval(context, inspection, [{ ...comment(), ...change }]).ok).toBe(false);
  });

  it('matches GitHub login casing without trusting author association', () => {
    expect(evaluateApproval(context, inspection, [{ ...comment(), user: { login: 'OWNER', type: 'User' } }]).ok).toBe(true);
    expect(evaluateApproval(context, inspection, [{ ...comment(), user: { login: 'agent', type: 'User' }, author_association: 'OWNER' }]).ok).toBe(false);
  });

  it('uses the latest owner integrity command independent of response order', () => {
    const revoke = comment(2, `/integrity-revoke ${expectedFingerprint}`);
    expect(evaluateApproval(context, inspection, [revoke, comment()]).ok).toBe(false);
    expect(evaluateApproval(context, inspection, [revoke, comment(3)]).ok).toBe(true);
  });

  it('does not fall back to an older approval after a malformed or edited command', () => {
    expect(evaluateApproval(context, inspection, [comment(), comment(2, '/integrity-approve invalid')]).ok).toBe(false);
    expect(evaluateApproval(context, inspection, [comment(), { ...comment(2), updated_at: '2026-11-13T12:01:00Z' }]).ok).toBe(false);
  });

  it('ignores unrelated discussion and non-owner attempts to revoke', () => {
    expect(evaluateApproval(context, inspection, [comment(), comment(2, 'Thanks for reviewing.'),
      { ...comment(3, `/integrity-revoke ${expectedFingerprint}`), user: { login: 'agent', type: 'User' } }, null]).ok).toBe(true);
  });

  it('rejects inconsistent raw results', () => {
    expect(evaluateApproval(context, { ...inspection, ok: true }, [comment()]).ok).toBe(false);
    expect(evaluateApproval(context, { ...clean, ok: false }, [comment()]).ok).toBe(false);
  });
});

describe('live GitHub evidence is bounded and fails closed', () => {
  it('checks current PR identity before and after reading comments', async () => {
    const read = vi.fn().mockResolvedValueOnce(pr()).mockResolvedValueOnce([comment()]).mockResolvedValueOnce(pr());
    expect((await verifyGitHubApproval(context, inspection, read)).status).toBe('owner-approved');
    expect(read.mock.calls).toEqual([
      ['/repos/owner/repository/pulls/4'], ['/repos/owner/repository/issues/4/comments?per_page=100&page=1'],
      ['/repos/owner/repository/pulls/4']
    ]);
  });

  it('reads later pages and honors a later revocation', async () => {
    const page = Array.from({ length: 100 }, (_, i) => comment(i + 1, i === 0 ? comment().body : 'Discussion'));
    const read = vi.fn().mockResolvedValueOnce(pr()).mockResolvedValueOnce(page)
      .mockResolvedValueOnce([comment(101, `/integrity-revoke ${expectedFingerprint}`)]).mockResolvedValueOnce(pr());
    expect((await verifyGitHubApproval(context, inspection, read)).ok).toBe(false);
    expect(read).toHaveBeenCalledWith('/repos/owner/repository/issues/4/comments?per_page=100&page=2');
  });

  it.each([pr('d'.repeat(40)), pr(context.base, 'e'.repeat(40)), { ...pr(), state: 'closed' },
    { ...pr(), number: 5 }, { ...pr(), base: { sha: context.base, repo: { full_name: 'other/repo' } } }, null])('blocks mismatched current PR metadata: %j', async (metadata) => {
    const read = vi.fn().mockResolvedValue(metadata);
    await expect(verifyGitHubApproval(context, inspection, read)).rejects.toThrow();
  });

  it('blocks a push between evidence reads', async () => {
    const read = vi.fn().mockResolvedValueOnce(pr()).mockResolvedValueOnce([comment()])
      .mockResolvedValueOnce(pr(context.base, 'e'.repeat(40)));
    await expect(verifyGitHubApproval(context, inspection, read)).rejects.toThrow();
  });

  it('does not query approvals when other integrity violations already block', async () => {
    const read = vi.fn();
    expect((await verifyGitHubApproval(context, { ...inspection, violations: [{ ...finding, code: 'FROZEN_CHANGE' }] }, read)).status).toBe('blocked');
    expect(read).not.toHaveBeenCalled();
  });

  it('revalidates a clean result without querying comments', async () => {
    const read = vi.fn().mockResolvedValue(pr());
    expect((await verifyGitHubApproval(context, clean, read)).status).toBe('clean');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('rejects API errors or malformed comment pages', async () => {
    await expect(verifyGitHubApproval(context, inspection, vi.fn().mockRejectedValue(new Error('Unavailable')))).rejects.toThrow();
    const malformed = vi.fn().mockResolvedValueOnce(pr()).mockResolvedValueOnce({ comments: [comment()] });
    await expect(verifyGitHubApproval(context, inspection, malformed)).rejects.toThrow();
  });

  it('fails rather than approving a truncated comment history', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => comment(i + 1));
    const read = vi.fn(async (path: string) => path.includes('/comments?') ? fullPage : pr());
    await expect(verifyGitHubApproval(context, inspection, read)).rejects.toThrow();
    expect(read.mock.calls.length).toBeLessThanOrEqual(21);
  });

  it('uses GET and a fixed GitHub origin without following redirects', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(pr())));
    expect(await githubReader('test-token', request)('/repos/owner/repository/pulls/4')).toEqual(pr());
    expect(request).toHaveBeenCalledWith('https://api.github.com/repos/owner/repository/pulls/4', expect.objectContaining({
      method: 'GET', redirect: 'error', signal: expect.any(AbortSignal),
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
    }));
  });

  it.each(['https://attacker.invalid/token', '//attacker.invalid/token', '/repos/owner/../secrets', '/repos/owner/repository/pulls/4?redirect=elsewhere'])('rejects an unsupported API path: %s', async (path) => {
    const request = vi.fn<typeof fetch>();
    await expect(githubReader('test-token', request)(path)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects non-success, invalid JSON, and oversized responses without echoing secrets', async () => {
    for (const response of [new Response('secret server detail', { status: 403 }), new Response('not JSON'), new Response('x'.repeat(1024 * 1024 + 1))]) {
      const request = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(githubReader('test-token', request)('/repos/owner/repository/pulls/4')).rejects.not.toThrow(/secret server detail|test-token/);
    }
  });
});
