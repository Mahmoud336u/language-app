import type { Clock, Result, SessionMutation, SessionRecord, SessionView } from '../domain/session-types';
import type { SessionListing, SessionRepository } from './session-repository';

export type SessionState = { readonly record: SessionRecord; readonly view: SessionView };
export interface SessionService {
  create(input: unknown): Promise<Result<SessionState>>;
  load(sessionId: unknown): Promise<Result<SessionState>>;
  submit(command: unknown): Promise<Result<SessionMutation & { readonly view: SessionView }>>;
  discard(sessionId: unknown): Promise<Result<SessionMutation & { readonly view: SessionView }>>;
  list(): Promise<Result<{ readonly sessions: readonly SessionState[]; readonly unavailable: SessionListing['unavailable'] }>>;
}
export function sessionService(repository: SessionRepository, clock: Clock): SessionService {
  void repository; void clock;
  const absent = async (): Promise<{ ok: false; error: 'storage-unavailable' }> => ({ ok: false, error: 'storage-unavailable' });
  return { create: absent, load: absent, submit: absent, discard: absent, list: absent };
}
