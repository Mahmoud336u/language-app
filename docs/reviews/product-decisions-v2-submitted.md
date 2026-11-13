# Product Decisions: Unpause Languages (v2)

These are the behaviors the tests depend on. Product behavior is decided here, by the owner, and never by a coding agent.

**Status values**
- **PROPOSED**: a recommendation. Not binding. No tests are written against it.
- **APPROVED**: confirmed by the owner. Tests may be written against it.
- **REJECTED**: do not implement.

Every decision below is currently **PROPOSED**. The owner changes a status to APPROVED by editing this file.

**Version 2 rule:** a recommendation here is kept only while the evidence supports it. When new evidence contradicts a decision, the decision is changed and the change is logged in "What changed from v1" below, with the reason. Placeholders (numbers with no evidence behind them) are marked as such.

**Evidence stance.** Research on how ADHD affects second-language learning is thin: mostly small studies, many with children, and the adult gamification results are mixed. Design choices specific to ADHD (D-05, D-06, D-07, D-08, D-12) are **hypotheses to measure**, not established facts. Sources and their limits are listed at the end.

---

## D-01: Spaced-repetition algorithm
**Status:** PROPOSED. **Changed from v1** (was SM-2).
- **Options:** (a) a simple SM-2-style scheduler; (b) FSRS, which models recall more accurately but is more complex.
- **Proposed default:** FSRS with its default parameters, behind a `Scheduler` interface (a pure function of card state, grade, and an injected clock). Per-learner parameter optimization is a later step; it needs a lot of review history per learner.
- **Why it changed:** in the public open-spaced-repetition benchmark, FSRS predicts recall better than SM-2 for nearly all tested users, even with defaults. Review load is this product's central problem, so efficiency is the right lever. The efficiency numbers are simulation-based and the benchmark favors FSRS structurally (see "Sources and confidence"), so this is a moderate-confidence call, not a certain one.
- **Gate before APPROVED:** verify the license and maintenance status of the TypeScript FSRS implementation (a library named `ts-fsrs` exists; confirm before relying on it). **Fallback:** an SM-2-style scheduler behind the same interface.
- **Testing rule:** freeze **properties**, not library-specific numbers: Again shortens the next interval, Good lengthens it, due-card selection is correct, recording a review twice changes nothing, state survives a reload. Any golden vectors live in their own file, pinned to the library version. Upgrading the library is an owner decision, handled as a Tier 1 change request.
- **Unlocks:** A2.

## D-02: Grading and self-rating
**Status:** PROPOSED. **Changed from v1** (was an optional three-level confidence tap).
- **Options:** four rating buttons (Anki-style); three; auto-grading only.
- **Proposed default:** auto-grade only. Correct maps to Good, incorrect maps to Again. A transliterated match (D-03) counts as correct and maps to Good.
- **Why it changed:** the scheduler uses four grades, and auto-grading gives two. The confidence tap was an unvalidated bet on "fewer choices means less load", and it added state to freeze. It can be added later behind the same interface if testing shows a need.
- **To define before tests:** how a new item's first exposure is recorded.
- **Unlocks:** A2, B.

## D-03: Umlauts and ß in typed answers
**Status:** PROPOSED. **Kept**, one addition.
- **Proposed default:** compare the learner's answer against the expected answer **and** its transliteration (ä→ae, ö→oe, ü→ue, ß→ss). A transliterated match is accepted as correct, with a gentle note showing the proper spelling.
- **A bare vowel for an umlaut is wrong** (`schon` is not `schön`).
- **Per-item flag** `strictEszett` for pairs where ss and ß are different words (for example `Masse` / `Maße`).
- **Added:** on-screen ä, ö, ü, ß keys beside the answer field. They remove typing friction without lowering the standard. (ss is also the standard spelling in Switzerland.)
- **Unlocks:** A1, B.

## D-04: Letter case versus grammatical case
**Status:** PROPOSED. **Kept.**
- **Proposed default:** ignore letter case when matching, with a gentle note about noun capitalization at A1 and A2. Matching is strict only for exercises flagged `testsCapitalization`.
- Grammatical case (Nominativ, Akkusativ, Dativ, Genitiv) is a content tag, handled separately from letter case.
- **Unlocks:** A1.

## D-05: Session model
**Status:** PROPOSED. **Refined from v1.**
- **Proposed default:** every answer is persisted immediately. Leaving a session keeps everything answered so far. Unanswered items are never counted. An unfinished session offers "resume".
- **Added:** an unfinished session older than 7 days (placeholder value) is archived quietly. Answered items are kept and counted, unanswered items are dropped without being marked as failed, and the learner can still discard it by hand.
- **Why:** resuming a weeks-old half-finished session risks recreating the pile-up this product is meant to avoid.
- **Unlocks:** A3, B.

## D-06: Streaks and rewards
**Status:** PROPOSED. **Simplified from v1** (was Off / Light / Full).
- **Proposed default:** no streaks and no loss mechanics. Show cumulative counters only (days practiced, cards learned) that never decrease. Celebration intensity is a setting with two levels, Off and Light, chosen in onboarding, default Light. A "Full" level is added only if user testing shows demand.
- The operating system's reduced-motion preference always turns animation off, whatever the setting.
- **Why:** adult evidence on game features is mixed, so making it a setting is safer than betting on one answer. A third level adds design and test surface with no evidence behind it.
- **Unlocks:** A5, B.

## D-07: Welcome-back and session composition
**Status:** PROPOSED. **Refined from v1** (the separate cap of 10 is removed).
- **Proposed default:** the UI never shows an "overdue" count. A session of the chosen length (D-08) takes due cards first, ordered by lowest predicted recall, then fills any remaining room with new items under D-12. After a long absence, the learner sees "welcome back" and today's set, never a backlog number.
- The scheduler may still use lateness internally, since late cards are more likely to be forgotten. Only the *presentation* is guilt-free.
- **Trade-off:** hiding the backlog also hides forgetting. Watch recall on first review after a lapse (D-11).
- **Why the cap was removed:** N = 10 was an arbitrary number that duplicated the session length.
- **Unlocks:** A2, A5.

## D-08: Session length
**Status:** PROPOSED. **Kept.**
- **Proposed default:** length is defined by item count, never by a timer: Quick (5 items), Standard (10), Long (20). No countdown timers anywhere. The learner can end after any item.
- **Unlocks:** B.

## D-09: Content authoring and review
**Status:** PROPOSED. **Strengthened.**
- **Proposed default:** lesson files carry `id`, `level`, `topic`, `prerequisites`, `exercises`, `reviewStatus` (`draft` | `reviewed`), `reviewer`, and `reviewedAt`. LLM-assisted drafting is allowed, but drafts are never promoted automatically. The build fails if `draft` content ships.
- **Review tiers:** the owner reviews content for development and a small pilot. **A native German speaker or teacher reviews it before any public release.** The owner is a learner, not a native speaker, so self-review is not enough for content that others will study.
- **Optional:** a German spelling and grammar linter in CI as a non-blocking report.
- **Why:** tests verify the engine, not the German. A wrong grammar explanation would pass every test.
- **Unlocks:** A6.

## D-10: Persistence
**Status:** PROPOSED. **Changed from v1. BLOCKS the persistence tests (A4).**
- **The problem:** Safari deletes IndexedDB and other script-writable storage after seven days without interaction with the site, and this applies to every browser on iOS. Web apps added to the home screen are exempt. Learners who lapse for weeks, on iPhone, could silently lose all progress. That would break the invariant "learner-visible progress never decreases through inactivity".
- **Proposed default:** an installable PWA with IndexedDB storage, a versioned schema with forward migrations, and no accounts in the MVP. Onboarding prompts iOS users to add the app to the home screen. JSON export and import are in the MVP, with a gentle backup reminder.
- **Honest limit:** an emptied store looks the same as a first visit, so the app cannot detect eviction on its own. First run therefore asks "Have you used Unpause before?" and offers import. Whether this is enough, or whether optional sync (accounts) or a native wrapper is needed, is decided after real usage.
- **Verify before APPROVED:** the evidence for this is from 2020 to 2022. Re-test the behavior on a current iOS version.
- **New contract tests (A4):** restoring from an export reproduces the exact prior state; a store that is empty after prior use shows the import path, not a silent restart.
- **Unlocks:** A4. **Depends on:** D-13.

## D-11: Measurement and privacy
**Status:** PROPOSED. **Kept, expectations reset.**
- **Proposed default:** metrics are local-only by default, with an opt-in anonymous aggregate. The app never asks for or stores an ADHD diagnosis. Marketing the app to people with ADHD may itself make usage data look health-related, so confirm the approach with a qualified professional before launching in the EU; this is not legal advice.
- **Metrics (exact definitions set in M5):** session completion rate; return after a lapse of 7 or more days; recall rate on the first review after 7 or more days.
- **Expectation reset:** with a handful of volunteers and low opt-in rates, the metrics cannot support statistical conclusions. Until there are hundreds of users, treat H1 to H4 as qualitative questions for user tests.
- **Unlocks:** E.

## D-12: New-item pacing (NEW)
**Status:** PROPOSED.
- **Proposed default:** new items are introduced only after due reviews in the session (D-07), and at most one item in three is new, rounded down (Quick 1, Standard 3, Long 6). If the due cards fill the session, no new items appear.
- **Why:** introducing new items faster than they can be reviewed is what builds a backlog. The "one in three" rate is a **placeholder** to calibrate in user tests.
- **Unlocks:** A2, A3.

## D-13: Target platform (NEW)
**Status:** PROPOSED.
- **Proposed default:** a responsive, mobile-first web app delivered as an installable PWA. A native wrapper is deferred. UI language for the MVP is English (to confirm); Arabic and right-to-left support are deferred.
- **Why:** it keeps the stack you chose and works with D-10. The main cost is the iOS install friction described there.

## D-14: Audio (NEW)
**Status:** PROPOSED.
- **Proposed default:** optional text-to-speech for words and sentences using the browser's speech synthesis. No recording or speech recognition in the MVP. Text-to-speech is a convenience, not an authority on pronunciation.
- **Verify before APPROVED:** the availability and quality of German voices differ by device. Check on the target devices.

## D-15: MVP content scope (NEW)
**Status:** PROPOSED.
- **Proposed default:** one CEFR level (A1) with one small course, enough to test the full loop. The lesson count (placeholder: 8 to 10) is set by what the owner can review and the user test needs. More levels come after user tests.
- **Unlocks:** A6, D.

---

## Hypotheses to measure

| ID | Hypothesis | Related decision | Signal |
|---|---|---|---|
| H1 | Sessions that never show an overdue count raise return rate after a lapse | D-07 | Return after 7+ day lapse |
| H2 | Accepting transliterated umlauts, plus on-screen keys, reduces abandonment from typing friction | D-03 | Session completion; abandoned sessions with a typing error as the last action |
| H3 | Short, fixed-length sessions raise completion | D-08 | Session completion by length chosen |
| H4 | Reward intensity preference differs between learners (Off vs Light) | D-06 | Retention by setting |
| H5 | The "one in three new" pacing keeps backlog manageable without stalling progress | D-12 | Due-card counts over time; learner-reported pace |

Test with a small group of volunteers who describe themselves as having ADHD (no diagnosis required or recorded). See D-11 for what the numbers can and cannot show.

## What changed from v1

| Decision | Change | Trigger |
|---|---|---|
| D-01 | SM-2 to FSRS (defaults, behind the interface) | Public benchmark favors FSRS; review efficiency matters most here |
| D-02 | Confidence tap removed | Scheduler needs four grades; the tap was an unvalidated bet |
| D-03 | On-screen special-character keys added | Reduces friction without lowering the standard |
| D-05 | Quiet archive of stale sessions | Stale resumes could recreate the pile-up |
| D-06 | Three reward levels reduced to two | No evidence for a third; extra test surface |
| D-07 | Separate cap of 10 removed; composition rule added | The cap duplicated the session length |
| D-09 | Native review required before public release | Self-review by a learner is not enough |
| D-10 | Browser-only storage replaced by a PWA-first plan with export and import | Safari deletes script-writable storage after 7 days |
| D-11 | Metrics reframed as qualitative first | Small samples cannot show statistical effects |
| D-12 to D-15 | New | Gaps the v1 list left open |

## Approval order

- **Approve now:** D-03, D-04, D-08.
- **After the refinements above:** D-05, D-09.
- **Review together as one scheduler and session spec:** D-01, D-02, D-07, D-12.
- **Before the M1 persistence tests:** D-10, D-13.
- **Later:** D-06 and D-11 (before M3 and M5), D-14 and D-15 (before M2 and M3).

## Sources and confidence

- **FSRS versus SM-2.** The open-spaced-repetition benchmark is public and reproducible. It reports FSRS predicting recall more accurately than SM-2 for about 99.5% of the roughly 10,000 Anki collections tested. Limits: SM-2 was never designed to output recall probabilities, so the comparison is slanted against it; the "20 to 30% fewer reviews" figure comes from simulation, and blogs quote anywhere from 20-30% up to 30-50%, so no efficiency number is used as a design input; the data comes from Anki users, not from language-app learners. Confidence: moderate.
- **Safari storage.** WebKit's Intelligent Tracking Prevention has capped script-writable storage at seven days of Safari use without interaction since Safari 13.1 and iOS 13.4, and WebKit's own statements exempt home-screen web apps. The sources are from 2020 to 2022. Confidence: high that the rule existed, unverified for current iOS versions.
- **ADHD design hypotheses.** Thin evidence, as described above. The adult study results that exist show no difference in learning mechanics between adults with and without ADHD, which is why retention and re-entry are the design focus. One thesis on an artificial language, so not strong.
- **Design judgment, not evidence.** The numbers in D-05 (7 days), D-12 (one in three) and D-15 (8 to 10 lessons) are placeholders to calibrate in testing.