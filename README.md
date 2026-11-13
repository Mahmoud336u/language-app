# Unpause Languages

Learn at your pace. Return whenever you're ready.

An accessible, low-pressure language-learning platform for adults. This repository
currently contains **M0 engineering foundations only**: a neutral component harness,
test tooling, a history-aware integrity checker, and CI configuration. No courses,
learning progress, accounts, persistence, or adaptive scheduling are available yet.

## Development

Use Node **24.22.1** and npm **11.9.0** (`nvm use` if installed):

```bash
npm ci
npx playwright install chromium
npm run dev
```

Use `npm_config_cache=/tmp/unpause-npm-cache` when the default npm cache is not writable.
For an environment-provided Chromium, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium` explicitly. CI installs
the browser version associated with the pinned Playwright package.

## Required checks

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
npm run test:integrity
npm run test:deployment
```

The browser suite uses the production build, so build before running it. The
deployment suite builds automatically and serves assets with local Wrangler;
it does not provision or deploy anything.

`npm run test:integrity` tests the checker using temporary Git repositories.
`npm run check:test-integrity` audits this branch against `origin/main` and returns
nonzero for protected changes requiring owner review. During the first foundation
PR, this correctly reports governance changes; it is **not** a substitute for the
base-owned GitHub check, which cannot exist until the owner merges the bootstrap.

## Engineering references

- [Hard rules](AGENTS.md) and [engineering policy](docs/tdd-policy.md)
- [Product decisions](docs/product-decisions.md) — D-01–D-11 remain PROPOSED
- [Architecture](docs/architecture.md)
- [Testing and TDD evidence](docs/testing.md)
- [CI, trust bootstrap, and owner setup](docs/ci.md)
- [Design foundations](docs/design-system.md)
- [Content review](docs/content-authoring.md)
- [Deployment boundaries](docs/deployment.md)
- [M0 architecture review](docs/reviews/m0-architecture-review.md)
- [Owner authorization](docs/reviews/m0-owner-authorization.md)
- [M0 verification report](docs/reviews/m0-completion-report.md)

The GitHub repository remains `Mahmoud336u/language-app` by owner instruction. The
application/package is named `unpause-languages`. MIT license; see [LICENSE](LICENSE).
