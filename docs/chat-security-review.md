# Chat security review

Reviewed the chat feature and topic enforcement on 2026-10-06.

Fixed findings:

- Oversized request bodies were fully buffered before checking their size. The route now reads incrementally, stops at 64,000 characters, cancels the stream, and handles stream failures.
- Cross-origin requests could trigger paid generation using a reader's cookies. The route now requires JSON and rejects a supplied origin that differs from the request origin.
- Authenticated requests had no shared usage quota. An atomic database quota now limits each account to 10 requests per minute window and 100 per UTC day. Clients cannot read, modify, or delete quota rows. The privileged function is private; the exposed wrapper is unprivileged. Permissions are restricted on quota objects, preserving the shared schema access needed for anonymous vote counts. Missing quota infrastructure fails closed.
- Article fetching did not propagate chat cancellation or enforce a timeout. It now shares the chat signal and has a 10-second deadline.
- Research tool errors could appear verbatim in the response protocol. They are replaced with a fixed public error before classification or delivery.
- Generated Markdown could automatically load remote image beacons. Chat rendering now removes images and retains the renderer's HTML and URL sanitization.
- Updated transitive `fast-uri` and `source-map-js` to patched versions through overrides.

The review also checked authentication, text-only input validation, selected-story URLs, server-only credentials, bounded research, cancellation, history handling, topic gates, fail-closed output release, and generic error handling. Regression tests exercise these boundaries, including the actual Markdown renderer and concurrent quota requests against local Supabase.

Verification passed: 479 unit/component tests with 100% coverage; lint, typecheck, duplication and unused-code checks; production build; 84 database assertions; 14 integration tests; database lint and security advisors; a clean production dependency audit; and mutation testing at 97.27% for the changed code plus 100% for the discussion route. The mutation script also now treats route brackets literally, so dynamic routes are included in future runs.

Known limitations:

- Topic checks use model judgments and can misclassify or be influenced by prompt injection. The input and output gates provide defense in depth, not a formal guarantee. Live provider behavior is not tested without configured credentials.
- Account quotas do not provide a global spending cap or prevent abuse across many accounts. Configure provider billing limits before production use.
- `braces@3.0.3` has an unpatched stack-exhaustion advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). It is inherited through `eslint-config-next` → `fast-glob` → `micromatch` in development tooling. It is absent from production dependencies and processes repository-controlled lint configuration and patterns. No remotely supplied chat content reaches it. Avoid linting untrusted configurations outside an isolated environment; retain this advisory until an upstream patch is available.
