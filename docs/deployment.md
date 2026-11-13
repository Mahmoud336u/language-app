# Deployment boundary

M0 builds static files into `dist/`. The checked-in Wrangler configuration serves
those files with explicit static entries and no API Worker, database, account, or
binding. `npm run test:deployment` builds and verifies local Cloudflare behavior.
It does not deploy, log in, create a project, or incur a service commitment.

The application recognizes `/` and `/foundation`. The build creates a second static
entry for `/foundation` from the built index; both load the same application bundle.
Unknown URLs receive a static 404 page with a working return link, including when
JavaScript is disabled. Missing asset requests return 404 without the application
shell. The initial global SPA fallback returned HTTP 200 for missing asset URLs in
the deployment RED run. Explicit entries plus `not_found_handling: 404-page` correct
that behavior while preserving the approved static-only architecture. The original
deployment test name mentions SPA fallback; its direct-navigation assertion remains
unchanged and is satisfied through the explicit static entry.

Static response headers define CSP, content-type sniffing protection, referrer
policy, and a restricted permissions policy. No third-party scripts, fonts,
analytics, frames, or external API calls are needed. The foundation is marked
noindex; remove that only as part of an approved release decision.

Eventual deployment needs explicit owner authorization, Cloudflare account/project
selection, production-origin planning, and verification of headers, route fallback,
asset caching, privacy implications of hosting logs, and rollback compatibility.
Changing an origin later can strand browser-local data; D-10 must address this
before persistence is released. No deployment token belongs in this repository.
