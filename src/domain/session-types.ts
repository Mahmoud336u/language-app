import type { GermanAnswerDefinition } from './answer-matching';

export type SavedAnswerResult =
  | { readonly status: 'correct'; readonly matchedAnswerIndex: number; readonly transliterationUsed: boolean; readonly caseDifference: boolean }
  | { readonly status: 'incorrect' };
export interface SessionItem {
  readonly occurrenceId: string;
  readonly contentId: string;
  readonly contentVersion: string;
  readonly language: 'de';
  readonly prompt: string;
  readonly answer: Required<GermanAnswerDefinition>;
}
export interface SessionRecord {
  readonly snapshot: {
    readonly sessionId: string;
    readonly schemaVersion: 1;
    readonly createdAt: number;
    readonly items: readonly SessionItem[];
  };
  readonly attempts: readonly {
    readonly attemptId: string;
    readonly occurrenceId: string;
    readonly rawAnswer: string;
    readonly result: SavedAnswerResult;
    readonly timestamp: number;
    readonly evaluationVersion: 'de-v1';
  }[];
  readonly discardedAt: number | null;
}
export type SessionError = 'invalid-input' | 'invalid-exercise' | 'invalid-time'
  | 'conflict' | 'invalid-state' | 'corrupt-data' | 'unsupported-version' | 'not-found'
  | 'storage-unavailable' | 'storage-denied' | 'quota-exceeded' | 'transaction-aborted'
  | 'storage-failure' | 'connection-closed';
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: SessionError };
export type Clock = () => number;
export interface SessionMutation {
  readonly record: SessionRecord;
  readonly changed: boolean;
  readonly answerResult?: SavedAnswerResult;
}
export interface SessionView {
  readonly status: 'active' | 'completed' | 'discarded';
  readonly currentOccurrenceId: string | null;
  readonly lastActivityAt: number;
  readonly progress: { readonly total: number; readonly answered: number; readonly correct: number; readonly incorrect: number; readonly unanswered: number; readonly accuracy: number | null };
}
