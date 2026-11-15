# Session save and resume

Implemented API scope: approved D-05 version 2 and scoped D-10 version 1 from
[PR #11](https://github.com/Mahmoud336u/language-app/pull/11). This is a domain and
persistence slice; it does not add a learner interface or publish lessons.

## Boundaries

- `src/domain/session.ts`: pure session creation, append/discard transitions, and
  derived progress/status. Time is supplied by an injected clock.
- `src/domain/session-schema.ts`: strict input/persisted schemas and minimal-history
  invariants, using Zod and the approved German matcher validation rules.
- `src/application/session-service.ts`: create/load/list/submit/discard use cases.
- `src/application/session-repository.ts`: the atomic persistence port.
- `src/infrastructure/indexeddb-session-repository.ts`: browser transaction and
  connection lifecycle implementation, independent of React.

Create a repository with `openSessionRepository()`, check its typed result, then
pass the repository and a clock to `sessionService(repository, clock)`. Application
callers may inject `() => Date.now()`; domain code never reads the system clock.
Call `repository.close()` when the owning application lifecycle ends. After a
versionchange closes a connection, open a new repository before further work.

## Stored and derived data

Database `unpause-languages`, version 1, contains one `sessions` object store keyed
by `snapshot.sessionId`. Each record contains exactly:

- `snapshot`: session ID, record schema version, creation time, ordered exercise
  occurrences, source IDs/versions, prompts, and complete answer definitions.
- `attempts`: ordered, unique attempt IDs, occurrence IDs, exact raw answers,
  historical matcher feedback, supplied timestamps, and evaluation version.
- `discardedAt`: null or the supplied time of explicit discard.

Status, current occurrence, last activity time, and counts/accuracy are projections.
They are never additional authoritative stored fields. Valid times may move
backward; sequence order determines answer order. Accuracy is null with no answers.
No session result implies lesson completion, mastery, CEFR level, or vocabulary learned.

Creation input is `{ sessionId, items }`; each item has `occurrenceId`, `contentId`,
`contentVersion`, `language: 'de'`, `prompt`, and `answer` (the German answer
**definition**, not a learner submission). Matcher flags/variants default only at
creation. Persisted records must already contain their canonical fields.

Submission input is `{ sessionId, attemptId, occurrenceId, rawAnswer }`. Keep the
same attempt ID and exact payload when retrying an uncertain save. A new attempt
needs its own ID. IDs are unique within their session. The application provides IDs;
this slice introduces no random-ID dependency or account service.

## Save and conflict semantics

The repository reads and validates the current record, applies the synchronous
transition, and writes within one readwrite transaction. Do not replace `update`
with a load followed by an unconditional write. No async network/timer gap belongs
inside that transaction.

A request's success event is not a save acknowledgment. The API returns success
only after transaction completion. A failed write preserves prior data. Future UI
must keep pending/saved/failed distinct; unsent text or a killed tab's pending
request is not guaranteed recoverable.

Exact retries are detected before terminal/current-item checks, return the original
feedback and current session, and do not write or read a new clock value. Changed
payloads under the same ID conflict. Two competing answers to one occurrence cannot
both append; the loser reloads. Correct and incorrect answers both advance; invalid
input does not become an incorrect attempt.

Discard acts on current saved state without a revision precondition. It retains an
intervening answer from another tab, is idempotent, and cannot discard a completed
session. It is not privacy erasure. Starting another session preserves the first.
Inactivity never mutates stored data. Display-only archival remains a future UI decision.

## Failures and local storage limits

Results distinguish invalid input/time/state, conflicts, absent sessions, corrupt
records, unsupported versions, unavailable/denied storage, quota exhaustion,
transaction abort, and closed connections. An unexpected browser failure is
`storage-failure`; browser-specific error messages are not contracts. Failure does
not imply an immediate retry will succeed; resolve its cause first.

Read-time validation checks shape, IDs, order, outcomes, and independently valid
timestamps, without regrading old answers. Listings keep valid sessions usable and
report unreadable record keys/reasons separately. Corrupt/future data is left intact;
no automatic reset, repair, deletion, or storage fallback occurs. A missing store in
a version-1 database is corrupt, not fresh storage. No migration is implemented.

Browser clearing/eviction, origin changes, profile changes, and device loss can make
data unavailable. Empty storage is not proof of a learner's first visit. There is
no account, synchronization, telemetry, service worker, or persistent-storage request.

**Backup/export and import/recovery are the next persistence slice. No learner pilot
before that slice is implemented, reviewed, and passes its approved checks.**

## Verification

New frozen domain/service contracts live in `tests/contracts/session-*.test.ts`.
Real IndexedDB contracts and their non-shipping harness live in
`tests/contracts/session-browser/`. The separate Vite dev server serves the harness;
it is not a production build entry and is not copied into `dist`.

`npm run test:storage` runs Chromium locally. In CI its configuration also includes
Firefox and WebKit. `npm run test:e2e` runs the existing UI suite followed by storage
contracts; the existing required `test:e2e` check covers all three storage engines.
Controlled faults supplement real reload/concurrency/transaction tests. Connection
closure is tested with a deletion request; no speculative migration is required.
Playwright WebKit does not certify iOS Safari durability.
