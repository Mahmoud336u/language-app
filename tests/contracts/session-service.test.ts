// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { sessionService } from '../../src/application/session-service';
import type { SessionRepository } from '../../src/application/session-repository';
import type { Result, SessionMutation, SessionRecord } from '../../src/domain/session-types';
import { oneAnswer, savedSession, sessionInput, submission, unwrap } from './session-fixtures';

function memoryRepository() {
  const records = new Map<string, SessionRecord>();
  const repository: SessionRepository = {
    create: vi.fn<SessionRepository['create']>(async record => {
      if (records.has(record.snapshot.sessionId)) return { ok: false, error: 'conflict' };
      records.set(record.snapshot.sessionId, structuredClone(record));
      return { ok: true, value: structuredClone(record) };
    }),
    load: vi.fn<SessionRepository['load']>(async id => {
      const record = records.get(id);
      return record ? { ok: true, value: structuredClone(record) } : { ok: false, error: 'not-found' };
    }),
    list: vi.fn<SessionRepository['list']>(async () => ({ ok: true, value: { sessions: [...records.values()].map(r => structuredClone(r)), unavailable: [] } })),
    update: vi.fn<SessionRepository['update']>(async (id, transition) => {
      const record = records.get(id);
      if (!record) return { ok: false, error: 'not-found' };
      const result = transition(structuredClone(record));
      if (result.ok && result.value.changed) records.set(id, structuredClone(result.value.record));
      return result;
    }), close: vi.fn<SessionRepository['close']>()
  };
  return { repository, records };
}

describe('D-05/D-10 application save acknowledgment', () => {
  it('creates independent sessions and rejects a collision without replacing saved work', async () => {
    const { repository, records } = memoryRepository(); const service = sessionService(repository, () => 100);
    expect(unwrap(await service.create(sessionInput())).record).toEqual(savedSession());
    expect((await service.create(sessionInput())).ok).toBe(false);
    expect((await service.create(sessionInput(1, 'another'))).ok).toBe(true);
    expect(records.size).toBe(2); expect(records.get('session-1')).toEqual(savedSession());
  });
  it('returns saved progress on reload without reading time', async () => {
    const { repository, records } = memoryRepository(); records.set('session-1', oneAnswer());
    const clock = vi.fn(() => Number.NaN); const service = sessionService(repository, clock);
    const result = unwrap(await service.load('session-1'));
    expect(result.record).toEqual(oneAnswer()); expect(result.view.currentOccurrenceId).toBe('item-2');
    expect(result.view.progress.answered).toBe(1); expect(clock).not.toHaveBeenCalled();
    expect(await service.load('absent')).toEqual({ ok: false, error: 'not-found' });
  });
  it('applies submissions to the aggregate read inside the atomic update, with no preliminary read', async () => {
    const { repository, records } = memoryRepository(); records.set('session-1', oneAnswer());
    const service = sessionService(repository, () => 99);
    expect(await service.submit(submission(1, 'wrong', 'different'))).toEqual({ ok: false, error: 'conflict' });
    const result = unwrap(await service.submit(submission(2, 'wrong')));
    expect(result.record.attempts).toHaveLength(2); expect(result.view.progress.incorrect).toBe(1);
    expect(repository.load).not.toHaveBeenCalled();
  });
  it('does not resolve a saved answer while the repository commit is pending', async () => {
    const { repository } = memoryRepository();
    let release: ((value: Result<SessionMutation>) => void) | undefined;
    repository.update = vi.fn<SessionRepository['update']>(() => new Promise(resolve => { release = resolve; }));
    const service = sessionService(repository, () => 100); let settled = false;
    const pending = service.submit(submission()).then(result => { settled = true; return result; });
    await Promise.resolve(); await Promise.resolve(); expect(settled).toBe(false);
    if (!release) throw new Error('Expected pending repository update');
    release({ ok: false, error: 'transaction-aborted' });
    expect(await pending).toEqual({ ok: false, error: 'transaction-aborted' });
  });
  it('waits for creation commit before acknowledging a new session', async () => {
    const { repository } = memoryRepository(); let release: ((value: Result<SessionRecord>) => void) | undefined;
    repository.create = vi.fn<SessionRepository['create']>(() => new Promise(resolve => { release = resolve; }));
    let settled = false; const pending = sessionService(repository, () => 100).create(sessionInput()).then(r => { settled = true; return r; });
    await Promise.resolve(); await Promise.resolve(); expect(settled).toBe(false);
    if (!release) throw new Error('Expected pending create');
    release({ ok: true, value: savedSession() }); expect(unwrap(await pending).record).toEqual(savedSession());
  });
  it('retries exactly without double counting or reading time again', async () => {
    const { repository, records } = memoryRepository(); records.set('session-1', oneAnswer());
    const clock = vi.fn(() => Number.NaN); const service = sessionService(repository, clock);
    const result = unwrap(await service.submit(submission()));
    expect(result.changed).toBe(false); expect(result.view.progress.answered).toBe(1);
    expect(clock).not.toHaveBeenCalled(); expect(records.get('session-1')).toEqual(oneAnswer());
  });
  it('discards current work including intervening attempts, with no revision precondition', async () => {
    const { repository, records } = memoryRepository(); records.set('session-1', oneAnswer());
    const result = unwrap(await sessionService(repository, () => 0).discard('session-1'));
    expect(result.record.attempts).toEqual(oneAnswer().attempts);
    expect(result.view.status).toBe('discarded'); expect(result.view.lastActivityAt).toBe(0);
  });
  it('lists healthy sessions and unreadable records without treating them as empty', async () => {
    const { repository } = memoryRepository();
    repository.list = vi.fn<SessionRepository['list']>(async () => ({ ok: true, value: { sessions: [oneAnswer()], unavailable: [{ key: 'broken', error: 'corrupt-data' }] } }));
    const result = unwrap(await sessionService(repository, () => 0).list());
    expect(result.sessions[0]?.view.progress.answered).toBe(1);
    expect(result.unavailable).toEqual([{ key: 'broken', error: 'corrupt-data' }]);
  });
  it.each(['storage-unavailable', 'storage-denied', 'quota-exceeded', 'transaction-aborted', 'unsupported-version', 'corrupt-data'] as const)('preserves typed failure %s without fallback', async error => {
    const { repository } = memoryRepository();
    repository.load = vi.fn<SessionRepository['load']>(async () => ({ ok: false, error }));
    repository.list = vi.fn<SessionRepository['list']>(async () => ({ ok: false, error }));
    repository.update = vi.fn<SessionRepository['update']>(async () => ({ ok: false, error }));
    repository.create = vi.fn<SessionRepository['create']>(async () => ({ ok: false, error }));
    const service = sessionService(repository, () => 100);
    for (const result of await Promise.all([service.load('session-1'), service.list(), service.submit(submission()), service.discard('session-1'), service.create(sessionInput())])) {
      expect(result).toEqual({ ok: false, error });
    }
  });
  it('rejects invalid commands before invoking persistence', async () => {
    const { repository } = memoryRepository(); const service = sessionService(repository, () => 100);
    for (const result of await Promise.all([service.load('bad id'), service.discard(null), service.submit({}), service.create({})])) {
      expect(result).toEqual({ ok: false, error: 'invalid-input' });
    }
    expect(repository.create).not.toHaveBeenCalled(); expect(repository.load).not.toHaveBeenCalled(); expect(repository.update).not.toHaveBeenCalled();
  });
});
