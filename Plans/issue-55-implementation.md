# Issue #55 implementation plan

Write failing tests for vote interaction, selected state, count increments, persistence, repeated requests, authentication and failure recovery. Add an RLS-protected one-vote-per-user/story table and server action, expose counts and user selections to story cards, and implement an accessible vote button. Verify 100% application coverage, database tests and full verification.

## Test-first workflow

1. Add acceptance tests and record their initial failures.
2. Implement the smallest complete behavior.
3. Run focused tests, then the full verification gate; retain all existing coverage thresholds and exclusions.
4. Review the diff, commit, push and create a PR referencing the issue.

## Results

- Red: vote action, client, route and button tests failed before implementation; the database acceptance test failed before the votes table existed.
- Green: all 239 unit/component tests pass with 100% statements, branches, functions and lines. `npm run verify` passes, including production build.
- Real local Supabase: all 6 integration tests pass; all 29 pgTAP assertions pass, including 9 vote authorization/schema/idempotence assertions.
- Chromium end-to-end: clicking the vote increments the count once, marks the icon selected, disables repeated voting, and retains the count and selection after reload.
- Public GET reads use private/no-store responses and run concurrently; server actions enforce sign-in for writes. A composite primary key and ignore-duplicates upsert enforce one vote per user/story.
- Displayed points combine upstream HN points with local Hacker News Japan votes. Apply the included database migration before deploying the application.
