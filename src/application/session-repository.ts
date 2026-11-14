import type { Result, SessionMutation, SessionRecord } from '../domain/session-types';

export interface SessionListing {
  readonly sessions: readonly SessionRecord[];
  readonly unavailable: readonly { readonly key: unknown; readonly error: 'corrupt-data' | 'unsupported-version' }[];
}
export type SessionTransition = (current: SessionRecord) => Result<SessionMutation>;
/** update must read and apply its synchronous transition within one atomic transaction. */
export interface SessionRepository {
  create(record: SessionRecord): Promise<Result<SessionRecord>>;
  load(sessionId: string): Promise<Result<SessionRecord>>;
  list(): Promise<Result<SessionListing>>;
  update(sessionId: string, transition: SessionTransition): Promise<Result<SessionMutation>>;
  close(): void;
}
