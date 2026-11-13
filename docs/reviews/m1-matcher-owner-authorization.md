# Owner authorization — first M1 matcher slice

Date: 2026-11-13. Owner: @Mahmoud336u. Review: PR #2, commit
`6a621b1a9b6b0d5c4b37e079815104a18ec66ed8`,
`docs/reviews/product-decisions-v2-review.md`.

The owner answered the three explicit review questions in the current Codex
conversation (`request_user_input_async`, `call_5642fbb56986473b90f5eb08fa705fae`):

1. Asked to approve the exact D-03/D-04 contract, examples, Tier 1 plan, and
   matcher-only M1 implementation: **“Approve the reviewed matcher-only slice
   (Recommended)”**.
2. Asked whether unfinished sessions should stay resumable, with future archives
   preserving pending items: **“Preserve unfinished work (Recommended)”**.
3. Asked to approve one reviewed A1 pilot with A2–B2 on the roadmap:
   **“Approve the A1 pilot scope (Recommended)”**.

This record transcribes the owner's decisions; it is not agent self-approval or
evidence of a GitHub review/merge. The PR URL is the review-artifact reference;
the explicit approval source is the conversation above.

The owner-approved implementation is a pure typed-answer matcher and its reviewed
Tier 1 plan, separate RED/GREEN/REFACTOR history, required quality gates, and the M1
mutation review. Recording these approved versions in product-decisions.md is
necessary to make the approved contracts authoritative before tests are written.
The retained architecture review and submitted v2 document are historical proposals;
the canonical decisions now record the later owner authorization.

D-05 and D-15 authorize direction/scope only. No session, persistence, scheduler,
PWA, character-key UI, course delivery, audio, AI, or public release is authorized.
No frozen test revision or governance bypass is authorized. Decision recording
remains a protected owner-reviewed PR; implementation can be developed on its
dependent branch while merge authority remains with the owner. No existing Tier 2
test is revised before an approval reaches trusted main history.
