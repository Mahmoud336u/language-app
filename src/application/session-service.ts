import { createSession, discardSession, sessionView, submitSession } from '../domain/session';
import { sessionIdSchema, submissionSchema } from '../domain/session-schema';
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
  const state = (record: SessionRecord): SessionState => ({ record, view: sessionView(record) });
  const projectMutation = (result: Result<SessionMutation>): Result<SessionMutation & { readonly view: SessionView }> =>
    result.ok ? { ok: true, value: { ...result.value, view: sessionView(result.value.record) } } : result;
  return {
    async create(input) {
      const created = createSession(input, clock);
      if (!created.ok) return created;
      const committed = await repository.create(created.value);
      return committed.ok ? { ok: true, value: state(committed.value) } : committed;
    },
    async load(sessionId) {
      const parsed = sessionIdSchema.safeParse(sessionId);
      if (!parsed.success) return { ok: false, error: 'invalid-input' };
      const loaded = await repository.load(parsed.data);
      return loaded.ok ? { ok: true, value: state(loaded.value) } : loaded;
    },
    async submit(command) {
      const parsed = submissionSchema.safeParse(command);
      if (!parsed.success) return { ok: false, error: 'invalid-input' };
      return projectMutation(await repository.update(parsed.data.sessionId, current => submitSession(current, parsed.data, clock)));
    },
    async discard(sessionId) {
      const parsed = sessionIdSchema.safeParse(sessionId);
      if (!parsed.success) return { ok: false, error: 'invalid-input' };
      return projectMutation(await repository.update(parsed.data, current => discardSession(current, clock)));
    },
    async list() {
      const listed = await repository.list();
      return listed.ok ? { ok: true, value: { sessions: listed.value.sessions.map(state), unavailable: listed.value.unavailable } } : listed;
    }
  };
}
