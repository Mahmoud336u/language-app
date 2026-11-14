import { z } from 'zod';
import { matchGermanAnswer } from './answer-matching';

export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);
export const timestampSchema = z.number().int().min(0).max(8640000000000000);
const answerFields = {
  answer: z.string().max(1000), acceptedVariants: z.array(z.string().max(1000)).max(20),
  strictEszett: z.boolean(), testsCapitalization: z.boolean()
};
const definitionValid = (value: unknown) => matchGermanAnswer(value, 'validation-probe').status !== 'invalid-exercise';
const storedAnswer = z.strictObject(answerFields).refine(definitionValid);
const inputAnswer = z.strictObject({ ...answerFields,
  acceptedVariants: answerFields.acceptedVariants.default([]),
  strictEszett: answerFields.strictEszett.default(false), testsCapitalization: answerFields.testsCapitalization.default(false)
}).refine(definitionValid);
const itemFields = {
  occurrenceId: sessionIdSchema, contentId: sessionIdSchema, contentVersion: sessionIdSchema,
  language: z.literal('de'),
  prompt: z.string().min(1).max(4000).refine(value => value.trim().length > 0
    && !/\p{Cs}/u.test(value) && !/[\p{Cc}\p{Cf}]/u.test(value.replace(/[\t\r\n]/g, '')))
};
const uniqueOccurrences = (items: readonly { occurrenceId: string }[]) => new Set(items.map(item => item.occurrenceId)).size === items.length;
export const createSessionSchema = z.strictObject({
  sessionId: sessionIdSchema,
  items: z.array(z.strictObject({ ...itemFields, answer: inputAnswer })).min(1).max(100).refine(uniqueOccurrences)
});
export const submissionSchema = z.strictObject({ sessionId: sessionIdSchema, attemptId: sessionIdSchema,
  occurrenceId: sessionIdSchema, rawAnswer: z.string() });
const savedResult = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('correct'), matchedAnswerIndex: z.number().int().min(0),
    transliterationUsed: z.boolean(), caseDifference: z.boolean() }),
  z.strictObject({ status: z.literal('incorrect') })
]);
export const sessionRecordSchema = z.strictObject({
  snapshot: z.strictObject({ sessionId: sessionIdSchema, schemaVersion: z.literal(1), createdAt: timestampSchema,
    items: z.array(z.strictObject({ ...itemFields, answer: storedAnswer })).min(1).max(100).refine(uniqueOccurrences) }),
  attempts: z.array(z.strictObject({ attemptId: sessionIdSchema, occurrenceId: sessionIdSchema,
    rawAnswer: z.string().max(1000).refine(value => matchGermanAnswer({ answer: 'validation-probe' }, value).status !== 'invalid-input'),
    result: savedResult, timestamp: timestampSchema, evaluationVersion: z.literal('de-v1') })).max(100),
  discardedAt: timestampSchema.nullable()
}).refine(record => {
  if (record.attempts.length > record.snapshot.items.length
    || (record.discardedAt !== null && record.attempts.length === record.snapshot.items.length)
    || new Set(record.attempts.map(attempt => attempt.attemptId)).size !== record.attempts.length) return false;
  return record.attempts.every((attempt, index) => {
    const item = record.snapshot.items[index];
    return item !== undefined && item.occurrenceId === attempt.occurrenceId
      && (attempt.result.status !== 'correct' || attempt.result.matchedAnswerIndex <= item.answer.acceptedVariants.length);
  });
});
