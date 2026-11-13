# Content authoring and review boundary

No educational content ships in M0. D-09 remains PROPOSED, so the final content
schema, curriculum, build gate, and reviewer workflow are not implemented yet.

When authorized, German content starts as `draft`. The owner-designated reviewer
must inspect the German, English translations, CEFR placement, accepted answers,
and explanations. Review authority must include B2; do not assume the A1–B1 owner
review plan silently covers every level. An automated linter cannot replace this.

Recommended review table: item ID, level/objective, German prompt/example, English
translation, accepted answers, rejection examples, explanation, reviewer, review
timestamp, and exact content revision. Any educational edit invalidates the prior
review. Only an authorized reviewer may promote that revision to `reviewed`.

The future shipping pipeline must reject draft content in its publishing input;
drafts remain outside the release manifest. A self-written `reviewStatus` string
without owner provenance is insufficient. The exact schema and publishing contract
need D-09 approval before tests are frozen. Test-only linguistic fixtures must never
be imported into production learning content.
