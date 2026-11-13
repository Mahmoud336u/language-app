# Product Decisions: Unpause Languages

These are the behaviors the tests depend on. The original policy left them open, which would have let an agent decide them silently.

**Status values**
- **PROPOSED**: a recommendation. Not binding. No tests are written against it.
- **APPROVED**: confirmed by the owner. Tests may be written against it.
- **REJECTED**: do not implement.

D-03 and D-04 are owner-approved implementation contracts. D-05 and D-15 are approved only within their stated direction/scope. Other decisions remain PROPOSED. The owner approved these changes in the current conversation on 2026-11-13; see `docs/reviews/m1-matcher-owner-authorization.md`. Unapproved v2 alternatives remain in `docs/reviews/product-decisions-v2-submitted.md`; they have not been adopted silently.

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

## D-03: Typed German answer matching
**Status:** APPROVED
**Approved by:** @Mahmoud336u
**Approval reference:** https://github.com/Mahmoud336u/language-app/pull/2
**Version:** 1 (2026-11-13)

The owner approved the exact D-03/D-04 contract, examples, Tier 1 test plan, and matcher-only M1 scope from review commit `6a621b1`. Approval was given in the Codex conversation, not inferred from a PR approval badge. The following shared contract is authoritative for both decisions.

| Concern | Approved rule |
| --- | --- |
| Inputs | One canonical answer, optional explicit accepted variants, and boolean `strictEszett` / `testsCapitalization` flags (default false). No inferred synonyms, grammar corrections, or fuzzy matching. |
| Bounds | Maximum 1,000 UTF-16 code units per raw answer and at most 20 additional variants. These are engineering limits requiring approval, not pedagogical values. |
| Normalization | Unicode NFC; trim and collapse runs of space, tab, CR, LF, and nonbreaking space to one ordinary space. No NFKC, punctuation stripping, or diacritic removal. |
| Invalid values | Non-strings, empty normalized answers, unpaired surrogates, and Unicode control/format characters other than the permitted whitespace are invalid. Invalid exercise answers/flags are an exercise error; never grade the learner wrong because content is invalid. |
| Ordinary matching | Compare without letter case using German-locale lowercase, which must preserve ß versus ss and umlauts versus bare vowels. Punctuation and word order remain significant. |
| Transliteration | Generate allowed matches directionally from each authorized answer: ä→ae, ö→oe, ü→ue, ß→ss. Any combination of original and transliterated characters is accepted. Do not reverse-expand ordinary `ae/oe/ue/ss` already present in an expected answer. |
| Strict ß | `strictEszett` prevents ß/ẞ substitution; other umlaut substitutions remain available. Thus expected `Maße` rejects `Masse` when strict. |
| Strict capitalization | Preserve the case of ordinary letters. Uppercase Ä/Ö/Ü allow Ae/AE, Oe/OE, Ue/UE respectively; lowercase forms allow only ae/oe/ue. Uppercase ẞ allows SS only when ß substitution is permitted. For expected `Äpfel`, `Aepfel` and `AEpfel` pass but `aepfel` fails. |
| Feedback data | Return correct / incorrect / invalid-input / invalid-exercise, an authorized matched-answer reference when correct, and separate transliteration/case-difference indicators. No scores, persistence, or scheduler grades. |
| Result preference | Try all authorized answers before selecting feedback: normalized exact match first, then case-only match, then a transliteration match. Within a class, canonical answer precedes variants in supplied order. Duplicate normalized variants do not duplicate results. |
| Case notes | Expose letter-case differences without claiming the word is a noun. The future UI may show a neutral spelling reminder at A1/A2; noun-specific explanations require reviewed content metadata. No feedback copy is implemented in this domain slice. |


- **Unlocks:** the pure typed-answer matcher only. Character-key UI, exercise delivery, score recording, persistence, sessions, and scheduling remain outside this approval.
- **Approved fixtures/test plan:** the examples and nine test-plan groups in `docs/reviews/product-decisions-v2-review.md` at `6a621b1`. They are test-only data, not reviewed shipping lessons.

## D-04: Letter case versus grammatical case
**Status:** APPROVED
**Approved by:** @Mahmoud336u
**Approval reference:** https://github.com/Mahmoud336u/language-app/pull/2
**Version:** 1 (2026-11-13)

- Uses the exact shared matcher contract under D-03, including ordinary/strict capitalization and separate case-difference/transliteration feedback.
- Grammatical case (Nominativ, Akkusativ, Dativ, Genitiv) remains content metadata, separate from letter case. The matcher infers neither noun identity nor grammatical correctness.
- Future A1/A2 UI reminders require the later UI slice; no learner-facing copy or content schema is approved here.

## D-05: Preservation of unfinished sessions
**Status:** APPROVED
**Approved by:** @Mahmoud336u
**Approval reference:** https://github.com/Mahmoud336u/language-app/pull/2
**Version:** 1 (2026-11-13)
**Approval scope:** preservation direction only; no session/persistence implementation authorized.

- Unfinished sessions remain resumable until the learner explicitly discards them.
- Any future automatic archive must preserve pending items and permit resumption. No automatic seven-day deletion or dropping unanswered items.
- Answer-write semantics, atomicity, failure recovery, discard effects, and session counting require their own exact approved contract with D-10. The earlier immediate-persistence proposal remains unimplemented.

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

## D-15: A1 pilot scope
**Status:** APPROVED
**Approved by:** @Mahmoud336u
**Approval reference:** https://github.com/Mahmoud336u/language-app/pull/2
**Version:** 1 (2026-11-13)
**Approval scope:** initial course scope only; no course implementation or publication authorized.

- Begin with one reviewed A1 pilot course. A2–B2 remain on the roadmap.
- Lesson count is not approved; the 8–10 estimate remains a placeholder.
- Content review, pilot/public release gates, course objectives, and the detailed curriculum still need their respective contracts and reviews.

---

## Hypotheses to measure

| ID | Hypothesis | Related decision | Signal |
|---|---|---|---|
| H1 | Capped, guilt-free comeback sessions raise return rate after a lapse | D-07 | Return after 7+ day lapse |
| H2 | Accepting transliterated umlauts reduces abandonment from typing friction | D-03 | Session completion; abandoned sessions with a typing error as the last action |
| H3 | Short, fixed-length sessions raise completion | D-08 | Session completion by length chosen |
| H4 | Preferred reward intensity differs between learners, and no single setting wins | D-06 | Retention by setting |

Test with a small group of volunteers who describe themselves as having ADHD (no diagnosis required or recorded), plus the opt-in aggregate metrics.
