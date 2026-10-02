# Issue #54 implementation plan

Write failing tests for internal discussion links, nested HN comments, local comment queries/actions, authenticated posting and validation. Add a same-site story discussion route, safe comment rendering, an accessible comment form, and an RLS-protected local comments table. Verify all success, empty, failure and authorization paths with 100% application coverage, database tests and full verification.

## Test-first workflow

1. Add acceptance tests and record their initial failures.
2. Implement the smallest complete behavior.
3. Run focused tests, then the full verification gate; retain all existing coverage thresholds and exclusions.
4. Review the diff, commit, push and create a PR referencing the issue.

## Results

- Red: discussion query, UI and page tests failed before their implementation; the database acceptance test failed before the comments table existed.
- Green: all 242 unit/component tests pass with 100% statements, branches, functions and lines. `npm run verify` passes, including production build.
- Real local Supabase: all 7 integration tests pass; all 28 pgTAP assertions pass, including 8 comment authorization/schema assertions.
- Chromium end-to-end: internal comment-icon navigation, authenticated posting, rendered comment, and persistence after reload pass against a production build and real local Supabase.
- HN HTML is sanitized with a limited tag/attribute/scheme allowlist; local comments render as plain text. Existing GitHub authentication supplies the posting user.
- This PR stores comments in Hacker News Japan, not in upstream Hacker News. Apply the included database migration before deploying the application.
