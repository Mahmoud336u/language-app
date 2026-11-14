import type { Clock, Result, SessionMutation, SessionRecord, SessionView } from './session-types';

// Behaviorless seams for the approved D-05/D-10 RED phase.
export function createSession(input: unknown, clock: Clock): Result<SessionRecord> {
  void input; void clock;
  return { ok: false, error: 'invalid-input' };
}
export function inspectSession(input: unknown): Result<SessionRecord> {
  void input;
  return { ok: false, error: 'corrupt-data' };
}
export function submitSession(record: SessionRecord, command: unknown, clock: Clock): Result<SessionMutation> {
  void record; void command; void clock;
  return { ok: false, error: 'invalid-input' };
}
export function discardSession(record: SessionRecord, clock: Clock): Result<SessionMutation> {
  void record; void clock;
  return { ok: false, error: 'invalid-state' };
}
export function sessionView(record: SessionRecord): SessionView {
  void record;
  throw new Error('Session projection is not implemented');
}
