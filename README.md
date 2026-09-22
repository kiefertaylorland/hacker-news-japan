# Hacker News Japan 🇯🇵

Search and explore Hacker News stories from Japan with advanced filtering and sorting options. Sign in with GitHub to bookmark stories.

## Features

- **Full-text search** across Hacker News Japan stories
- **Advanced filtering** by story type (stories, comments, polls, jobs) and date range
- **Multiple sort options**: relevance, date, points, and comments
- **Pagination** support for browsing through results
- **GitHub sign-in** via Supabase Auth (cookie-based sessions, no passwords)
- **Bookmarks**: save stories and revisit them at `/saved`
- **Staggered card animations** for a polished, modern feel
- **Glassmorphism UI** with Tailwind CSS for an elegant design
- **Responsive** and mobile-friendly interface

## Tech Stack

- **Next.js 16** — App Router, server actions, `proxy.ts` for session refresh
- **React 19** — Latest UI library
- **TypeScript** — Type safety
- **Tailwind CSS v3** + **shadcn/ui** — Utility-first styling and primitives
- **Supabase** — Auth (GitHub OAuth) and Postgres with row-level security for bookmarks
- **Algolia HN Search API** — Real-time Hacker News search
- **Vercel** — Hosting

## Local Development

```bash
# Install dependencies
npm install

# Configure Supabase (copy and fill in from your Supabase project's API settings)
cp .env.example .env.local

# Start development server
npm run dev

# Open http://localhost:3000
```

Required environment variables (see `.env.example`):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |

Search works without signing in. Bookmarking requires a GitHub OAuth app configured as an auth provider on the Supabase project, with `http://localhost:3000/**` added to the allowed redirect URLs.

### Database

The bookmarks schema lives in `supabase/migrations/`. Apply it to a linked project with:

```bash
supabase link --project-ref <ref>
supabase db push
```

For local development and testing, start the full local stack (Postgres, Auth, PostgREST) with:

```bash
supabase start
```

Database-level tests live in `supabase/tests/database/` (pgTAP) and `tests/integration/` (Vitest against the real local instance) — see below.

## Quality Gates

```bash
npm run verify   # all of the below except mutation + DB gates, sequentially, stopping at the first failure
npm run lint     # eslint src + tests (typescript-eslint: no any, no @ts-ignore, no non-null ! in src)
npm run typecheck
npm test        # vitest with 100% coverage thresholds (shadcn ui/ excluded as vendor code)
npm run cpd     # jscpd copy-paste detector, fails above 2.5% duplicated lines
npm run knip    # unused files/exports/deps and imports of packages missing from package.json
npm run mutation # StrykerJS mutation testing, fails below an 85% mutation score
npm run mutation:diff # Stryker on only the src files changed vs origin/main (BASE=<branch> to override)
npm run build

# Database-level gates (need a running local Supabase instance):
supabase start
supabase test db          # pgTAP: schema + RLS policy assertions (supabase/tests/database/)
npm run test:integration  # Vitest against the local instance — proves RLS is enforced
                           # through the real app code (src/lib/bookmarks, src/lib/auth), not just mocks
supabase stop
```

Lint, typecheck, tests, the duplication check, knip, a production build (`next build`), and the pgTAP + integration database gates all run on every pull request via GitHub Actions; Vercel then performs its own build for each deployment. The full mutation run is not part of the automated CI gate (it's slow) — run it locally/on-demand with `npm run mutation`. PRs do run `mutation:diff`, which only mutates the files the PR touches.

Coverage checks whether a line ran during tests; it doesn't check whether the test would catch a bug there. Mutation testing (via [StrykerJS](https://stryker-mutator.io/)) makes small deliberate changes ("mutants") to the source and reruns the tests — a mutant that survives means a real bug in that spot could survive too. The `mutation` script mutates everything under `src/` (excluding vendored `components/ui/`) and opens an HTML report at `reports/mutation/index.html`.

The unit suite (`npm test`) mocks Supabase entirely, so it can't catch a weakened or missing RLS policy. Two layers close that gap: pgTAP tests in `supabase/tests/database/` assert the `bookmarks` policies directly at the SQL layer (impersonating `anon`/`authenticated` users via helpers in `000-setup-tests-hooks.sql`), and the integration suite in `tests/integration/` exercises `src/lib/bookmarks/*` and `src/lib/auth/user.ts` against that same real database. Both run in CI on every PR. Full browser/E2E testing (a real GitHub OAuth sign-in flow via Playwright) is intentionally out of scope for now.

### Verifying AI-generated code

Much of this codebase is written with AI agents, so the gates are layered to catch the usual failure modes as early as possible:

| Layer | When it runs | What it catches |
| --- | --- | --- |
| `.claude/settings.json` PostToolUse hook (`scripts/claude/lint-edited.mjs`) | After every Claude Code edit to `src/` or `tests/` | Lint errors fed straight back to the agent, so `any`/`@ts-ignore`/`!` escape hatches get fixed in the loop |
| `.claude/settings.json` Stop hook (`scripts/claude/stop-gate.mjs`) | When the agent tries to finish a turn that changed code | Runs `scripts/ci-local.sh --quick`; a red gate blocks the agent from reporting "done" |
| Husky `pre-commit` / `pre-push` | `git commit` / `git push` | Lint + typecheck before commit; full `npm run verify` before push |
| knip (CI + `verify`) | Every PR | Dead code and hallucinated/undeclared dependencies |
| `mutation:diff` (CI) | Every PR | Tests that reach 100% coverage without asserting anything on the changed code |

Human-written changes go through the same gates; the Claude hooks only add the in-loop feedback.

## Deploy

The app is deployed to Vercel. Pushes to `main` deploy to production; pull requests get preview deployments. Set the two environment variables above in the Vercel project, and add the production URL (plus a preview wildcard such as `https://*-<scope>.vercel.app/**`) to the Supabase auth redirect allow-list.

## License

MIT
