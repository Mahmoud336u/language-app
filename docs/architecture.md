# Architecture

## Approved M0 boundary

The owner approved the React/Vite foundations and governance amendments on
2026-11-12. The repository remains `language-app`; the product is Unpause Languages.
See the [review](reviews/m0-architecture-review.md) and
[authorization](reviews/m0-owner-authorization.md).

The running UI is a neutral engineering harness, not an implemented language course.
It provides honest availability text, labeled sample controls, validation, keyboard
navigation, reduced-motion behavior, and responsive tokens. It stores no input and
makes no analytics or learning-data requests. No external services are provisioned.

## Technology choices

- React 19 + Vite 8: client-side components and portable static assets. No current
  requirement justifies a server runtime or a Next.js adapter.
- TypeScript 6.0.3: strict configuration including unchecked indexed access and
  exact optional properties. TypeScript 7 was outside typescript-eslint's supported
  peer range at setup, so it was not selected.
- Tailwind 4 and semantic CSS variables: consistent styles without a dashboard kit.
- Vitest 5, Testing Library, fast-check, Playwright and axe: behavior and integrity
  verification. Core Vitest assertions avoid an incompatible matcher augmentation.
- Node 24.22.1/npm 11.9.0 and exact versions in the lockfile: reproducible setup.
- Zod is available for future approved external-data boundaries; no content or
  persistence schemas are fabricated during M0.

## Module boundaries

`src/app` currently composes the foundation harness; `src/styles` owns tokens and
`src/ui` owns the reusable sample control.
When their approved slices start, introduce `src/domain` for pure learning logic,
`src/application` for use cases/ports, and `src/infrastructure` for adapters.
Do not create empty scheduler, AI, or language-provider
abstractions now. ESLint prevents domain imports of React, infrastructure, or UI,
and direct use of Date or Math.random. Clock and randomness will be injected.

Future flow: UI → application use case → pure domain + persistence port. Composition
injects implementations. German-specific matching lives apart from future other
languages. Persisted attempts should own progress facts; totals should be derived.
These data-model recommendations still require approved product contracts.

## Deferred decisions and limits

IndexedDB is the recommended persistence technology, with transactions, versioned
migrations, idempotency, and explicit export/import. It is not implemented or
approved under D-10. Browser eviction, deletion, and origin changes cannot be solved
by claiming local storage is a backup. No service worker or offline-launch promise.

Public course and grammar pages will need a rendering/indexing decision before
launch: a plain SPA does not automatically supply useful no-JavaScript content or
per-route server metadata. The foundation uses noindex and must not be marketed as
a live course. Production authentication, AI, payments, synchronization, and
additional languages remain outside M0.
