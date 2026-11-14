# M1 slice 2: save and resume a German practice session

Date: 2026-11-14. Status: **APPROVED with owner amendments**.
Review base: `b1b56a4512e2557a7119af3f21ffb3b5eb33b834`.
Approval reference: https://github.com/Mahmoud336u/language-app/pull/11
Owner: @Mahmoud336u. See [the authorization record](m1-session-owner-authorization.md).

This revision records the owner's chat approval of the simplified architecture,
scoped D-05 version 2 / D-10 version 1 contract, and amended testing scope. It
supersedes the original revision-counter proposal at `27600e9`. Recording approval
is not an implementation or passing-test claim. This PR contains documentation;
feature code and RED/GREEN test commits follow separately.

## Readiness and scope

[M0 closure PR #8](https://github.com/Mahmoud336u/language-app/pull/8) merged and its
[main quality run](https://github.com/Mahmoud336u/language-app/actions/runs/43536685888)
passed. The owner accepts linked test evidence without copied terminal transcripts.
Links do not establish unobserved force-push/deletion attempts. The existing
[D-03/D-04 matcher](https://github.com/Mahmoud336u/language-app/pull/3) is implemented.

Build a tested application API that creates a German typed-answer session, commits
each answer to IndexedDB, and resumes the next unanswered occurrence after reload.
Scope: pure transitions, attempt-derived progress, validation, one repository port,
and one browser adapter. No new runtime dependency: use existing Zod and native
IndexedDB. Existing Vitest, fast-check, Playwright, and Stryker provide verification.

The caller supplies the ordered exercise set. Multiple unfinished sessions may
coexist. No lesson UI, shipping curriculum, session composition, scheduler grades,
lesson/course completion, mastery, accounts, synchronization, or analytics is added.
Fixtures are synthetic test data, not reviewed shipping lessons.

**Sequencing commitment:** backup/export and import/recovery are the very next
persistence slice. No learner pilot may begin until that slice is implemented,
reviewed, and passes its approved checks. Its format, conflict policy, and recovery
contracts require a separate review before implementation. PWA, erasure controls,
recovery UI, and supported-device validation remain pre-release work as applicable;
this approval does not claim these safeguards already exist.

## Adversarial architecture review

### Verified facts and limits

The application uses static React/Vite and has a pure German matcher, but no session
store. IndexedDB needs no application server. A transaction's completion event is
the save acknowledgment; it is not a guarantee against eviction, user deletion,
device failure, or changes of browser/profile/origin. Cross-engine tests will add
coverage, but Playwright WebKit is not verification of iOS Safari durability.

### Five risks

| Risk / severity | Trigger and mechanism | Learner impact | Minimal mitigation |
| --- | --- | --- | --- |
| False save / high | Request succeeds, then its transaction aborts | An acknowledged answer disappears | Acknowledge only transaction completion; atomically write the aggregate |
| Lost update or duplicate answer / high | Concurrent tabs or a retried request use stale state | Work is overwritten or counts twice | Read/check current occurrence/write in one transaction; durable attempt-ID deduplication |
| Local storage loss / high | Browser clears data or learner changes device/origin | Saved progress unavailable | Document local scope; backup/import immediately next; no learner pilot before it works |
| Invalid historical data / high | Damaged/future record or later source-content changes | Broken resume or silent regrading | Immutable item snapshots, minimal schema validation, typed failures, preserve unreadable data |
| Premature complexity / medium | Redundant revisions/status/times or speculative migrations grow | More contradictions, tests, and maintenance | Store snapshot/attempts/discard marker; derive state; defer migration and blocked-upgrade scenarios |

### Concrete failure scenario

Tabs A and B both see item 2 as current. A commits an answer. B's transaction then
reads the updated aggregate, sees item 3 is current, and rejects B's item-2 answer.
Without the check inside the transaction, B could overwrite A's work. Retrying
A's same attempt ID and exact payload returns its saved result without another
write, even though item 2 is no longer current. A separate revision counter is not
needed for these append-only transitions.

### Three consequential questions, answered by the owner

1. **Data flow:** Use completion-acknowledged IndexedDB and typed save failures, with backup/import next and no pilot before it exists? **Yes.**
2. **State correctness:** Use one outcome per occurrence, exact-ID retries, transactional occurrence conflicts, derived state, and supplied valid timestamps without a backward-clock clamp? **Yes, with these simplifications.**
3. **Learner behavior:** Preserve unfinished work indefinitely, advance after incorrect answers, retain attempts on discard, and defer display-only staleness/archival grouping? **Yes.**

### Lower-complexity alternative

In-memory state alone is smaller but cannot satisfy reload/resume. A localStorage
blob lacks the selected transactional concurrency guarantee. The approved design
uses one IndexedDB store and one repository port, without persisted revisions,
status, aggregate counters, next index, or updatedAt; no event bus or sync layer.

### Three invariants

1. Each saved occurrence has one outcome; exact retries never change counts or saved feedback.
2. Invalid, failed, and conflicting submissions leave committed data unchanged.
3. Passing time never changes stored progress or pending work; explicit discard retains saved attempts.

### Two adversarial scenarios

1. Two same-origin tabs in one browser profile, using separate connections, answer
   the same current occurrence; verify one winner, stable retries, changed-payload
   conflicts, and a later discard that preserves the winning answer.
2. Abort after a successful put request, then reload; separately present one corrupt
   or unsupported record. Verify no false acknowledgment, no partial write, no
   automatic reset, and continued access to unrelated healthy sessions.

### Learner-facing acceptance criterion

A three-item session with one correct and one incorrect answer acknowledged as saved
reloads with two answered, one correct, and item 3 current, even after a long break.
A failed save never silently advances. This domain slice verifies the contract
through application and browser tests; the learning interface is a later slice.

### Technical verdict

**BUILD NOW** for this bounded, owner-approved slice. The original advisory verdict
was not authorization; the subsequent owner decisions are recorded separately.

## Approved scoped contract

These clauses are the shared D-05 v2 / D-10 v1 contract. D-03/D-04 remain unchanged.

### C-01: Minimal snapshot and validation

- Persist only `snapshot`, `attempts`, and nullable `discardedAt`. The snapshot
  contains session identity, record `schemaVersion: 1`, creation time, and ordered
  item definitions. Each item holds an occurrence ID, source content ID/version,
  language `de`, plain-text prompt, and the complete German answer definition.
- IDs are ASCII strings matching `[A-Za-z0-9._:-]{1,128}`. Occurrence IDs are unique
  within a session; repeated source content is allowed under different occurrence
  IDs. A session ID collision conflicts and never overwrites an existing record.
- Resource bounds: 1–100 occurrences; prompts 1–4,000 UTF-16 code units with
  non-whitespace text, well-formed Unicode, and no control/format characters except
  tab/CR/LF. Content ID/version use the ID bounds. Answer definitions retain
  D-03's 1,000-unit / 20-variant bounds and validity rules. These are engineering
  bounds, not approved pedagogical session presets.
- Reject unknown schema fields, malformed input, duplicate occurrence IDs, and
  invalid answer definitions before creation. Store omitted matcher flags as false
  and omitted variants as an empty array. Caller mutation cannot alter a snapshot.
- Attempts form a contiguous prefix of the item order with unique attempt IDs and
  one outcome per occurrence. No stored revision, status, updatedAt, next-item index,
  or aggregate counters. No revision bounds or redundant-field consistency checks.

### C-02: Time and derived state

- Inject the clock and supply/inject IDs; no system time or randomness in domain
  functions. Valid timestamps are integer UTC milliseconds from 0 through
  8,640,000,000,000,000. Invalid time rejects a new mutation.
- Store valid time as supplied, including backward movement. Sequence order, not
  timestamps, orders attempts. Do not clamp timestamps or require monotonic time.
- Derive status: discarded when discardedAt exists; otherwise completed when every
  item has an attempt; otherwise active. A valid discarded session was explicitly
  stopped before completion. A fully answered record with a discard marker is
  inconsistent and rejected as corrupt.
- Derive last activity time from discardedAt, otherwise the last attempt's time,
  otherwise snapshot creation time. It may move backward when the device clock
  changes. Reading/resuming never changes data. Exact retries and repeat discard
  are no-ops and do not read a new clock value.

### C-03: Submit and retry

- A submission supplies session ID, attempt ID, occurrence ID, and raw learner
  answer. It does not supply an expected revision.
- Load and validate committed state; look up the attempt ID before checking current
  occurrence or terminal state. Within this session, the same ID, occurrence, and
  exact raw answer returns the original result plus the current snapshot without
  writing. Reusing the ID with a different payload conflicts. Time is not part of
  retry equality. Exact committed retries work after completion or discard.
- A new attempt on a terminal session returns a state error. A non-current
  occurrence conflicts. Reload before continuing after a conflict; never silently
  overwrite, skip pending items, or auto-submit the stale answer to a different item.
- Evaluate with D-03/D-04. Only correct/incorrect results create attempts. Invalid
  input or invalid exercise errors never count as wrong or advance the session.
- Store occurrence ID, attempt ID, exact raw answer, matcher result, supplied valid
  timestamp, and `evaluationVersion: de-v1`. Historical results are not regraded on
  resume or against later source content.
- Correct and incorrect saved outcomes both advance. Completion is derived from
  the final attempt, so there is no separate completion update to lose.
- Acknowledge only after transaction completion, not put success. Save failures
  return distinguishable typed outcomes and preserve prior committed state; a
  retry can reuse the attempt ID once the cause permits. Not every storage failure
  is immediately retryable. Unsaved text or a killed tab's pending request is not
  promised recoverable. Future UI must distinguish pending/saved/failed states.

### C-04: Preserve, discard, and report progress

- Unfinished sessions remain resumable indefinitely until explicit discard.
  Inactivity causes **no automatic state change** or deletion. Staleness and archival
  grouping may later be derived for display without mutating stored data; they
  must preserve access to pending work and permit resumption. No stale threshold
  or archive UI is implemented here.
- Discard uses session ID, with no revision precondition. In one transaction it
  reads current state and stores discardedAt, retaining the snapshot and attempts.
  A stale discard is accepted: if another tab just saved an answer, that answer is
  retained. Repeated discard is a no-op; discarding a completed session is a state
  error. If another tab completed the session first, discard returns that error.
- Starting another session never discards or overwrites an existing one. Completed
  and discarded records remain readable; neither has a resumable current item.
  Discard is not erasure. Privacy deletion controls remain a separate slice.
- Derive total, answered, correct, incorrect, and unanswered from the snapshot and
  attempts. Accuracy is null at zero answers, otherwise correct / answered in 0–1,
  without display rounding. No fabricated global mastery, CEFR, streak, vocabulary,
  improvement, or lesson/course-completion metrics.

### C-05: Atomic persistence and connection lifecycle

- IndexedDB database `unpause-languages`, database version 1, store `sessions`,
  keyed by the session ID in the snapshot. Record and database versions are distinct.
  A validated session aggregate is the single authority.
- Create uses add semantics. Mutations read, validate, check current occurrence,
  compute, and write in one readwrite transaction. No network/timer gaps inside it.
  Responses follow transaction completion; errors/abort cannot yield saved output.
- Competing answers to the same occurrence cannot both append: one wins, the other
  conflicts, unless it is the exact committed retry. No last-write-wins or silent
  localStorage/in-memory fallback.
- Distinguish unavailable/denied storage, quota exhaustion, transaction abort, and
  unsupported formats using typed outcomes, not browser-specific message strings.
- On versionchange, close the connection and require reopening for further work.
  Test closure through a deletion request from another connection; this exercises
  existing version-1 lifecycle behavior without implementing a migration.
- Migration-transition and blocked-upgrade tests are deferred until a real upgrade
  is introduced. Keep abort-after-put-success testing now. Do not claim simulated
  future versions prove a working migration.

### C-06: Corrupt data, absent data, and release sequencing

- Validate on read and before write: minimal record schema, unique IDs, contiguous
  attempts, result shape and matched-answer index, individually valid timestamps,
  and discard consistency. Do not re-evaluate saved answers. Local validation is
  not proof that data was produced by a real learner or an anti-tampering boundary.
- Corrupt records return corrupt-data and remain untouched. Listing reports healthy
  sessions and unavailable record IDs/reasons separately. Future record formats
  are reported distinctly and never overwritten or treated as empty storage.
- Known absent session IDs return not-found; empty storage means no saved sessions,
  not proof of a first visit. Browser eviction cannot be distinguished reliably
  from no prior usage without external evidence.
- First use creates database/store version 1. A version-1 database missing its store
  is corrupt. A newer database is unsupported; never delete/recreate it. Test safe
  rejection, not invented migrations. Actual future upgrades need separate contracts.
- Keep data local to the browser/profile/origin: no account, network transfer,
  analytics, health data, service worker, or persistent-storage request in this slice.
- Backup/export and import/recovery are the **next persistence slice**. **No learner
  pilot before they exist, are reviewed, and pass approved checks.** The present
  slice is an internal domain deliverable, not release authorization.

## Implementation and CI boundaries

- Pure session transitions/progress in `src/domain/`; matcher composition and use
  cases in `src/application/`; atomic repository port and one IndexedDB adapter.
  No framework imports in domain/application logic or speculative extra services.
- Use an in-memory repository double for use-case tests and real browser IndexedDB
  for the adapter. New synthetic fixtures/harness assets never enter production.
- New Tier 1 files only. Existing committed contracts and shared support remain
  frozen. Additional coverage after a RED commit belongs in new files.
- Storage browser coverage uses Chromium locally and Chromium, Firefox, and WebKit
  in CI. Keep existing UI/deployment suites and required check names. Run the added
  engine coverage under the existing required `test:e2e` job so failures block it;
  no manual ruleset changes or new external infrastructure are needed.
- A focused storage configuration/harness can isolate these adapter tests. No
  existing test is removed, skipped, or excluded from required execution. CI and
  configuration additions remain protected changes requiring the normal owner
  integrity acknowledgment before merge.
- Playwright WebKit is not iOS Safari certification. Device storage durability
  validation remains separate pre-release work.

## Amended Tier 1 / browser test plan

The owner approved the initial plan with the simplifications and added engine
coverage in this conversation. These groups consolidate that approved scope;
revision tests, monotonic-clock tests, and speculative upgrade tests are removed
before any test is written or frozen.

| Group | Expected behavior | Clauses |
| --- | --- | --- |
| create_and_validate_snapshot | Exact input bounds, stable snapshots, unknown/malformed fields rejected before creation | C-01 |
| preserve_session_identity | Collisions cannot overwrite; separate sessions remain independent | C-01/C-04 |
| record_outcomes_once | Correct/incorrect advance once; final saved attempt derives completion | C-03 |
| reject_invalid_without_progress | Invalid input/exercise/command leaves saved data and counts unchanged | C-03 |
| retry_and_payload_identity | Exact retries return original results, including terminal sessions; changed payload conflicts | C-02/C-03 |
| reject_wrong_occurrence | Non-current answers cannot skip or replace saved work | C-03/C-05 |
| derive_status_and_progress | Minimal data derives status/current item/counts/accuracy without stored duplicates | C-02/C-04 |
| discard_current_saved_state | Discard preserves attempts including recently saved work; repeat is a no-op; completed discard fails | C-04 |
| resume_without_time_mutation | Long inactivity, timezone/day boundaries, and new sessions never expire or archive stored work | C-02/C-04 |
| accept_nonmonotonic_valid_time | Valid backward time is stored unchanged; invalid time fails; no-op retries do not read time | C-02 |
| validate_minimal_history | Reject invalid IDs/order/results/timestamps/discard combinations without regrading history | C-01/C-06 |
| preserve_unreadable_records | Corrupt/future records remain untouched and do not hide healthy sessions | C-06 |
| distinguish_storage_states | Empty/absent/corrupt/missing-store/future-version storage produce distinct safe outcomes | C-05/C-06 |
| acknowledge_only_commit | Pending/aborted writes never resolve as saved; quota/denial fail without fallback or reset | C-03/C-05 |
| generated_transition_sequences | Seeded sequences preserve order, uniqueness, immutability, idempotency, and actual progress | C-01–C-06 |
| browser_reload_round_trip | Actual IndexedDB restores exact snapshots, attempts, and derived next item after reload | C-01–C-06 |
| browser_concurrent_connections | Two same-origin tabs serialize competing answers and preserve committed work on retry/discard | C-03–C-05 |
| browser_abort_and_connection_close | Abort after request success preserves old state; versionchange closes a live connection | C-05/C-06 |

Browser groups run against all three engines in CI. Controlled quota/denial faults
supplement real transactions; they do not replace actual persistence/concurrency
coverage. Browser failure details must remain visible in CI artifacts.

## Execution sequence and gates

1. Record the owner-approved D-05/D-10 versions and authorization; independent
   reviewer checks this consolidated contract and plan. Use the existing protected
   governance acknowledgment and merge process for this documentation PR.
2. Start the implementation branch from the recorded contract. Add importable
   behaviorless seams only as needed for meaningful assertion-based RED; no import
   failures counted as test evidence. Commit new tests separately before implementation.
3. Implement GREEN in small behavior groups. Refactor when useful without editing
   frozen tests. Keep new fixture/harness files separate from shipping content.
4. Verify lint, typecheck, full Vitest, contract suite, all required browser engines,
   build, deployment compatibility, integrity, and domain mutation analysis. Review
   survivors; new counterexamples go in new test files. Verify no harness ships.
5. Report actual commit/results and CI links. Evidence links suffice; no copied
   terminal transcript is an additional gate. Backup/import follows immediately as
   the next persistence slice; broader M1 and the MVP remain incomplete.
