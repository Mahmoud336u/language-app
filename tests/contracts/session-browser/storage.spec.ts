import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { oneAnswer, savedSession } from '../session-fixtures';

const path = '/tests/contracts/session-browser/harness.html';
async function connected(page: Page) {
  await page.goto(path);
  await page.waitForFunction(() => window.sessionHarness !== undefined);
  expect(await page.evaluate(() => window.sessionHarness.ready)).toEqual({ ok: true });
}
test.beforeEach(async ({ page }) => { await connected(page); });

test('commits minimal records and resumes after reload with actual correct/incorrect counts', async ({ page }) => {
  expect((await page.evaluate(() => window.sessionHarness.create())).ok).toBe(true);
  expect((await page.evaluate(() => window.sessionHarness.submit())).ok).toBe(true);
  expect((await page.evaluate(() => window.sessionHarness.submit(2, 'wrong'))).ok).toBe(true);
  const raw = await page.evaluate(() => window.sessionHarness.rawRead('session-1'));
  expect(Object.keys(raw as object).sort()).toEqual(['attempts', 'discardedAt', 'snapshot']);
  await page.reload(); await page.waitForFunction(() => window.sessionHarness !== undefined);
  expect(await page.evaluate(() => window.sessionHarness.ready)).toEqual({ ok: true });
  const result = await page.evaluate(() => window.sessionHarness.load());
  expect(result).toMatchObject({ ok: true, value: { view: { status: 'active', currentOccurrenceId: 'item-3', progress: { total: 3, answered: 2, correct: 1, incorrect: 1, accuracy: 0.5 } } } });
  if (!result.ok) throw new Error('Expected persisted session');
  expect(result.value.record).toEqual(raw);
});

test('creates without overwriting a collision and keeps multiple sessions', async ({ page }) => {
  await page.evaluate(() => window.sessionHarness.create()); await page.evaluate(() => window.sessionHarness.submit());
  expect(await page.evaluate(() => window.sessionHarness.create())).toEqual({ ok: false, error: 'conflict' });
  expect((await page.evaluate(() => window.sessionHarness.create(2, 'another'))).ok).toBe(true);
  const result = await page.evaluate(() => window.sessionHarness.list());
  expect(result.ok).toBe(true); if (!result.ok) throw new Error('Expected listing');
  expect(result.value.sessions).toHaveLength(2);
  expect(await page.evaluate(() => window.sessionHarness.load())).toMatchObject({ ok: true, value: { view: { progress: { answered: 1 } } } });
});

test('serializes conflicting tabs and makes exact committed retries idempotent', async ({ page, context }) => {
  await page.evaluate(() => window.sessionHarness.create());
  const other = await context.newPage(); await connected(other);
  const results = await Promise.all([
    page.evaluate(() => window.sessionHarness.submit(1, 'Haus', 'tab-a')),
    other.evaluate(() => window.sessionHarness.submit(1, 'wrong', 'tab-b'))
  ]);
  expect(results.filter(result => result.ok)).toHaveLength(1);
  expect(results.filter(result => !result.ok)).toEqual([{ ok: false, error: 'conflict' }]);
  const winner = results[0]?.ok ? { id: 'tab-a', answer: 'Haus' } : { id: 'tab-b', answer: 'wrong' };
  const retry = await other.evaluate(({ id, answer }) => window.sessionHarness.submit(1, answer, id), winner);
  expect(retry).toMatchObject({ ok: true, value: { changed: false, view: { progress: { answered: 1 } } } });
  expect(await other.evaluate(id => window.sessionHarness.submit(1, 'changed', id), winner.id)).toEqual({ ok: false, error: 'conflict' });
  await other.close();
});

test('two tabs retrying the same ID save one outcome', async ({ page, context }) => {
  await page.evaluate(() => window.sessionHarness.create()); const other = await context.newPage(); await connected(other);
  const results = await Promise.all([page.evaluate(() => window.sessionHarness.submit()), other.evaluate(() => window.sessionHarness.submit())]);
  expect(results.every(result => result.ok)).toBe(true);
  expect(results.filter(result => result.ok && result.value.changed)).toHaveLength(1);
  expect(await page.evaluate(() => window.sessionHarness.load())).toMatchObject({ ok: true, value: { view: { progress: { answered: 1 } } } });
});

test('stale discard retains another tab’s newly committed attempt and retries remain valid', async ({ page, context }) => {
  await page.evaluate(() => window.sessionHarness.create()); const other = await context.newPage(); await connected(other);
  await other.evaluate(() => window.sessionHarness.load()); await page.evaluate(() => window.sessionHarness.submit());
  expect(await other.evaluate(() => window.sessionHarness.discard())).toMatchObject({ ok: true, value: { view: { status: 'discarded', progress: { answered: 1 } } } });
  expect(await page.evaluate(() => window.sessionHarness.submit())).toMatchObject({ ok: true, value: { changed: false, view: { status: 'discarded' } } });
  expect(await page.evaluate(() => window.sessionHarness.submit(2))).toEqual({ ok: false, error: 'invalid-state' });
});

test('aborts after put success without acknowledging a saved answer or changing stored state', async ({ page }) => {
  await page.evaluate(() => window.sessionHarness.create());
  const before = await page.evaluate(() => window.sessionHarness.rawRead('session-1'));
  await page.evaluate(() => window.sessionHarness.armWriteFailure('abort'));
  expect(await page.evaluate(() => window.sessionHarness.submit())).toEqual({ ok: false, error: 'transaction-aborted' });
  expect(await page.evaluate(() => window.sessionHarness.didPutSucceed())).toBe(true);
  expect(await page.evaluate(() => window.sessionHarness.rawRead('session-1'))).toEqual(before);
  expect(await page.evaluate(() => window.sessionHarness.submit())).toMatchObject({ ok: true, value: { view: { progress: { answered: 1 } } } });
});

test('aborted creation is not falsely acknowledged and can be retried', async ({ page }) => {
  await page.evaluate(() => window.sessionHarness.armWriteFailure('abort'));
  expect(await page.evaluate(() => window.sessionHarness.create())).toEqual({ ok: false, error: 'transaction-aborted' });
  expect(await page.evaluate(() => window.sessionHarness.load())).toEqual({ ok: false, error: 'not-found' });
  expect((await page.evaluate(() => window.sessionHarness.create())).ok).toBe(true);
});

for (const [mode, error] of [['quota', 'quota-exceeded'], ['denied', 'storage-denied']] as const) {
  test(`preserves state on controlled ${mode} write failure`, async ({ page }) => {
    await page.evaluate(() => window.sessionHarness.create());
    await page.evaluate(value => window.sessionHarness.armWriteFailure(value), mode);
    expect(await page.evaluate(() => window.sessionHarness.submit())).toEqual({ ok: false, error });
    expect(await page.evaluate(() => window.sessionHarness.rawRead('session-1'))).toEqual(savedSession());
  });
}

test('reports corrupt and future records separately while preserving healthy sessions', async ({ page }) => {
  await page.evaluate(() => window.sessionHarness.create());
  const broken = { snapshot: { sessionId: 'broken', schemaVersion: 1 }, attempts: 'invalid' };
  const future = { snapshot: { sessionId: 'future', schemaVersion: 2 } };
  await page.evaluate(value => window.sessionHarness.rawPut(value), broken);
  await page.evaluate(value => window.sessionHarness.rawPut(value), future);
  expect(await page.evaluate(() => window.sessionHarness.load('broken'))).toEqual({ ok: false, error: 'corrupt-data' });
  expect(await page.evaluate(() => window.sessionHarness.load('future'))).toEqual({ ok: false, error: 'unsupported-version' });
  const result = await page.evaluate(() => window.sessionHarness.list());
  if (!result.ok) throw new Error('Expected partially readable listing');
  expect(result.value.sessions).toHaveLength(1);
  expect(result.value.unavailable).toEqual([{ key: 'broken', error: 'corrupt-data' }, { key: 'future', error: 'unsupported-version' }]);
  expect(await page.evaluate(() => window.sessionHarness.rawRead('broken'))).toEqual(broken);
  expect(await page.evaluate(() => window.sessionHarness.rawRead('future'))).toEqual(future);
});

test('loads historical results without regrading and preserves backward time', async ({ page }) => {
  const historical = oneAnswer();
  const changed = { ...historical, attempts: historical.attempts.map(attempt => ({ ...attempt, rawAnswer: 'historical text', timestamp: 50 })) };
  await page.evaluate(value => window.sessionHarness.rawPut(value), changed);
  expect(await page.evaluate(() => window.sessionHarness.load())).toMatchObject({ ok: true, value: { view: { lastActivityAt: 50, progress: { correct: 1 } } } });
  await page.evaluate(() => window.sessionHarness.setTime(0));
  expect(await page.evaluate(() => window.sessionHarness.submit(2, 'wrong'))).toMatchObject({ ok: true, value: { view: { lastActivityAt: 0 } } });
});

test('distinguishes empty storage, missing IDs, unavailable storage and a missing store', async ({ page }) => {
  expect(await page.evaluate(() => window.sessionHarness.list())).toEqual({ ok: true, value: { sessions: [], unavailable: [] } });
  expect(await page.evaluate(() => window.sessionHarness.load())).toEqual({ ok: false, error: 'not-found' });
  expect(await page.evaluate(() => window.sessionHarness.unavailable())).toEqual({ ok: false, error: 'storage-unavailable' });
  await page.evaluate(() => window.sessionHarness.replaceDatabase(1, false));
  expect(await page.evaluate(() => window.sessionHarness.connect())).toEqual({ ok: false, error: 'corrupt-data' });
});

test('rejects a newer database without deleting or recreating it', async ({ page }) => {
  await page.evaluate(() => window.sessionHarness.replaceDatabase(2, true));
  expect(await page.evaluate(() => window.sessionHarness.connect())).toEqual({ ok: false, error: 'unsupported-version' });
  const sentinel = { snapshot: { sessionId: 'sentinel' }, future: true };
  await page.evaluate(value => window.sessionHarness.rawPut(value), sentinel);
  expect(await page.evaluate(() => window.sessionHarness.connect())).toEqual({ ok: false, error: 'unsupported-version' });
  expect(await page.evaluate(() => window.sessionHarness.rawRead('sentinel'))).toEqual(sentinel);
});

test('closes on versionchange so a deletion request can complete; old connection is unusable', async ({ page }) => {
  await page.evaluate(() => window.sessionHarness.create());
  await page.evaluate(() => window.sessionHarness.removeDatabase());
  expect(await page.evaluate(() => window.sessionHarness.load())).toEqual({ ok: false, error: 'connection-closed' });
  expect(await page.evaluate(() => window.sessionHarness.connect())).toEqual({ ok: true });
  expect(await page.evaluate(() => window.sessionHarness.load())).toEqual({ ok: false, error: 'not-found' });
});
