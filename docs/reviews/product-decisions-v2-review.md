# Product decisions v2 — review and proposed first M1 contract

Date: 2026-11-13. Status: **PROPOSED — owner decision pending**.

The owner supplied [v2](product-decisions-v2-submitted.md) with “here is some
chooses” and asked to continue. That file still marks every decision PROPOSED.
Its “Approve now” section is a recommendation inside the supplied document, not
an explicit owner approval. This review does not promote any decision or authorize
implementation. The canonical `docs/product-decisions.md` is unchanged.

M0 PR #1 was merged with its history preserved at `59f3054`. This documentation
branch starts there. Branch rules, identity separation, and an actual rejected
tamper PR remain separately unverified; merging M0 alone does not prove enforcement.

## Recommendation by decision

| Decision | Assessment and next action |
| --- | --- |
| D-01 FSRS | Credible candidate, but approve a named library/model version and exact parameters, retention target, learning steps, rounding, and fuzz policy. Do not freeze unspecified “defaults.” |
| D-02 Auto-grading | Recommend correct → Good and incorrect → Again. Invalid input/configuration is not an incorrect review. Define first exposure, retries, and review identity with the scheduler slice. |
| D-03 Transliteration | Recommend the first M1 slice, with the exact matcher rules below. On-screen character keys are a later UI task. |
| D-04 Capitalization | Recommend the same slice. Distinguish letter-case feedback from claims about nouns or grammatical case. |
| D-05 Sessions | Do not drop unfinished items automatically after seven days. Prefer keeping sessions resumable until the learner discards them; a later archive can be reversible and preserve pending items. |
| D-06 Rewards | Off/Light and an OS reduced-motion override are reasonable. Defer implementation; define cumulative counters before contracts. |
| D-07 Composition | Review with D-01/D-02/D-12. Define lapse threshold, deterministic ties, prerequisites, repeats, and handling when eligible items run out. Lowest recall first can repeatedly crowd out new material. |
| D-08 Length | Recommend 5/10/20 as maximum item counts, no timer, and safe early exit. Define whether repeated attempts count before implementation. No approval is needed for this decision to build only the matcher. |
| D-09 Content | Recommend teacher/qualified reviewer approval before public release. Represent pilot versus public approval and exact reviewed revision; the shipping gate must not treat pilot approval as public approval. |
| D-10 Storage | Keep pending current-device validation and an exact recovery/import contract. PWA installation is mitigation, not a guarantee against loss. See evidence below. |
| D-11 Measurement | Keep local-only initially. Defer remote aggregates. Statistical usefulness depends on study design, effect size, and data quality, not a universal “hundreds of users” cutoff. |
| D-12 Pacing | Keep pending: with zero due reviews, the literal rule gives only 1/3/6 new items, so a 5/10/20 session must end early or use a separately approved exception. Specify this deliberately. |
| D-13 Platform | Responsive English web UI fits the current foundation. PWA/offline caching and browser-to-install migration need their own review; English, PWA, and deferred Arabic are separate choices. |
| D-14 Audio | Defer until device voice availability, offline behavior, and provider/privacy behavior have been checked. Missing German voices need a usable fallback; no recording is proposed. |
| D-15 A1 pilot | Recommend one small reviewed A1 course for the pilot, retaining A1–B2 as the roadmap. This changes the original launch scope and needs an explicit owner choice before course work. Lesson count remains a planning placeholder. |

The seven-day archive, one-third pacing, session sizes, and course count are product
choices to evaluate, not evidence-backed therapeutic prescriptions. No ADHD-specific
effectiveness claim follows from them. The submitted benchmark percentages and
research summaries have not been independently reproduced in this review.

## Verified external evidence and limits

- WebKit's [2020 storage announcement](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
  describes seven days of **Safari use** without site interaction, rather than
  seven elapsed calendar days. It describes different treatment for Home Screen
  apps. This verifies the historical rule, not current-device behavior.
- WebKit's [2023 storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
  documents storage-pressure eviction and the Storage API from Safari/iOS 17.
  Persistent storage can be requested, with heuristic granting. Installed web
  apps still require recovery planning. Neither installation nor a service worker
  is an independent backup. Real iOS tests have **not** been run here.
- The `ts-fsrs` npm metadata returned version **6.0.0**, license **MIT**, repository
  `open-spaced-repetition/ts-fsrs`, and modification time `2026-10-28T14:11:50.618Z`.
  Its [6.0.0 release notes](https://open-spaced-repetition.github.io/ts-fsrs/updates/fsrs/6.0.0)
  document a new default FSRS-7 model, retained FSRS-6 APIs, and breaking changes.
  This is evidence of a recent release, not a completed dependency/security audit,
  guarantee of future maintenance, or browser-bundle compatibility test. No package
  was installed. Version and model need separate approval.

Recommended D-10 clarification: every empty store offers both new setup and import.
Without independent evidence, the app cannot infer whether an empty store means
first use or total data loss. Tests should exercise the same recovery choices for
both conditions, rather than require impossible detection. Retain answers on write
failure, distinguish failed writes from committed attempts, validate imports before
an atomic restore, and define merge-versus-replace and export schema compatibility
before freezing persistence tests. Keep the original learner-protection invariant;
do not quietly narrow it to conceal platform loss. Any qualified product promise
requires an explicit owner-reviewed amendment.

Recommended scheduler clarification: idempotent review recording belongs to the
application/persistence boundary, not automatically to the FSRS library. “Again
shortens” and “Good lengthens” need a specified comparison and state domain; they
are not assumed universal across initial learning, relearning, and elapsed-time
changes. Pin exact adapter vectors alongside suitable invariants when that slice
is approved. A version upgrade never grants permission to edit frozen tests.

## Adversarial architecture review

Proposal: accept v2 as a planning input and implement only a pure typed-answer
matcher after owner approval. Keep scheduler, storage, session policies, PWA,
curriculum, character-key UI, and audio out of that slice.

| Risk | Trigger and failure | User impact / severity | Mitigation |
| --- | --- | --- | --- |
| False answer acceptance | Symmetric transliteration or aggressive Unicode folding equates distinct words or confusable letters | Incorrect feedback and misleading progress; high | Directional matching from authorized answers, explicit strict ß, NFC only, adversarial rejection cases |
| Premature contracts | Tests infer missing whitespace, capitalization, or feedback rules | Wrong behavior becomes expensive to correct; high | Approve the exact rule table and Tier 1 plan before RED |
| Hidden loss of work | Age-based archive drops unanswered session state | Returning learner cannot resume intended work; high | Keep the existing preservation direction; choose reversible archiving separately |
| False durability promise | Storage eviction, user clearing, or browser-to-installed storage differences remove data | Loss of retained progress; critical | Device validation, explicit recovery/import semantics, backups, no install-based guarantee |
| Unstable scheduler/composition | Dependency defaults change or weakest-card-first consumes every short session | Review load and progression change unexpectedly; high | Pin model/config, simulate edge cases, specify pacing separately from matching |

Concrete failure: a learner answers `Masse` for expected `Maße` in an item marked
`strictEszett`. A generic “normalize both strings” helper replaces ß with ss and
accepts it. The session records a correct answer and later lengthens the review
interval. The matcher must reject this pair before the scheduler exists; downstream
components must not reinterpret an incorrect result as a successful attempt.

Lower-complexity alternative: one pure matcher module with explicit accepted
answers and flags, imported by future use cases. No configurable matching language,
plugins, fuzzy spelling engine, AI, scheduler dependency, content delivery, or
database. It supports reliable feedback while postponing recovery and learning-load
uncertainty. The trade-off is that it cannot yet deliver a full learning session.

Three behavioral invariants for the proposed slice:

1. Identical valid inputs yield identical results without time, randomness, network,
   mutation, or persistence.
2. Acceptance comes only from an explicit authorized answer under approved rules;
   bare vowels, confusable letters, missing words, and strict ß distinctions cannot
   become correct through normalization.
3. Invalid learner input and invalid exercise definitions remain distinguishable
   from an ordinary wrong answer. The matcher changes no progress or scheduler state.

Two adversarial testing scenarios:

1. Combine mixed transliteration, case differences, NFC-decomposed text, and strict
   flags; verify correct classification without reverse transliteration, confusable
   folding, or strict ß/capitalization bypass.
2. Supply malformed values, huge strings, invisible controls, and malformed accepted
   answers; return bounded deterministic validation results and preserve all inputs.

Learner-facing acceptance criterion for a later integrated UI: under ordinary
matching, `schoen` for `schön` receives correct feedback with the canonical spelling,
while `schon` receives incorrect feedback. These are illustrative test fixtures,
not reviewed shipping lessons; owner review of expected outcomes precedes freezing.

Technical verdict: **VALIDATE FIRST**. The owner must approve exact matcher semantics
and the plan below before domain tests or implementation. The verdict is advisory.

## Exact proposed D-03/D-04 contract for the first slice

These details are new recommendations, not assumptions that v2 already approves.

| Concern | Proposed rule |
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

Illustrative outcomes requiring owner review:

| Expected | Learner input | Flags | Expected outcome |
| --- | --- | --- | --- |
| `schön` | `schoen` | default | correct, transliteration indicator |
| `schön` | `schon` | default | incorrect |
| `Süß` | `Suess` or `Süss` | default | correct, transliteration indicator |
| `Maße` | `Masse` | strict ß | incorrect |
| `Masse` | `Maße` | default | incorrect; no reverse expansion |
| `Haus` | `haus` | default | correct, case-difference indicator |
| `Haus` | `haus` | strict capitalization | incorrect |
| `Hallo!` | `Hallo` | default | incorrect unless explicitly listed as a variant |
| `Guten Tag` | leading/trailing or repeated permitted whitespace | default | correct after normalization |

## Proposed Tier 1 plan and implementation sequence

No tests have been written for these rules. Review names and outcomes before RED:

1. `canonical_and_explicit_variants`: accepts only authorized answers and returns a stable matched-answer reference.
2. `nfc_and_whitespace`: normalizes only the permitted equivalences, including decomposed umlauts.
3. `directional_mixed_transliteration`: accepts full and partial forward substitutions, rejects reverse invention and bare vowels.
4. `strict_eszett`: preserves ß/ss distinctions while allowing independent umlaut substitutions.
5. `letter_case_modes`: verifies ordinary/strict capitalization, uppercase transliteration, and ß-preserving lowercase.
6. `punctuation_order_and_confusables`: rejects unlisted punctuation changes, reordered words, and visually similar different characters.
7. `invalid_inputs_and_bounds`: distinguishes invalid input/content and verifies exact size/variant boundaries.
8. `feedback_precedence`: chooses exact over approximate matches and reports combined indicators accurately.
9. `deterministic_no_mutation`: seeded properties check stability, input preservation, and no unauthorized acceptance.

After explicit approval: record only the approved decision versions and owner
provenance; land the protected decision update through owner review; write and run
the new Tier 1 tests to meaningful RED; commit them alone; implement minimal pure
code; reach GREEN; refactor separately; run all required quality gates and the M1
mutation check. No existing contracts are edited. Broader exercise types, scoring,
and idempotent attempts belong to later reviewed slices.

## Exactly three consequential owner questions

1. **Matching correctness:** Do you approve the exact D-03/D-04 contract, examples,
   Tier 1 plan, and matcher-only M1 scope above, with character-key UI deferred?
2. **State preservation:** Should D-05 retain resumability until explicit learner
   discard, with any future age-based archive preserving all pending items?
3. **Learner scope:** Should D-15 replace the initial A1–B2 release scope with one
   reviewed A1 pilot course, while A2–B2 remain on the roadmap?

Recommendation: yes to all three, as separate owner choices. Answering question 1
does not approve a scheduler, persistence/PWA, the other product decisions, or a
public release. Questions 2 and 3 settle direction only; their detailed contracts
and architecture reviews still precede implementation. D-08 can wait for sessions.

Approval is needed because [AGENTS.md rule 5](../../AGENTS.md) says, “Never decide
product behavior yourself,” and [policy §3](../tdd-policy.md) requires owner review
of the Tier 1 plan before freezing tests. This supplied file expressly retains
PROPOSED status; this review cannot turn its recommendations into owner decisions.
