import { sessionService } from '../../../src/application/session-service';
import type { SessionService } from '../../../src/application/session-service';
import type { SessionRepository } from '../../../src/application/session-repository';
import { openSessionRepository } from '../../../src/infrastructure/indexeddb-session-repository';
import { savedSession, sessionInput, submission } from '../session-fixtures';

const databaseName = 'unpause-languages';
let time = 100;
let repository: SessionRepository | undefined;
let service: SessionService | undefined;
let putSucceeded = false;
async function connect() {
  const opened = await openSessionRepository();
  if (!opened.ok) return opened;
  repository = opened.value; service = sessionService(repository, () => time);
  return { ok: true as const };
}
function currentService(): SessionService {
  if (!service) throw new Error('Storage service is not connected');
  return service;
}
async function rawDatabase<T>(operation: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
  });
  try { return await operation(database); } finally { database.close(); }
}
function removeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Deletion blocked by an unclosed connection'));
  });
}
async function replaceDatabase(version: number, withStore: boolean) {
  repository?.close(); await removeDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, version);
    request.onupgradeneeded = () => { if (withStore) request.result.createObjectStore('sessions', { keyPath: 'snapshot.sessionId' }); };
    request.onsuccess = () => { request.result.close(); resolve(); }; request.onerror = () => reject(request.error);
  });
}
function armWriteFailure(mode: 'abort' | 'quota' | 'denied') {
  const put = IDBObjectStore.prototype.put; const add = IDBObjectStore.prototype.add;
  const wrap = (original: typeof put) => function(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    IDBObjectStore.prototype.put = put; IDBObjectStore.prototype.add = add;
    if (mode !== 'abort') throw new DOMException('Controlled write failure', mode === 'quota' ? 'QuotaExceededError' : 'SecurityError');
    const request = original.call(this, value, key);
    request.addEventListener('success', () => { putSucceeded = true; this.transaction.abort(); }, { once: true });
    return request;
  };
  IDBObjectStore.prototype.put = wrap(put); IDBObjectStore.prototype.add = wrap(add);
}
const harness = {
  ready: connect(), connect, setTime(value: number) { time = value; }, close() { repository?.close(); },
  create(count = 3, id = 'session-1') { return currentService().create(sessionInput(count, id)); },
  submit(index = 1, answer = 'Haus', id = `attempt-${index}`) { return currentService().submit(submission(index, answer, id)); },
  discard() { return currentService().discard('session-1'); },
  load(id = 'session-1') { return currentService().load(id); }, list() { return currentService().list(); },
  armWriteFailure, didPutSucceed() { return putSucceeded; }, replaceDatabase, removeDatabase,
  sampleRecord: savedSession,
  async unavailable() { const result = await openSessionRepository({ indexedDB: null }); if (result.ok) result.value.close(); return { ok: result.ok, ...(!result.ok ? { error: result.error } : {}) }; },
  rawRead(id: string) {
    return rawDatabase(database => new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction('sessions', 'readonly');
      const request = transaction.objectStore('sessions').get(id);
      transaction.oncomplete = () => resolve(request.result); transaction.onabort = () => reject(transaction.error);
    }));
  },
  rawPut(value: unknown) {
    return rawDatabase(database => new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('sessions', 'readwrite'); transaction.objectStore('sessions').put(value);
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error);
    }));
  }
};
declare global { interface Window { sessionHarness: typeof harness } }
window.sessionHarness = harness;
