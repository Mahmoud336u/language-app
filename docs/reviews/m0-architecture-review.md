# Unpause Languages — M0 architecture review and approval proposal

Date: 12 November 2026. Status: PROPOSED; owner authorization pending.

This is a planning deliverable, stored outside the inspected repository. It does not approve product decisions, amend governance, establish frozen tests, or authorize implementation. The owner's current request authorizes inspection and planning and expressly requires a stop before M0 implementation. The attachments supply governance because the owner explicitly adopted them; their instructions are distinguished below from observed repository facts and new recommendations.

## 1. Repository and Governance Assessment

### Verified repository facts

- Inspected checkout: `/workspace/language-app`; remote: `https://github.com/Mahmoud336u/language-app.git`.
- Branch: `work`. HEAD and locally recorded `origin/main`: `eb0f268a9f8cd0ec5e94df147c4840944facc36e` (`Initial commit`). The checkout is not shallow. Working tree is clean.
- Tracked files: `README.md` and `LICENSE` only. The license is MIT. No application, package manifest, lockfile, tests, CI, integrity checker, or project configuration is present.
- No `unpause-languages` checkout was found. Both a repository search scoped to the current owner and a connected-installation search returned no matching repository. This does not prove an inaccessible repository does not exist.
- GitHub metadata reports a private repository with `main` as default branch. Squash, rebase, and merge commits are all enabled. Branch protection, billing-plan support, and required checks remain unverified.
- The GitHub connector reports `admin: true` for its authenticated identity. This violates the intended non-admin-agent enforcement boundary. No administrative action was taken.
- Runtime inventory: Node `24.22.1`, npm `11.9.0`, Git `2.52.0`. No dependency installation or compatibility build has been performed.

### Governance read in full

All 417 lines across the supplied documents were read: AGENTS.md (30), tdd-policy.md (293), product-decisions.md (94). They exist as unchanged downloaded attachments, not at their designated repository locations. All D-01 through D-11 statuses are PROPOSED.

The adopted rules require owner authorization before material implementation; owner-approved product decisions before behavioral contracts; owner review before freezing Tier 1 tests; separate RED/GREEN/REFACTOR commits; protected-test change requests; reviewed German content; and real quality gates. A technical verdict does not authorize work. This review obeys the requested explicit test-plan approval gate rather than relying on the policy's owner-unavailable fallback.

### Governance weaknesses and proposed amendments — not applied

**G-01: Protection from the first commit.** Replace the main-only rule in policy §10 with: “A Tier 1 file, fixture, or expected-output file becomes frozen at its first committed appearance, including on a feature branch. Inspect every reachable branch commit and merge-parent change since the trusted base. Reject subsequent modifications, deletions, renames, type changes, and delete/re-add sequences without the §4 exception. A later revert does not erase a violation. New unchanged files remain allowed. Missing history or indeterminate provenance fails closed.” Include shared test helpers and imported test support in the protected boundary. Test histories with multiple parents explicitly; a final merge-base diff is insufficient.

**G-02: Tier 2 owner provenance.** Add: “Each revision must be isolated in a dedicated commit with `Decision: D-xx`, and the cited decision version must already be APPROVED by the owner in trusted base history. Record the owner identity and approval reference with that version. Agent-authored status changes or trailers are not proof of approval. A revised decision is approved separately before its dependent test-revision PR. List changed tests and decision versions in CI. Snapshot/baseline diffs require owner review. Accessibility assertions may only tighten; other learner-protection removals or weakenings require §4 authorization.” This preserves routine Tier 2 revisions without a new per-revision approval request when the approved decision already covers them. Automation checks provenance and scope; humans still review whether assertions were semantically weakened.

**G-03: Safe trusted inspection.** Replace “only fetch and run git diff” with a precisely bounded permission to fetch objects and read commit metadata, trees, and blobs using trusted Git commands and the checker from the base branch. No PR checkout, dependency installation, hooks, filters, external diff drivers, PR scripts, or PR actions execute in the integrity job. Disable Git hooks, external diff, and text conversion; handle filenames safely and pass validated SHAs as arguments. Use read-only credentials, no secrets, and no privileged artifact/cache consumption. Run all application tests separately under `pull_request`.

**G-04: Protect the enforcement surface and history.** Explicitly protect package scripts, runner discovery, coverage settings, shared fixtures/helpers, workflow dependencies, and the checker’s own tests. Reject unapproved changes conservatively rather than claiming a diff parser can prove semantic safety. Preserve RED history through merge commits; disable squash/rebase merging and force-push on active feature branches with committed tests. Retain CI run/head evidence. A checker cannot reconstruct commits erased before it observes them; branch rules and owner review remain essential.

**G-05: Bootstrap and exceptions.** Record a one-time owner-controlled bootstrap for landing the trusted checker/workflows: existing `main` cannot enforce a checker that does not yet exist. Permit only mechanical toolchain setup and importable, behaviorless interfaces before the first meaningful RED; never report import failures or an empty suite as RED/GREEN evidence. Give M0 infrastructure tests an approved engineering contract without requiring unrelated learner decisions. Preserve the existing owner-only bypass path for authorized protected changes, bound to the exact PR/head, files, diff, reason, and approval reference. A `Test-Change-Approved` trailer is an audit pointer, never an automatic waiver. Bypass cannot substitute for passing quality checks.

**G-06: Audience wording.** Replace the attached AGENTS.md diagnosis-centered opening with “An accessible, low-pressure language-learning app for adults. TypeScript (strict) + React, local-first.” Use “learner-protection invariants” for the existing invariants without weakening them. The current README’s ADHD claim should also be replaced with the supplied product positioning. The owner must apply governance amendments; none have been applied here.

## 2. Recommended Architecture and Technology Stack

Recommendation: a single strict-TypeScript React application built with Vite, static assets, pure domain modules, application use cases, and a narrow persistence port. No backend, accounts, synchronization, service worker, AI integration, payment system, or additional language implementation in M0.

| Area | Recommendation and reason |
| --- | --- |
| Frontend | React + Vite; no verified requirement currently needs server actions or a server-rendered runtime. Add a client router only with the first approved navigation slice. |
| Runtime/toolchain | Propose pinning the observed Node 24.22.1 and npm 11.9.0 after supported-version and dependency checks. Use exact compatible dependency versions and commit the lockfile; use `npm ci` in CI. Installed tools are not evidence that the future dependency combination passes. |
| Styling | Tailwind plus semantic CSS variables; native semantic controls first. Add a headless component dependency only for a justified interaction. No bulk shadcn scaffolding or generic dashboard kit. |
| Validation | Zod at content, import, and persisted-data boundaries; validated domain values internally. No repeated parsing on every pure calculation. |
| State | React-local transient UI state; persisted attempts/session records become the authoritative learning state. Derive counters rather than storing independent authoritative totals. No Redux, event bus, or CQRS infrastructure. |
| Persistence, later | IndexedDB through a narrow adapter; consider the small `idb` wrapper when D-10 is approved. Transactions and unique attempt IDs support atomic/idempotent changes. Do not implement this during M0. |
| Testing | Vitest, fast-check, React Testing Library + user-event, Playwright, axe-core integration, explicit keyboard checks, ESLint, strict TypeScript. Stryker on domain code at M1 exit, with surviving mutants addressed in new files. |
| CI/deployment | GitHub Actions; eventual Cloudflare static-asset hosting. Local Cloudflare-compatible preview checks, no provisioning or deployment in M0. |

Cloudflare documents React + Vite deployment and SPA route fallback without requiring an API Worker. Its current Next.js guide recommends vinext and documents OpenNext as an alternative. Neither path is inherently unsuitable; the present requirements do not justify the additional server/runtime compatibility surface. Public grammar and course discoverability may later justify prerendering, subject to a focused rendering decision before public launch. A client-only SPA does not provide full no-JavaScript reading or route-specific server metadata automatically.

LocalStorage is synchronous and unsuitable as the main multi-record transactional learning store. IndexedDB is the better fit, but browser eviction, clearing site data, lost devices, origin changes, and denied storage remain real risks. `navigator.storage.persist()` is best effort, not backup. Recommend moving versioned JSON export/import into the first persistence release rather than leaving it indefinitely “later.” Never label an answer saved before its transaction commits; on failure keep the answer visible and explain its unsaved state. This changes D-05/D-10 precision and requires approval.

Proposed structure; create directories only as their slices need them:

```text
unpause-languages/
  AGENTS.md
  docs/
    tdd-policy.md
    product-decisions.md
    architecture.md
    reviews/
    testing.md
  src/
    app/                 # composition, routes when introduced
    ui/                  # presentation and accessible controls
    styles/              # tokens and base styles
    domain/              # pure language/learning logic; no React/storage/time globals
    application/         # use cases, clock/ID/persistence ports
    infrastructure/      # IndexedDB adapter and migrations, later
  content/de/            # reviewed-content pipeline, later
  tests/
    contracts/           # frozen contracts, fixtures, integrity histories
    ui/
    e2e/
  scripts/
  .github/workflows/
```

UI calls application use cases; use cases call the domain and persistence port; composition injects the adapter, clock, and ID source. Domain code does not import UI or infrastructure. Use language metadata and a German-specific matcher rather than inventing a universal multilingual engine. Future AI gets a new review when needed, not empty service abstractions now.

### Reference evidence and proposed visual direction

Text-based research verified homepage navigation for courses, grammar, and vocabulary; ordered A1/A2/B1 lessons with short objectives; B2 organization from indexed text; vocabulary by topic; and an A1 lesson with course/next-lesson links, video, explanation, and worksheet. The homepage’s availability wording and navigation are not completely aligned, and indexed advanced-vocabulary content contains placeholder text. Adopt the organizational clarity, not availability assumptions or content.

The cloud browser could not complete visual inspection: tab creation returned “Browser Use could not read requirements,” and native input encountered an unavailable AT-SPI provider. No rendered reference-page screenshot was obtained. Some reference fetches also timed out; the grammar subpage returned 404. Typography, card geometry, hierarchy as rendered, responsive behavior, and mobile layouts remain unverified. No assets or teaching materials were copied.

Proposed original direction: an editorial learning workbook, warm ivory surfaces, dark ink text, forest-green actions, restrained ochre accents, generous whitespace, and original line illustrations. Candidate tokens: background `#FAF7F0`, ink `#202820`, primary `#285943`, muted text `#526052`, accent `#D3A545` used decoratively until contrast is checked. Locally hosted, license-verified serif headings and a highly readable sans-serif body; 18px body, 1.6 line height, a 4px spacing base, 8/16px radii, visible 3px focus outlines, 44px target goal, and content-driven layouts checked at 360/768/1280px. WCAG 2.2 AA is the proposed target, including zoom/reflow, keyboard use, labels, contrast, and reduced motion. These are proposals, not a completed visual review or accessibility certification. Full UI implementation waits for a rendered design review and owner approval.

## 3. Adversarial Architecture Review

### Five consequential risks

| Risk / severity | Trigger and failure mechanism | Observable learner or project impact | Minimum reasonable mitigation |
| --- | --- | --- | --- |
| Contract tampering — critical | A RED file is added, weakened, then merged; main-only/final-diff inspection treats it as new. An unapproved decision trailer legitimizes a UI change. | Incorrect behavior appears independently verified; learner protections regress. | G-01–G-04, trusted base checker, owner provenance, preserved history, semantic review. |
| Lost or duplicated learning state — high | Quota failure, interrupted transaction, browser eviction, two open tabs, or a migration reset; UI acknowledges before commit or overwrites stale records. | Answers disappear, completion is fabricated, or counters diverge. | D-05/D-10 precise failure contract, atomic writes, stable attempt IDs, concurrency policy, non-destructive migration, export/import. |
| Rendering/deployment mismatch — medium | Framework features assume an unavailable runtime, or SPA deep links and metadata are never checked outside Vite dev. | Broken direct lesson links, poor discoverability, unexpected operational work. | Static output first; preview actual deployment configuration; explicit route/404/assets/headers checks; reconsider prerendering only when needed. |
| Privacy and supply-chain exposure — high | Admin-capable automation, PR code executed in trusted CI, unsafe HTML/imports, or third-party analytics/media on learning screens. | Credential compromise or leakage of answers and preferences. | Separate non-admin identity; isolated PR tests; trusted inspection only; no secrets; schema limits; safe text rendering; CSP and self-hosted assets. Hosting can still retain access logs, so “local-only” must describe learning records precisely. |
| Scope/content/accessibility failure — high | A1–B2 breadth and six exercise types are attempted before one learning loop is validated; draft examples are marked reviewed to unblock release; visual polish substitutes for keyboard testing. | Unreliable teaching, inaccessible exercises, and an indefinitely unfinished product. | One reviewed A1 pilot after foundations; owner-selected reviewer including B2; no draft shipping; reusable small exercise slice; manual and automated accessibility checks. |

### Concrete production failure

1. An M1 branch commits a test requiring `schon` to be rejected for `schön`.
2. A normalization bug strips diacritics and the test fails.
3. A later commit changes the expected result to accepted; the file did not exist on `main`.
4. A main-only integrity comparison sees a new file, the modified test passes, and the branch merges.
5. Learners receive positive feedback for a different word; incorrect results later contaminate review and progress data.

This is a failure mechanism permitted by the documented checker design, not an observed implemented bug; no checker exists yet.

### Exactly three consequential questions

1. **Data flow:** Will you approve a local-only persistence contract that acknowledges saving only after transaction success, includes export/import in the first persistence release, and explicitly excludes guaranteed recovery after site-data deletion without a backup?
2. **State correctness:** Will you approve unique, immutable attempt records as the source of progress, with duplicate submissions idempotent and conflicting multi-tab edits rejected rather than silently overwriting saved work?
3. **Learner behavior and scope:** May the first learner pilot contain one reviewed A1 learning unit with higher levels clearly unavailable until reviewed, while A1–B2 remains the curriculum roadmap?

These answers affect later product contracts; they do not by themselves authorize M0 or approve D-01–D-11.

### Three proposed behavioral invariants

1. Inactivity alone never reduces recorded completion or cumulative progress and never creates a penalty.
2. Each accepted attempt affects persisted history and derived totals at most once; “saved” implies a successful commit.
3. Given the same validated item and answer, evaluation is deterministic and cannot erase a meaning-changing spelling or capitalization distinction required by the approved item contract.

### Two adversarial scenarios

1. In fixture Git histories, add a Tier 1 file, then modify/delete/rename/re-add it or modify and revert it; combine this with a forged Tier 2 decision trailer and a hostile PR checker. Trusted inspection must reject tampering without executing PR code. M0 scope.
2. Submit the same attempt from two tabs while the storage transaction fails, reload, and return under a controlled clock after a long absence. No false saved acknowledgement, duplicate progress, silent reset, or inactivity penalty is allowed. Later D-05/D-10/session slice only; do not write these tests during M0.

### One learner-facing acceptance criterion

In a later approved A1 exercise, a learner using a keyboard without umlaut keys receives the approved outcome and spelling feedback for a permitted transliteration, while a meaning-changing bare-vowel answer is rejected accessibly without a countdown. This needs D-03/D-04 and the exact matcher contract before tests; it is not an M0 feature.

## 4. Simpler Alternative and Trade-offs

The lower-complexity alternative to the complete platform is one reviewed A1 unit, one typed-answer interaction, saved/resumable progress, and an ordinary course index. Delay scheduled review, confidence ratings, rewards, advanced analytics, six exercise types, accounts, AI, synchronization, and additional languages until their individual reviews.

Use a plain static React application and ordinary modules, not a server framework, microservices, a general plugin engine, or a global state framework. Compared with LocalStorage, IndexedDB adds some code but preserves the atomicity needed by learning records; removing that capability would save complexity in the wrong place. Defer the adapter during M0, not its recovery design before use.

Trade-offs: delayed breadth/personalization, no cross-device recovery without explicit export, weaker default public-content indexing, and no promised offline launch before an offline-cache slice is approved. One successful pilot does not establish ADHD-specific efficacy, CEFR attainment, or exam readiness.

## 5. Product Decisions Requiring Approval

Every existing decision remains PROPOSED. M0 does not need an SRS or persistence behavioral decision. It needs owner approval of its engineering architecture, exact infrastructure acceptance plan, governance amendments, and any design foundation actually implemented.

| Decision | Precision required before contracts | Earliest slice |
| --- | --- | --- |
| D-01 | Exact scheduler equations, initial state, intervals/limits, lapse rules, algorithm/state version. Replacement algorithms cannot preserve algorithm-specific expected dates; separate shared invariants from version-specific contracts. | Scheduling, later M1 |
| D-02 | Full outcome × confidence table, absent-confidence default, and precedence when “Missed it” conflicts with an objectively correct answer. | Scheduling/feedback |
| D-03 | Partial versus whole transliteration, NFC Unicode handling, directionality, uppercase variants, strictEszett semantics, collision handling, feedback precedence. | First M1 |
| D-04 | Strict-capitalization rules, noun metadata, level-dependent notices, and meaning-sensitive forms such as `Sie`/`sie`. Grammatical case must remain independent. | First M1 |
| D-05 | Definition of committed/saved, failed writes, retry/attempt identity, reload, multiple tabs, discard semantics, and lesson completion rules. | Sessions/progress |
| D-06 | Meaning of “learned card” and “day practiced,” timezone changes, celebration default/motion behavior. Cumulative practice is not equivalent to mastery. | Progress/rewards |
| D-07 | Inactivity threshold, exact cap, ordering/ties, time zones, whether spreading changes due dates or just selection, and interaction with D-08. Defer fresh start. | Scheduler/comeback |
| D-08 | What an item counts as, retries, shorter pools, resumptions, and Quick=5 versus a comeback cap of 10. | Session UI |
| D-09 | Authorized reviewers including B2, complete schema and provenance, review invalidation after edits, and exact draft-exclusion/build-failure behavior. A status string alone is not approval evidence. | Content schema, M2 |
| D-10 | Quota/denied-storage behavior, concurrent writes, migrations and rollback compatibility, unknown future versions, recoverable corruption versus unrecoverable deletion, export/import validation and ownership. | Persistence, M1 |
| D-11 | Define local data and hosting logs, retention/deletion, consent/revocation, and what “anonymous” aggregation would actually mean. Do not build collection before this is approved; defer aggregation to M5 review. | Local measurement/privacy, later |

**Minimum first-M1 approval set:** refined D-03, refined D-04, and a new PROPOSED D-12 for answer normalization, accepted variants, invalid input, and evaluation result/feedback semantics. The current two decisions alone do not define a complete matcher contract. Owner editing/approval is required before tests; the agent will not change statuses.

Proposed D-12 details for review: NFC normalization; trim leading/trailing whitespace and collapse internal Unicode whitespace; preserve punctuation by default; compare only canonical answers and explicitly authored accepted variants; no fuzzy spelling, stemming, accent stripping, or AI grading. Recommend allowing per-character umlaut digraph substitution so mixed native/transliterated input works, only from the expected form toward learner input. Require an explicit `strictEszett` value; when true, prohibit ß↔ss equivalence. A strict-capitalization item compares case before any case folding. Reject malformed values, controls/invisible formatting characters, isolated surrogates, empty normalized text, and inputs over a proposed 500 Unicode code points with a distinct invalid result. These exact bounds and transformations remain proposals. The result distinguishes correct, incorrect, and invalid; includes the matched variant and correction flags; and has no scoring or persistence side effect. Feedback text and noun-specific notices use reviewed metadata, not heuristic noun detection. A1/A2 notice behavior and B1/B2 notice behavior need explicit owner sign-off under D-04.

Other omissions to resolve in their own slices: onboarding defaults/resume, prerequisite gating, lesson completion, progress definitions, supported browsers, and offline behavior. Do not hide them inside implementation choices.

## 6. M0 Implementation Plan

1. **Repository and approval prerequisites.** Owner identifies or renames the intended `unpause-languages` repository, supplies the amended governance, and configures a separate non-admin agent identity. Preserve existing history; no automatic rename/new remote. Place the owner-supplied files at their designated paths without silently revising them. Create a focused feature branch after authorization.
2. **Mechanical bootstrap.** Pin compatible runtime/dependencies; establish strict TypeScript, linting, runner configuration, lockfile, and runnable interfaces. Define this setup as engineering bootstrap, not completed product behavior. Keep test-bearing RED commits separate from setup and implementation.
3. **Approve the M0 Tier 1 test plan.** Freeze infrastructure contracts only after the owner approves names and expected behavior. No future product tests or German lessons.
4. **Implement integrity through RED/GREEN/REFACTOR.** Fixture repositories are created in temporary directories from immutable test definitions. Demonstrate assertion failures for missing behavior using importable interfaces, not broken imports or missing Git. Commit RED tests with command/output; implement minimal checker in GREEN; refactor separately when useful without manufacturing an empty refactor commit.
5. **CI isolation.** Trusted `pull_request_target` performs only approved inspection. `pull_request` runs application checks with read-only permissions, no secrets, pinned action SHAs, explicit timeouts, `npm ci`, fixed timezone, seeded randomness, and no external requests from tests. Record failed and skipped counts and retain relevant failure artifacts.
6. **Design foundation.** Record tokens and accessibility rules. Build only an approved neutral component/test harness needed to exercise React, keyboard focus, reduced motion, axe, and a mobile viewport. No homepage funnel, course catalog, onboarding, or lessons. Full visual composition remains behind a separate visual approval.
7. **Local deployment compatibility.** Exercise built static assets and a harmless deep-link route under the intended Cloudflare configuration, including missing assets and application not-found behavior. No remote resources or deployment. The compatibility command must fail on failures, not merely print success.
8. **Documentation and exit evidence.** README setup, architecture/module boundaries, TDD and integrity rules, branch protection limitations, and content-review plan. Report actual test counts, command results, RED/GREEN/REFACTOR hashes, integrity results, owner authorization, and outstanding risks.

### Proposed M0 Tier 1 test-plan names

| Name | Expected behavior |
| --- | --- |
| `allows_new_unchanged_contract` | A newly committed contract can remain unchanged while production code evolves. |
| `rejects_main_contract_tampering` | Modification, deletion, rename, and fixture changes to existing contracts fail. |
| `rejects_branch_contract_tampering` | A contract first added on the branch is protected in every subsequent commit. |
| `rejects_restore_and_merge_evasion` | Revert, delete/re-add, type changes, and merge-parent histories cannot hide tampering. |
| `rejects_missing_history` | An unavailable trusted base or incomplete history fails closed. |
| `rejects_skip_focus_and_discovery_bypass` | Supported skip/focus forms and unapproved runner/script/config exclusions fail; normal string fixtures are handled without executing them. |
| `requires_approved_tier2_decision` | A revision needs a dedicated commit and a matching owner-approved decision version in trusted history. |
| `rejects_forged_approval_and_checker_changes` | Trailers and PR-edited checker/governance cannot self-authorize; an approved exception remains an owner operation. |
| `never_executes_pr_payload` | Hostile PR scripts, hooks, diff helpers, and path names remain inert data. |

These are proposed plans, not tests already written. Add an explicit authorized-exception fixture after the owner confirms the bypass record format. Human review remains necessary for semantic assertion weakening.

Real required scripts will run lint, typecheck, unit/integration tests, Playwright, and build, plus test-integrity and local deployment compatibility. No `passWithNoTests`, success-only scripts, `continue-on-error`, or hidden exclusions. The neutral foundation harness gives E2E and accessibility checks real work without implementing a product feature.

### Exact owner-side GitHub setup

- Confirm plan support for protecting this private repository; it is not verified. Upgrade the plan or choose an explicitly approved alternative if required; do not describe unenforced settings as protection.
- In repository Settings → Rules → Rulesets (or branch protection), protect `main`: require a PR and all six named checks `lint`, `typecheck`, `test:run`, `test:e2e`, `build`, `test-integrity`; require current checks for the merge target; block deletion and force-push. Add any newly approved mandatory check by its actual emitted name.
- Restrict agent credentials to contents/pull-request writes, without administration, bypass, or status/check-forging privileges. Bind required status sources where supported. The currently connected admin identity is not sufficient separation.
- Protect active feature branches containing RED commits against force-push/deletion until their history is retained on `main`. Disable squash and rebase merges; preserve test history through merge commits. Do not enable a linear-history rule that forces the forbidden rewrite workflow.
- Limit exceptional bypass to the owner and exact approved PR. Bootstrap requires an owner-reviewed first merge because the trusted checker does not exist on current `main`; verify subsequent PRs use the trusted version.
- Add CODEOWNERS for governance, enforcement, configurations, and test support. Require owner/code-owner review only with a separate eligible owner reviewer; a sole PR author cannot approve their own PR. No bot self-approval.

**M0 exit:** all approved local and remote checks actually pass; tamper fixtures demonstrate rejection; trusted enforcement and branch settings are verified; no product behavior or draft German content ships. If remote enforcement is unavailable, report “local foundations verified; M0 enforcement incomplete,” not M0 complete.

## 7. Proposed First M1 Vertical Slice

Pure typed-answer evaluation for one German exercise shape, covering approved D-03/D-04/D-12. No persistence, attempt scoring, sessions, scheduler, content publishing, multiple-choice, or sentence arrangement in this slice. Those remain later slices within the roadmap.

Proposed Tier 1 plan: canonical match and mismatch; explicitly accepted variants; mixed transliteration if approved; bare-vowel rejection; strict ß distinction; strict capitalization and separate case tags; NFC-equivalent text; approved whitespace and punctuation; invalid/empty/oversized inputs; stable feedback classification; deterministic/no-mutation properties. Use test-only linguistic fixtures outside shipping content and obtain review of their expected outcomes before freezing.

After owner approval and decision updates: present final test names, observe meaningful RED, commit tests alone, implement the pure matcher, observe GREEN, refactor separately if needed, and run all required checks. Do not count this slice as the whole M1 milestone. At full M1 exit, run and review Stryker; new tests address surviving mutants.

## 8. Technical Verdict

**SIMPLIFY FIRST**

Proceed only with the narrowly approved foundations after repository identity and governance gaps are resolved. The stack is feasible, but the current enforcement specification is incomplete, the connected identity has excessive authority, and the product decisions do not yet define executable learning contracts. The smaller A1 pilot should validate the learning loop before broad curriculum and adaptive scheduling work.

## 9. Explicit Owner Approval Request

Owner decision: PENDING. Approved architecture: NONE. Approved product decisions: NONE. Visual direction: PROPOSED. Unresolved risks: repository identity, non-admin credentials, GitHub plan/rules, browser visual inspection, persistence semantics, and exact matcher rules.

Please explicitly authorize only the React/Vite M0 scope, proposed infrastructure test plan, protected workflow/checker/config creation, and neutral design foundation after resolving G-01–G-06. Provide the intended repository URL or confirm an owner-side rename. Apply the approved governance amendments yourself and record your decision in the project review record. D-01–D-11 remain PROPOSED unless you separately edit and approve them. M1 and full UI work are excluded from this authorization.

The stop is required by your first-assignment Step 6 and the attached AGENTS.md rule 13 / policy §3: “Present the review to the owner and obtain explicit authorization before implementation.” No plugin permission rule is responsible for this gate.

### Current verification report

- Application implementation: none. Repository/governance files changed: zero. Commits/pushes/PRs/deployments: none.
- RED, GREEN, REFACTOR: not started; no commit hashes exist for this work.
- Tests added/executed: zero. Lint, typecheck, test:run, test:e2e, build, mutation, accessibility, and integrity enforcement: UNVERIFIED / not run; project scripts do not exist.
- Tier 1 modifications, deletions, skips, unauthorized expected-output changes, and Tier 2 revisions: zero.
- Deliverable: this planning record outside the repository. It is not an M0 completion report.

### Research sources

- [Reference homepage](https://learngermanoriginal.com/), [A1 course](https://learngermanoriginal.com/courses/a1-course/), [A2 course](https://learngermanoriginal.com/courses/a2-course/), [B1 course](https://learngermanoriginal.com/courses/b1-course/), [B2 course, indexed text](https://learngermanoriginal.com/courses/b2-course/), [vocabulary](https://learngermanoriginal.com/vocabulary/), [A1 lesson](https://learngermanoriginal.com/courses/a1-course/lesson-1/).
- [Cloudflare React + Vite](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/), [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), [current Next.js guidance](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).
- [Vitest requirements](https://vitest.dev/guide/), [Vite requirements](https://vite.dev/guide/).
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [persistent-storage request](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).
- [GitHub trusted-workflow security](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target), [ruleset controls and limitations](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
