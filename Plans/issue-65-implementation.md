# Issue #65 implementation plan

Add a signed-in user's profile page laid out like Hacker News's own user page: `user`, `created` (date and timestamp), and private links to upvoted submissions / comments and favorite submissions / comments. Comments could not be upvoted or favorited before, so add both on Hacker News Japan comments.

## Decisions

- Own profile only, at `/profile`; the user name in the header links to it. Name and creation time come from the session, so no profiles table is needed.
- Favorite submissions are the existing bookmarks (`/saved` is unchanged).
- New RLS-protected `comment_votes` and `comment_favorites` tables, private to their owner like HN upvotes. They reference local comments, so HN (Algolia) comments are not votable. Comment upvotes are one-way like story upvotes; favorites toggle.
- Upvoted submissions read the user's newest 30 votes and fetch story details from Algolia in one request. Each list shows its 30 newest items.
- HN's layout rendered in the app's dark theme; karma, about and submissions are omitted because the app has no data for them.

## Results

- Red: pgTAP, unit, component and page tests failed before implementation (verified by running the pgTAP suite without the migration).
- Green: 336 unit/component tests with 100% coverage; `npm run verify` passes, including the production build.
- Real local Supabase: 60 pgTAP assertions (18 new) and 11 integration tests pass, covering ownership, privacy, idempotence, unfavoriting and cascade deletes.
- Chromium end-to-end: upvote and bookmark a story, post, upvote and favorite a comment, then see the name, creation time and all four lists on `/profile`.
- Mutation testing on every changed `src` file: 100% (284/284 killed).
- Apply the included database migration before deploying the application.
