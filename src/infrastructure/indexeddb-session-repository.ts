import type { SessionListing, SessionRepository, SessionTransition } from '../application/session-repository';
import { inspectSession } from '../domain/session';
import { sessionIdSchema } from '../domain/session-schema';
import type { Result, SessionError, SessionMutation, SessionRecord } from '../domain/session-types';

export interface SessionStorageOptions { readonly indexedDB?: IDBFactory | null }
const databaseName = 'unpause-languages';
const storeName = 'sessions';
const keyPath = 'snapshot.sessionId';

function storageError(error: unknown): SessionError {
  const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : undefined;
  switch (name) {
    case 'ConstraintError': return 'conflict';
    case 'QuotaExceededError': return 'quota-exceeded';
    case 'SecurityError': case 'NotAllowedError': return 'storage-denied';
    case 'VersionError': return 'unsupported-version';
    case 'AbortError': return 'transaction-aborted';
    case 'InvalidStateError': return 'connection-closed';
    default: return 'storage-failure';
  }
}
function readRecord(value: unknown, key: unknown): Result<SessionRecord> {
  const parsed = inspectSession(value);
  if (!parsed.ok) return parsed;
  return parsed.value.snapshot.sessionId === key ? parsed : { ok: false, error: 'corrupt-data' };
}
type ReadRequest = <V>(request: IDBRequest<V>, action: (value: V) => void) => void;

class IndexedDbSessionRepository implements SessionRepository {
  private closed = false;
  private readonly database: IDBDatabase;
  constructor(database: IDBDatabase) {
    this.database = database;
    database.onversionchange = () => this.close();
    database.onclose = () => { this.closed = true; };
  }
  close(): void { this.closed = true; this.database.close(); }

  /** Request success only stages a result. The transaction completion event acknowledges it. */
  private transact<T>(mode: IDBTransactionMode,
    operation: (store: IDBObjectStore, done: (result: Result<T>) => void, read: ReadRequest) => void
  ): Promise<Result<T>> {
    if (this.closed) return Promise.resolve({ ok: false, error: 'connection-closed' });
    return new Promise(resolve => {
      let transaction: IDBTransaction;
      try { transaction = this.database.transaction(storeName, mode); }
      catch (error) { resolve({ ok: false, error: storageError(error) }); return; }
      let result: Result<T> = { ok: false, error: 'storage-failure' };
      let failure: SessionError | undefined;
      const abort = (error: unknown) => {
        failure = storageError(error);
        try { transaction.abort(); } catch { resolve({ ok: false, error: failure }); }
      };
      const read: ReadRequest = (request, action) => {
        request.onsuccess = () => { try { action(request.result); } catch (error) { abort(error); } };
      };
      transaction.onerror = event => {
        const source = event.target as IDBRequest | null;
        failure = storageError(source?.error ?? transaction.error);
      };
      transaction.onabort = () => resolve({ ok: false, error: failure ?? (transaction.error ? storageError(transaction.error) : 'transaction-aborted') });
      transaction.oncomplete = () => resolve(result);
      try { operation(transaction.objectStore(storeName), value => { result = value; }, read); }
      catch (error) { abort(error); }
    });
  }

  create(record: SessionRecord): Promise<Result<SessionRecord>> {
    const parsed = inspectSession(record);
    if (!parsed.ok) return Promise.resolve(parsed);
    return this.transact('readwrite', (store, done, read) => {
      read(store.add(parsed.value), () => done(parsed));
    });
  }
  load(sessionId: string): Promise<Result<SessionRecord>> {
    if (!sessionIdSchema.safeParse(sessionId).success) return Promise.resolve({ ok: false, error: 'invalid-input' });
    return this.transact('readonly', (store, done, read) => {
      read(store.get(sessionId), value => done(value === undefined ? { ok: false, error: 'not-found' } : readRecord(value, sessionId)));
    });
  }
  list(): Promise<Result<SessionListing>> {
    return this.transact('readonly', (store, done, read) => {
      const sessions: SessionRecord[] = [];
      const unavailable: { key: unknown; error: 'corrupt-data' | 'unsupported-version' }[] = [];
      read(store.openCursor(), cursor => {
        if (!cursor) { done({ ok: true, value: { sessions, unavailable } }); return; }
        const parsed = readRecord(cursor.value, cursor.primaryKey);
        if (parsed.ok) sessions.push(parsed.value);
        else unavailable.push({ key: cursor.primaryKey, error: parsed.error === 'unsupported-version' ? 'unsupported-version' : 'corrupt-data' });
        cursor.continue();
      });
    });
  }
  update(sessionId: string, transition: SessionTransition): Promise<Result<SessionMutation>> {
    if (!sessionIdSchema.safeParse(sessionId).success) return Promise.resolve({ ok: false, error: 'invalid-input' });
    return this.transact('readwrite', (store, done, read) => {
      read(store.get(sessionId), value => {
        if (value === undefined) { done({ ok: false, error: 'not-found' }); return; }
        const parsed = readRecord(value, sessionId);
        if (!parsed.ok) { done(parsed); return; }
        const next = transition(parsed.value);
        if (!next.ok) { done(next); return; }
        const checked = readRecord(next.value.record, sessionId);
        if (!checked.ok) { done(checked); return; }
        const committed: Result<SessionMutation> = { ok: true, value: { ...next.value, record: checked.value } };
        if (next.value.changed) read(store.put(checked.value), () => done(committed));
        else done(committed);
      });
    });
  }
}

export async function openSessionRepository(options: SessionStorageOptions = {}): Promise<Result<SessionRepository>> {
  try {
    const factory = options.indexedDB === undefined ? globalThis.indexedDB : options.indexedDB;
    if (!factory) return { ok: false, error: 'storage-unavailable' };
    return await new Promise(resolve => {
      const request = factory.open(databaseName, 1);
      let declined = false;
      request.onblocked = () => { declined = true; resolve({ ok: false, error: 'storage-unavailable' }); };
      request.onerror = () => resolve({ ok: false, error: storageError(request.error) });
      request.onupgradeneeded = () => {
        if (declined) { request.transaction?.abort(); return; }
        request.result.createObjectStore(storeName, { keyPath });
      };
      request.onsuccess = () => {
        const database = request.result;
        if (declined) { database.close(); return; }
        if (!database.objectStoreNames.contains(storeName)) {
          database.close(); resolve({ ok: false, error: 'corrupt-data' }); return;
        }
        const store = database.transaction(storeName, 'readonly').objectStore(storeName);
        if (store.keyPath !== keyPath || store.autoIncrement) {
          database.close(); resolve({ ok: false, error: 'corrupt-data' }); return;
        }
        resolve({ ok: true, value: new IndexedDbSessionRepository(database) });
      };
    });
  } catch (error) { return { ok: false, error: storageError(error) }; }
}
