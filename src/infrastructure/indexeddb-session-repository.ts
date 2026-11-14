import type { SessionRepository } from '../application/session-repository';
import type { Result } from '../domain/session-types';

export interface SessionStorageOptions { readonly indexedDB?: IDBFactory | null }
export async function openSessionRepository(options: SessionStorageOptions = {}): Promise<Result<SessionRepository>> {
  void options;
  return { ok: false, error: 'storage-unavailable' };
}
