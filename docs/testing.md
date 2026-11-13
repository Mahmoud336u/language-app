# Testing

Use the pinned Node/npm versions and `npm ci`. The commands below execute real
checks; no empty suite or skipped assertion counts as a pass.

| Command | Scope |
| --- | --- |
| `npm run lint` | ESLint, including domain dependency/time/randomness restrictions |
| `npm run typecheck` | Strict TypeScript for application, tests, scripts, and configuration |
| `npm run test:run` | Vitest contracts and component tests |
| `npm run test:integrity` | Contract subset using temporary local Git histories |
| `npm run build` | TypeScript and Vite static production assets |
| `npm run test:e2e` | Built UI in desktop and 360px mobile Chromium |
| `npm run test:deployment` | Build plus local Cloudflare static routing and response headers |
| `npm run test:mutation` | Stryker on all domain TypeScript, with related contract tests and JSON/HTML reports |
| `npm run check:test-integrity` | Committed branch history against `origin/main`; protected changes fail closed |

Build before `test:e2e`. Playwright owns each test server and does not reuse an
existing server. Install its Chromium with `npx playwright install chromium`.
An explicitly supplied `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can use a system browser;
record that difference in results. CI installs the pinned Playwright browser.
Restricted environments may need `npm_config_cache=/tmp/unpause-npm-cache` and
`XDG_CONFIG_HOME=/tmp/unpause-xdg`. Set `WRANGLER_SEND_METRICS=false` for local
deployment checks. None of these commands deploys the application.

Tests use UTC and seeded property generation. Integrity fixtures create isolated
repositories, never change this repository, and do not execute fixture payloads.
Browser tests use local assets; learning APIs, accounts, and external services are
not required. Test discovery includes all deployment specs under their directory.

## Contracts and review

Contracts under `tests/contracts` and shared test support freeze at first commit.
Add coverage in a new file. Never edit an existing contract to fix production code.
UI, E2E, deployment, accessibility, visual, and snapshot revisions need a dedicated
commit and an owner-approved decision already in trusted base history. No such
revisions were needed for M0. The checker enforces provenance and history, while
humans must review semantic weakening and accessibility changes.

The approved M0 engineering plan covers first-commit protection, history restoration
and merge attacks, trusted Tier 2 approval, protected configuration, skip/focus
patterns, hostile payloads, and no PR execution. It does not approve future learner
contracts. The deployment-provenance regression extends that same plan; it does
not change existing contract expectations.

For each slice, commit meaningful failing tests alone, then implement, then refactor
without altering the frozen tests. Commit messages preserve commands and actual
results. See the [M0 report](reviews/m0-completion-report.md) for the RED/GREEN audit
trail. Preserve these commits when merging; do not squash or rebase them.

## Evidence limits

The browser suite checks keyboard interaction, programmatic errors, visible focus,
reduced motion, text reflow, and axe WCAG A/AA findings in two states. It does not
replace manual screen-reader testing or a full product accessibility review.
Cloudflare checks use local Wrangler, not a production account or deployment.
Mutation testing now covers the approved M1 answer matcher. Run `npm run
test:mutation`; review `reports/mutation/mutation.json` and the HTML report. The
configuration is under protected `scripts/`; no mutators or source branches are
excluded. The normal full regression run remains required. Stryker's score alone
does not prove adequate coverage: add new contract files for meaningful survivors,
and document evidence for any behaviorally equivalent mutants. Never edit frozen
tests or add exclusions to obtain a better score.

The candidate tamper suite and the branch audit are different checks. During
bootstrap, the audit correctly rejects protected governance/configuration changes;
the future base-owned `test-integrity` job is unverified until the owner merges the
foundation and tests it from a subsequent PR. See [CI](ci.md) for setup and limits.
