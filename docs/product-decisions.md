# Product Decisions: Unpause Languages

These are the behaviors the tests depend on. The original policy left them open, which would have let an agent decide them silently.

**Status values**
- **PROPOSED**: a recommendation. Not binding. No tests are written against it.
- **APPROVED**: confirmed by the owner. Tests may be written against it.
- **REJECTED**: do not implement.

Every decision below is currently **PROPOSED**. The owner changes a status to APPROVED by editing this file.

**Evidence stance.** Research on how ADHD affects second-language learning is thin: mostly small studies, many with children, and the adult gamification results are mixed. Design choices that are specific to ADHD (D-06, D-07, D-08) are therefore treated as **hypotheses to measure** (see the table at the end), not as established facts.

---

## D-01: Spaced-repetition algorithm
**Status:** PROPOSED
- **Options:** (a) a simple SM-2-style scheduler; (b) FSRS, which models recall more accurately but is more complex.
- **Proposed default:** an SM-2-style scheduler behind a `Scheduler` interface (a pure function of card state, grade, and an injected clock). FSRS can replace it later without changing the interface contract tests.
- **Unlocks:** coverage area A2.

## D-02: Self-rating and confidence
**Status:** PROPOSED
- **Options:** four rating buttons (Anki-style); three; or auto-grading only.
- **Proposed default:** objectively checkable exercises are auto-graded (correct/incorrect), with an optional three-level confidence tap (Missed it / Hard / Easy). Fewer choices should mean less decision load.
- **To define before tests:** the exact mapping from outcome and confidence to scheduler grade.
- **Unlocks:** A2, B.

## D-03: Umlauts and ß in typed answers
**Status:** PROPOSED
- **Proposed default:** compare the learner's answer against the expected answer **and** its transliteration (ä→ae, ö→oe, ü→ue, ß→ss). A transliterated match is accepted as correct, with a gentle note showing the proper spelling.
- **A bare vowel for an umlaut is wrong** (`schon` is not `schön`).
- **Per-item flag** `strictEszett` for pairs where ss and ß are different words (for example `Masse` / `Maße`).
- **Why:** typing umlauts on a non-German keyboard is friction that can end a session.
- **Unlocks:** A1.

## D-04: Letter case versus grammatical case
**Status:** PROPOSED
- **Proposed default:** ignore letter case when matching, with a gentle note about noun capitalization at A1 and A2. Matching is strict only for exercises flagged `testsCapitalization`.
- Grammatical case (Nominativ, Akkusativ, Dativ, Genitiv) is a content tag, handled separately from letter case.
- **Unlocks:** A1.

## D-05: Session model
**Status:** PROPOSED
- **Proposed default:** every answer is persisted immediately. Leaving a session keeps everything answered so far. Unanswered items are never counted. An unfinished session offers "resume" at any time, and only the learner can discard it.
- **Unlocks:** A3, B.

## D-06: Streaks and rewards
**Status:** PROPOSED
- **Proposed default:** no streaks and no loss mechanics. Show cumulative counters only (days practiced, cards learned) that never decrease. Celebration intensity is a setting (Off / Light / Full), chosen in onboarding, default Light.
- **Why:** adult evidence on game features is mixed, and responses seem to vary between people. Making it a setting avoids betting on one answer.
- **Unlocks:** A5, B.

## D-07: Welcome-back after inactivity
**Status:** PROPOSED
- **Proposed default:** the UI never shows an "overdue" count. A comeback session is capped at N due reviews (proposed N = 10), and the rest are spread over the following days. The scheduler may still use lateness internally, since late cards are more likely to be forgotten. Only the *presentation* is guilt-free.
- **Optional:** a "fresh start" action that re-spreads everything.
- **Unlocks:** A2, A5.

## D-08: Session length
**Status:** PROPOSED
- **Proposed default:** length is defined by item count, never by a timer: Quick (5 items), Standard (10), Long (20). No countdown timers anywhere. The learner can end after any item.
- **Unlocks:** B.

## D-09: Content authoring and review
**Status:** PROPOSED
- **Proposed default:** lesson files carry `id`, `level`, `topic`, `prerequisites`, `exercises`, `reviewStatus` (`draft` | `reviewed`), `reviewer`, and `reviewedAt`. LLM-assisted drafting is allowed, but drafts are never promoted automatically. The owner reviews A1 to B1 content first. The build fails if `draft` content ships.
- **Optional:** a German spelling and grammar linter in CI as a non-blocking report.
- **Why:** tests verify the engine, not the German. A wrong grammar explanation would pass every test.
- **Unlocks:** A6.

## D-10: Persistence
**Status:** PROPOSED
- **Proposed default:** local-first storage (IndexedDB), no accounts in the MVP, versioned schema with forward migrations. JSON export/import as a later backup option.
- **Unlocks:** A4.

## D-11: Measurement and privacy
**Status:** PROPOSED
- **Proposed default:** metrics are local-only by default, with an opt-in anonymous aggregate. The app never asks for or stores an ADHD diagnosis, because health data carries extra obligations under GDPR. Confirm the approach with a qualified professional before launching in the EU; this is not legal advice.
- **Metrics (exact definitions set in M5):** session completion rate; return after a lapse of 7 or more days; recall rate on the first review after 7 or more days.
- **Unlocks:** E.

---

## Hypotheses to measure

| ID | Hypothesis | Related decision | Signal |
|---|---|---|---|
| H1 | Capped, guilt-free comeback sessions raise return rate after a lapse | D-07 | Return after 7+ day lapse |
| H2 | Accepting transliterated umlauts reduces abandonment from typing friction | D-03 | Session completion; abandoned sessions with a typing error as the last action |
| H3 | Short, fixed-length sessions raise completion | D-08 | Session completion by length chosen |
| H4 | Preferred reward intensity differs between learners, and no single setting wins | D-06 | Retention by setting |

Test with a small group of volunteers who describe themselves as having ADHD (no diagnosis required or recorded), plus the opt-in aggregate metrics.
