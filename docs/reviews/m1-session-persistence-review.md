# M1 slice 2: save and resume a German practice session

Date: 2026-11-14. Status: **PROPOSED — awaiting owner decision**.
Review base: `b1b56a4512e2557a7119af3f21ffb3b5eb33b834`.

This document proposes the architecture, exact scoped D-05/D-10 contract, and
Tier 1 test plan together. It does not change canonical decision statuses or
authorize implementation. Approval of this proposal must be recorded in
`docs/product-decisions.md` before its acceptance tests are written.

## Readiness and owner direction

- [M0 closure PR #8](https://github.com/Mahmoud336u/language-app/pull/8) merged.
- [Post-merge quality run](https://github.com/Mahmoud336u/language-app/actions/runs/43536685888) passed on the review base.
- [Clean trusted inspection](https://github.com/Mahmoud336u/language-app/actions/runs/43534421626) and [rejected tamper probe](https://github.com/Mahmoud336u/language-app/actions/runs/43529660335) supply linked enforcement evidence.
- On 2026-11-14 the owner instructed: "Now continue on M1 [we don't need a terminal outputs for the filed tests the links will do the work] since all checks has passed".
- Linked evidence is accepted for this handoff; no copied terminal transcripts are required. These links do not establish unobserved force-push/deletion attempts. Those attempts are not asserted as performed, and their missing transcripts are not used to block this owner-directed M1 review.
- The D-03/D-04 matcher is implemented in [PR #3](https://github.com/Mahmoud336u/language-app/pull/3). D-05 currently approves preservation direction only; D-10 remains PROPOSED. "Continue on M1" is authorization to advance the work, not an approval of previously unspecified storage semantics.

## Feature proposal and boundary

Provide a tested application API that creates a German typed-answer session,
commits each accepted answer to IndexedDB, reloads the saved session, and resumes
at its next unanswered item. Existing matcher behavior remains authoritative.

Scope: pure session transitions, attempt-derived session progress, runtime data
validation, a small repository port, one IndexedDB adapter, and real browser
verification. No production learning UI or lesson publication in this slice.

Multiple unfinished sessions are permitted; starting another never replaces or
discards an existing one. The caller supplies the ordered exercise set. Session
composition, Quick/Standard/Long options, scheduling, lesson/course completion,
mastery, onboarding, and reward mechanics remain outside this contract.

No new runtime dependency is proposed. Zod is already installed; IndexedDB is a
browser API. Existing Vitest, fast-check, Playwright, and Stryker provide checks.
A fake IndexedDB dependency is unnecessary: use a small in-memory repository test
double for orchestration and real Chromium for adapter transactions. Browser
fixtures use synthetic non-curriculum content and cannot be shipping lessons.

## Adversarial architecture review

### Verified facts and limits

The current domain has a pure matcher and no session/storage implementation.
Zod and browser test tooling are installed. The static React/Vite deployment does
not require a server for IndexedDB. These are repository facts.

IndexedDB transaction completion is the application's save acknowledgment, not
a guarantee against device failure, browser eviction, user deletion, or origin
changes. We have not validated current iOS persistence behavior or a PWA eviction
exemption. The submitted v2 D-10/D-13 proposals remain future release concerns;
this scoped approval must not be represented as approval of those full proposals.

### Five consequential risks

| Risk and severity | Trigger and failure mechanism | Learner impact | Smallest mitigation |
| --- | --- | --- | --- |
| Premature save acknowledgment — high | UI advances after an IndexedDB request succeeds but the transaction later aborts | An apparently saved answer disappears on reload | Publish success only after transaction completion; commit the whole session update atomically |
| Lost update or double counting — high | Two tabs submit from the same revision, or a retry follows an uncertain response | One answer overwrites another or counts twice | Read/check/write within one readwrite transaction; revision check and durable attempt ID deduplication |
| Device storage loss — high | Browser clears/evicts storage or the learner changes origin/device | Local progress is unavailable | State durability limits; no automatic resets; keep backup/import and device validation as explicit pre-release work |
| Broken historical session — high | Content changes, a newer app writes a different schema, or one stored record is corrupt | Resume fails or past answers are silently regraded | Freeze item snapshots; validate persisted records; reject unsupported formats; preserve unreadable records |
| Scope and data growth — medium | The session slice expands into curriculum, telemetry, sync, or stores an unbounded answer log per item | Slow delivery, opaque progress, unnecessary personal-data retention | One recorded outcome per item occurrence, bounded session inputs, local-only data, derived totals, no background services |

### Concrete production failure scenario

Tabs A and B read session revision 1. A answers item 2 correctly and commits
revision 2. B submits a different answer to item 2 using revision 1. An unconditional
write replaces A's work. With the proposed transaction and revision contract,
B receives a conflict and reloads the committed session. A duplicate retry of A's
same attempt ID returns its original saved result without another count.

### Exactly three owner questions

1. **Data flow:** Approve IndexedDB with transaction-completion acknowledgment and explicit retryable save errors, with backup/import/PWA deferred to a separate pre-release slice rather than claiming durable cross-device recovery now?
2. **State correctness:** Approve one committed outcome per item occurrence, exact attempt-ID retries without double counting, and revision conflicts that require reload instead of overwriting newer work?
3. **Learner behavior:** Approve indefinite resume, incorrect answers still advancing the session, and explicit discard ending resume while retaining already recorded attempts, with session completion making no claim of lesson completion or mastery?

### Lower-complexity alternative

An in-memory session reducer alone would be smaller and reuse most transition
tests. It would lose state on reload, so it cannot satisfy this slice's save/resume
acceptance criterion. A localStorage JSON blob would reduce adapter code but lack
the chosen transactional concurrency guarantee. Recommend one IndexedDB store and
one repository port; no event bus, synchronization layer, shared store framework,
separate progress database, or speculative migration system.

### Three invariants

1. A successful save has exactly one durable attempt for that item occurrence;
   repeating its request never changes totals, revision, or saved feedback.
2. Failed, invalid, or stale writes do not change committed session data. A rejected
   submission never increases answered/correct counts.
3. The application never changes saved outcomes or removes pending work because
   time passes. Explicit discard may end resumability but retains saved outcomes.

### Two adversarial scenarios

1. Two same-origin tabs in one browser profile use separate database connections
   to write the same revision concurrently; retry the winning request after reload
   and attempt to reuse its ID with another
   payload. Verify one winner, no lost update, stable counts, and safe conflicts.
2. Abort a transaction after its put request succeeds, then reload. Separately
   corrupt one record and present a future schema version. Verify no false save
   acknowledgment, no partial write, no automatic deletion, and continued access
   to unrelated valid sessions.

### Learner-facing acceptance criterion

Given a three-item session with one correct and one incorrect answer acknowledged
as saved, closing and reopening the application later restores both outcomes,
shows two answered and one correct, and resumes at item 3. A failed save must not
be presented as saved or silently advance the session. This slice verifies that
contract through application/browser tests; the learner-facing UI arrives later.

### Technical verdict

**BUILD NOW** for the bounded slice, after owner approval of this proposal.
The verdict is advisory and is not an approval or an implementation claim.

## Proposed product contract

If approved, record D-05 version 2 and a scoped D-10 version 1 with the approval
reference and the clauses below. D-03/D-04 version 1 remains unchanged. D-05's
already approved indefinite-preservation direction is retained. Full D-10 backup,
import, platform support, and future-version migration behavior is not implied.

### C-01: Session snapshot and validation

- A session has a caller-supplied unique session ID, `schemaVersion: 1`, revision,
  creation/update UTC timestamps, state `active | completed | discarded`, an
  ordered item snapshot, and committed attempts. IDs are nonempty ASCII strings
  matching `[A-Za-z0-9._:-]{1,128}`. A session ID collision returns conflict and
  cannot overwrite an existing record.
- Each item snapshot contains a unique occurrence ID within that session, source
  content ID/version, language `de`, plain-text prompt, and the complete approved
  German answer definition. Repeated source content is allowed under different
  occurrence IDs. Occurrence order and snapshots never change after creation.
- Proposed engineering bounds: 1–100 occurrences per session and 1–4,000 UTF-16
  code units per prompt, containing non-whitespace text. Prompts must be well-formed
  Unicode with no control/format characters except tab, CR, LF. Content ID/version
  use the same ID bounds. Answer definitions retain D-03's existing 1,000-unit /
  20-variant limits and validity rules. These are resource bounds, not approved
  pedagogical session lengths.
- Reject unknown schema fields and malformed input at public/persistence
  boundaries. Reject duplicate occurrence IDs and any invalid answer definition
  before creating a session. Canonicalize omitted matcher flags to false and
  omitted variants to an empty array in stored snapshots.
- Initial revision is 0. No separate saved next-item index or saved aggregate
  counters: derive them from the contiguous attempt prefix. One attempt per
  occurrence, in snapshot order. Completed means every occurrence has a saved
  attempt; discarded means explicitly stopped before completion. For active or
  completed records revision equals attempt count; for discarded records it equals
  attempt count plus one. Attempts have nondecreasing timestamps between createdAt
  and updatedAt; updatedAt is the last mutation's effective time.

### C-02: Time and identity

- Time comes through an injected clock; IDs through caller input/injected ID
  generation. Domain functions never read the system clock or random source.
- UTC timestamps are integers from 0 through 8,640,000,000,000,000 milliseconds.
  Invalid clock values reject a new mutation. For backward clock movement, a
  mutation's timestamp is `max(previousUpdatedAt, suppliedNow)`. Creation uses
  suppliedNow. Revision/order, not wall-clock time, determines attempt ordering.
- Reading/resuming never mutates timestamps, revision, state, or progress. Exact
  retries return saved data without reading a new clock value.

### C-03: Submitting an answer

- Submission contains session ID, expected nonnegative safe-integer revision,
  attempt ID (same ID bounds), current occurrence ID, and raw learner answer.
- Load and validate committed state, check for an existing attempt ID, then check
  active state, revision, and current occurrence. Attempt IDs are unique within
  a session. Reusing an existing ID for the same occurrence and exact raw answer
  returns its original result and current session snapshot without another write.
  Expected revision and supplied time are excluded from retry payload equality.
  A reused ID with a different occurrence or raw answer returns conflict.
- Exact committed retries still work after completion or discard. A new attempt
  on a terminal session returns a state error. A stale revision or non-current
  occurrence returns conflict; never auto-overwrite or auto-submit after reload.
- Evaluate using the existing D-03/D-04 matcher. Only `correct` and `incorrect`
  create an attempt. `invalid-input` and `invalid-exercise` do not count or advance
  anything and do not become incorrect answers.
- Store the occurrence ID, attempt ID, exact raw answer, matcher result, effective
  timestamp, and `evaluationVersion: de-v1`. Stored outcomes are historical facts;
  resume and progress calculation do not regrade them against changed content.
- Increment revision once for a new saved answer. Both correct and incorrect
  answers advance to the next occurrence. The final answer atomically changes
  state to completed. With the snapshot bound, valid revisions never exceed 100
  (a discarded session has at most 99 attempts plus its discard revision).
- Resolving a put request is not success: acknowledge saved output only after the
  transaction's completion event. A failed write returns a typed failure, retains
  the previous committed state, and permits retry with the same attempt ID.
  Unsaved typed text and a killed tab's in-memory pending request are not promised
  recoverable. Future UI must distinguish pending, saved, and failed states.

### C-04: Resume, discard, and derived progress

- Active sessions remain resumable indefinitely. No inactivity expiry, automatic
  archive, deletion, negative streak, or timer is introduced.
- Explicit discard uses session ID and expected revision. It increments revision
  once, retains the snapshot and all saved attempts, and changes state to
  discarded. A repeat discard of an already discarded session is a no-op; an
  attempted discard of a completed session is a state error. A stale first
  discard conflicts. Creating another session never discards the previous one.
- Per-session progress is derived: total = snapshot length; answered = saved
  attempt count; correct = count of saved correct results; incorrect = count of
  saved incorrect results; unanswered = total minus answered; accuracy = null
  when answered is zero, otherwise correct / answered (0–1, no display rounding).
- A discarded session can retain unanswered occurrences, but has no resumable
  current item. Completed/discarded sessions remain readable. Discard is not
  erasure of learning history; deletion/privacy controls need a separate slice.
- Session completion is not lesson/course completion or mastery. No global
  "learned vocabulary", streak, skill, CEFR, or improvement metric is fabricated.

### C-05: Persistence and concurrency

- Use IndexedDB database `unpause-languages`, database version 1, store `sessions`
  keyed by session ID. Record schema version and database version are distinct.
  One validated session record is the authoritative aggregate.
- Create uses add semantics. Mutations load, validate, compare revision, compute,
  and write within one readwrite transaction on the session store. Avoid async
  network/timer gaps while that transaction is active. A response is returned
  only after commit; abort/error never returns success.
- Two competing requests for the same revision cannot both append different
  answers. One commits and the other conflicts, unless it is the exact committed
  retry. No duplicated authoritative counters, last-write-wins, or localStorage
  fallback is permitted.
- Storage unavailable/denied, quota exhaustion, aborted transactions, blocked
  upgrades, and unsupported schemas return distinguishable typed outcomes;
  browser-specific messages are not contracts. At open, a blocked upgrade is
  reported and any eventual late-opened connection is closed without writes.
  Existing connections close on versionchange and require reopening for use.
- Use schema and invariant validation on reads and before writes: unique IDs,
  contiguous attempts, result shape and valid matched-answer index, timestamps,
  revision bounds, and consistent state. Validation is not proof that local data
  was produced by a real learner; this is not an anti-tampering security boundary.

### C-06: Corruption, empty storage, and versions

- An unreadable record returns `corrupt-data` and remains untouched; no automatic
  reset, repair, deletion, or success-shaped empty session. Listing reports valid
  sessions and unavailable record IDs/reasons separately so other sessions remain
  usable. Unsupported record versions are reported distinctly and not rewritten.
- Reading a known absent ID returns not-found. An empty store returns no saved
  sessions, never an assertion that this is the learner's first visit. Eviction
  cannot be distinguished reliably from no prior usage without external evidence.
- First use creates database/store version 1. There is no shipped legacy storage
  format to migrate. Do not invent a v0 schema or claim migrations tested without
  a real transition. Future migrations require exact approved contracts, backup
  and rollback/failure handling before their own tests. A newer database version
  unsupported by this app blocks writes and is never deleted/recreated. A version-1
  database missing its expected store is corrupt, not an empty fresh database.
- Data remains in this origin/browser profile. No account, network transfer,
  analytics, diagnosis field, persistent-storage request, or service worker is
  introduced. Store only session snapshots and answer data needed by this slice.
- Full export/import, user data erasure, recovery UI, and current-device storage
  validation remain explicit work before real learner release. The owner's v2
  backup/PWA concerns remain open, not rejected or silently satisfied. This
  internal domain slice is not permission to launch a local-only product without
  those reviewed safeguards.

## Implementation boundaries after approval

- `src/domain/session.ts`: immutable transitions, validation of domain invariants,
  and derived progress. No browser/UI imports.
- `src/application/session-service.ts`: create/load/submit/discard use cases;
  matcher composition and injected clock; typed outcomes for future UI.
- `src/application/session-repository.ts`: the single port needed for atomic
  create/load/list/update operations. Atomic mutation must execute the pure
  transition against the state actually read inside the transaction, not accept
  an unconditional snapshot produced from a stale earlier read.
- `src/infrastructure/indexeddb-session-repository.ts` and a focused persisted-data
  schema module: browser transactions and Zod validation. No framework dependency.
- New contract/browser fixture files only. Existing contracts, shared support,
  matcher output rules, and foundation UI stay unchanged.

These names are proposed implementation locations, not a requirement for extra
classes or empty abstractions. The exact TypeScript API may be kept small without
changing the approved behaviors.

## Tier 1 test plan for owner review

New files only: `tests/contracts/session-state.test.ts`,
`session-service.test.ts`, and `session-storage-validation.test.ts`.
Real-browser adapter tests belong in a new `tests/e2e/session-storage.spec.ts` with
an isolated test-only adapter harness. Harness assets must not enter the production
build. A new configuration/dependency would require its usual governance review;
no existing frozen fixture or setup file may be edited to add it.
Each contract file is created once and then frozen. Later behavior groups require
additional new files rather than appending to any committed contract file.

| Test group/name | Expected behavior | Clauses |
| --- | --- | --- |
| create_valid_snapshot | Creates revision 0, empty attempts, next first item; input objects unchanged | C-01/C-02 |
| reject_invalid_snapshot | Covers 0/101 items, duplicate IDs, malformed prompts/answers/flags, unknown fields and exact boundaries | C-01 |
| reject_session_id_collision | Cannot overwrite an existing session, including completed/discarded records | C-01/C-05 |
| record_correct_and_incorrect | Saves either outcome once and advances; last outcome completes in the same commit | C-03 |
| reject_invalid_without_progress | Invalid input/exercise and malformed command leave every saved field unchanged | C-03 |
| retry_same_attempt | Returns original result with no extra write/count/revision, including after completion/discard | C-02/C-03 |
| reject_reused_attempt_payload | Same attempt ID with different raw input/occurrence conflicts | C-03 |
| reject_stale_or_out_of_order | A stale revision or non-current occurrence cannot overwrite/skip pending work | C-03 |
| stop_terminal_writes | New answers on completed/discarded sessions fail; completed discard fails | C-03/C-04 |
| derive_progress | Correct/incorrect/unanswered/accuracy match saved facts; empty accuracy is null | C-04 |
| discard_retains_attempts | Explicit discard retains outcomes, ends resume, increments once; repeat is no-op | C-04 |
| preserve_multiple_sessions | Creating another session never changes the previous session | C-04 |
| resume_without_expiry | Arbitrary inactivity/UTC boundary/timezone changes have no effect on reads | C-02/C-04 |
| handle_clock_bounds | Invalid time is rejected; backward time clamps; retries retain original time | C-02/C-03 |
| save_before_success | Pending/aborted repository writes cannot yield a saved answer or advance state | C-03/C-05 |
| keep_snapshots_and_feedback | Mutating input objects or later source content cannot alter saved items/results | C-01/C-03 |
| validate_persisted_invariants | Corrupt/future-version data yields typed errors and remains unchanged | C-05/C-06 |
| preserve_healthy_records | Listing reports unreadable records separately; healthy sessions remain usable | C-06 |
| distinguish_absence_from_corruption | Missing session/empty DB is distinct from corrupt/future-version storage | C-06 |
| no_implicit_recovery | Quota/denial/version failures never delete data or silently fall back to memory | C-05/C-06 |
| generated_transition_sequences | Seeded fast-check sequences preserve uniqueness, contiguous order, no mutation, idempotency, and derived counts | C-01–C-06 |
| real_browser_round_trip | Actual IndexedDB survives page reload and restores exact snapshot/attempts | C-01–C-06 |
| real_browser_concurrent_tabs | Competing same-revision writes produce one winner without lost work | C-03/C-05 |
| real_browser_abort_and_versionchange | Force transaction abort after request success; handle upgrades and connection closure without false success | C-05/C-06 |

Quota/denial fault tests use controlled failures; ordinary browser round-trip and
concurrency tests must also exercise actual IndexedDB. Browser test claims are
limited to the configured Chromium environment, not Safari/iOS or all devices.

## RED / GREEN / REFACTOR and quality gates

1. Owner approves the architecture, scoped C-01–C-06 contract, and test plan; record
   the exact D-05/D-10 versions and approval reference before test commits.
2. Add importable behaviorless seams only as needed for meaningful RED. Write new
   tests for the first approved behavior group, run them, observe assertion
   failures, and commit tests separately. No broken-import RED or speculative
   tests for future backup/scheduler features.
3. Implement the minimum transition/use case/adapter needed for those tests; run
   GREEN. Repeat in small groups, preserving every committed contract.
4. Refactor only when useful; rerun the applicable regression suite.
5. Run lint, typecheck, full Vitest, Playwright, build, contract suite, raw/trusted
   integrity, deployment compatibility, and domain mutation analysis. Review
   survivors with new tests where needed; never lower thresholds or edit frozen
   expectations. Confirm the test harness is absent from production output.
6. Report actual results and commit hashes, linking CI logs and artifacts. Owner
   evidence links suffice; copied terminal output is not an additional gate.

## Approval record

- Implementation approval: **PENDING**.
- D-05 version 2 / scoped D-10 version 1: **PROPOSED**.
- Tier 1 test plan: **PENDING owner review**.
- Current PR scope: documentation proposal only; no RED/GREEN implementation yet.
- Remaining release questions: full backup/import, erasure, recovery UX, supported
  browsers, PWA/iOS evidence, reviewed content, scheduling, and actual lesson UI.
