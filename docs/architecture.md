# Architecture

## Approved M0 boundary

The owner approved the React/Vite foundations and governance amendments on
2026-11-12. The repository remains `language-app`; the product is Unpause Languages.
See the [review](reviews/m0-architecture-review.md) and
[authorization](reviews/m0-owner-authorization.md).

The running UI is a neutral engineering harness, not an implemented language course.
It provides honest availability text, labeled sample controls, validation, keyboard
navigation, reduced-motion behavior, and responsive tokens. It stores no input and
makes no analytics or learning-data requests. No external services are provisioned.

## Technology choices

- React 19 + Vite 8: client-side components and portable static assets. No current
  requirement justifies a server runtime or a Next.js adapter.
- TypeScript 6.0.3: strict configuration including unchecked indexed access and
  exact optional properties. TypeScript 7 was outside typescript-eslint's supported
  peer range at setup, so it was not selected.
- Tailwind 4 and semantic CSS variables: consistent styles without a dashboard kit.
- Vitest 5, Testing Library, fast-check, Playwright and axe: behavior and integrity
  verification. Core Vitest assertions avoid an incompatible matcher augmentation.
- Node 24.22.1/npm 11.9.0 and exact versions in the lockfile: reproducible setup.
- Zod validates approved session inputs and persisted records. Educational content
  schemas remain a later approved slice.

## Module boundaries

`src/app` currently composes the foundation harness; `src/styles` owns tokens and
`src/ui` owns the reusable sample control.
`src/domain` implements pure matching and session transitions, `src/application`
contains session use cases and the repository port, and `src/infrastructure`
implements IndexedDB transactions.
Do not create empty scheduler, AI, or language-provider
abstractions now. ESLint prevents domain imports of React, infrastructure, or UI,
and direct use of Date or Math.random. Session clocks are injected; callers supply IDs.

Implemented API flow: application use case → pure domain + persistence port.
Composition injects the repository and clock. The foundation UI does not yet call
these APIs. German-specific matching lives apart from future other languages.
Persisted attempts own progress facts; status, totals, and last activity are derived.

## Deferred decisions and limits

The first approved M1 slice adds `src/domain/answer-matching.ts`, a pure typed-answer
matcher with validated inputs, directional transliteration, strict flags, and
feedback data. It has no UI, time, persistence, or scheduling dependencies. The
owner-approved D-03/D-04 contract and [module documentation](answer-matching.md)
define its boundary. D-15 approves one A1 pilot course's scope, not publication.

D-05 v2 and scoped D-10 v1 authorize the implemented session/IndexedDB slice:
snapshot + ordered attempts + nullable discard time, atomic occurrence checks,
idempotent retries, transaction-completion acknowledgment, and validated reads.
See [session persistence](session-persistence.md) and its
[approval](reviews/m1-session-owner-authorization.md). No migration is invented for
database version 1. Backup/export and import/recovery are the very next persistence
slice and a prerequisite to any learner pilot. Browser eviction, deletion, and
origin changes remain risks; local storage is not a backup. No service worker or
offline-launch promise.

Public course and grammar pages will need a rendering/indexing decision before
launch: a plain SPA does not automatically supply useful no-JavaScript content or
per-route server metadata. The foundation uses noindex and must not be marketed as
a live course. Production authentication, AI, payments, synchronization, and
additional languages remain outside M0.
