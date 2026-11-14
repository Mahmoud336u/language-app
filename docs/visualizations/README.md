# MVP roadmap explorer

This is a planning snapshot dated 2026-11-14, not a live project tracker or a
learning feature. Canonical behavior remains in `../product-decisions.md`;
[PR #11](https://github.com/Mahmoud336u/language-app/pull/11) proposes the next
session slice. Viewing or selecting an option grants no approval.

## Files and viewing

- `mvp-roadmap.fragment.html`: editable source of the conversation visualization.
- `mvp-roadmap.html`: generated standalone export, including its styles and host fallback.
- `mvp-roadmap-preview.png`: static README preview of the initial M1 view.

GitHub renders the PNG and README Mermaid diagrams. It shows HTML as source;
download `mvp-roadmap.html` with **Download raw file** and open it in a browser.
The standalone export can also be served locally. No public hosting or application
route is configured, and these files are not part of the Vite production bundle.

The exporter includes optional CDN-loaded icon/tooltip helpers. The roadmap and
scenario controls were verified with all external requests blocked. The wrapper
may remember presentation selections locally; it stores no learner activity and
cannot approve decisions or modify the repository.

## Updating the snapshot

1. Check milestone and approval facts against merged PRs and product decisions.
2. Update the editable fragment and README's static descriptions together. Keep
   recommendations clearly separate from approved or implemented behavior.
3. Re-export with the Visualize skill's bundled exporter (the skill is authoring
   tooling, not an application dependency):

   ```bash
   python3 /path/to/visualize/scripts/render.py \
     docs/visualizations/mvp-roadmap.fragment.html \
     docs/visualizations/mvp-roadmap.html \
     --title 'Unpause Languages — MVP roadmap and decisions' --force
   ```

4. Regenerate the PNG from the exported page's `#unpause-mvp-map` inside its iframe,
   using the initial M1 view, light mode, and a 1000px browser viewport. Update the
   snapshot date only after checking the underlying facts.
5. Verify all seven milestone views and 17 scenarios, keyboard access, and narrow
   layouts. Check the export outside the conversation and the README links.

Do not edit only the generated export; it would diverge from the editable source.
No npm dependency, workflow, protected test, or application configuration is needed
for this documentation export.
