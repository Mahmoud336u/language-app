# PR #13 correction recovery: preparation report

Date: 2026-11-15. Delivery: paste-ready changes for existing PR #14.
These changes were prepared and verified locally; they have not been pushed,
merged, installed as trusted code, or acknowledged on the owner's behalf.

## Scope and authorization

The architecture review, exact amendment, safeguards, and new-file test plan were
presented in the owner conversation. Advisory verdict: BUILD NOW, subject to owner
authorization. The owner subsequently requested the remaining changes in chat.
This authorizes preparation of this bounded implementation, not an owner comment,
protection change, push, or merge. Policy text was separately supplied by the owner
in PR #14. The correction remains limited to the identifiers in policy section 10.

One trusted-base authorization record and a separate recovery verifier establish
eligibility; a fresh authenticated owner comment authorizes the complete current
findings. Existing governance approval functions and the raw checker are unchanged.
No product contract, learner behavior, package, workflow permission, or existing
frozen test is changed.

## Local TDD evidence

Local preparation commits (not yet GitHub PR commits):

- `fd30803`: behaviorless recovery interface.
- `70838e5`: RED, 16 meaningful failures / 34 passing rejection cases; lint and
  typecheck passed before the new test file was frozen.
- `41a9e3c`: GREEN, all 50 recovery contracts passed.
- `52b8474`: runner RED, two meaningful failures / one pass; lint and typecheck passed.
- `a87d2e7`: runner GREEN, all 319 Vitest cases passed.
- `f8e2870`: REFACTOR, locale-independent fingerprint ordering; all 319 cases passed.

When applying manually, preserve equivalent separate setup, RED, and GREEN commits
and record their GitHub links. Do not report these local commit IDs as already pushed.

## Verification and limits

- Lint, strict typecheck, and build: passed locally.
- Vitest: 319 passed, including 53 new recovery/runner cases.
- Contract suite: 316 passed; a subset of the 319 total.
- Existing browser/accessibility suite: 14 passed in Chromium.
- Local Wrangler compatibility: six passed; no deployment occurred.
- Existing domain mutation check: 191 mutants, 189 killed, two previously reviewed
  equivalent matcher survivors, zero errors/timeouts/uncovered; score 98.95%.
  This mutates domain code, not recovery scripts; it is a regression check.
- Offline exercise against actual PR #13 Git objects: eight raw findings retained,
  both frozen findings verified, result `correction-approval-required`. GitHub
  metadata was simulated and no approval supplied. This is not live authorization.
- Live GitHub verification of this implementation: pending application to PR #14.

Unauthorized frozen edits/deletions, skipped tests, changed expected outputs, and
Tier 2 revisions: zero. Two new contract files were added. The raw branch audit
continues to report protected governance changes and is not a clean audit.

Merge/install PR #14 through the existing governance protocol and independent
review before updating PR #13. Then trigger a fresh trusted check, review all
findings, obtain the owner's correction acknowledgment, and rerun. No required
check or review is waived. Closed PRs, stale approval, missing history, extra edits,
and unmatched findings remain blocked. Admin-account and review-identity limitations
documented in `docs/ci.md` remain unchanged.
