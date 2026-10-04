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

Vercel publishes application code but does not apply Supabase migrations. Apply the committed migrations to the database configured for the deployment before publishing it. The `prebuild` script checks the feature tables and RPCs through the anonymous Data API on Vercel and fails the build if they are missing or inaccessible. It uses the publishable key and does not write data. Local and CI builds skip this hosted check; their database tests run against a disposable local stack.

Database-level tests live in `supabase/tests/database/` (pgTAP) and `tests/integration/` (Vitest against the real local instance) — see below.

### Automatic hosted migrations

`Database Migrations` reconciles committed SQL with the hosted database after the `checks` and `db-tests` jobs pass on a push to `main`. It also runs daily and can be run manually from the Actions tab on `main`. All hosted runs are serialized; a running SQL deployment is allowed to finish.

Each run replays the checkout's migrations and pgTAP tests on a disposable local stack, checks hosted migration history, previews and applies pending migrations with `supabase db push --include-all --skip-vault`, checks history again, and fails on database lint errors. Missing older versions are included. Seeds, vault updates, database resets, and automatic migration-history repairs are excluded from hosted deployment.

Configure these in **GitHub → Settings → Environments → Production** before merging this automation:

| Setting | Kind | Purpose |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Secret | Supabase personal access token for the project owner/deployment identity |
| `SUPABASE_DB_PASSWORD` | Secret | Hosted project's Postgres password |
| `SUPABASE_PROJECT_ID` | Variable, optional | Defaults to `yovbadgitdtbmomeuotz`; override for a different production project |
| `VERCEL_DEPLOY_HOOK` | Secret, recommended | Vercel deploy-hook URL configured for this project's `main` branch |

Create the deploy hook in **Vercel → Project Settings → Git → Deploy Hooks**. After successful migration verification, the workflow requests a rebuild on main pushes/manual runs, and on daily runs that applied migrations. This resolves the race with Vercel's Git-triggered build: an early build can fail the schema gate while CI is still applying migrations, then the hook rebuilds against the verified database. Without the hook, migration deployment still works, but a blocked Vercel deployment needs a manual redeploy. Keep the Vercel schema prebuild check from the feature PRs enabled.

The job does not run hosted SQL from pull requests or from manual runs on other branches. PR CI still replays SQL and exercises RLS locally. Use an isolated Supabase preview/staging project when testing unmerged schema changes; the shared Production job deploys only main's reviewed checkout.

For connection troubleshooting, manually run `Database Migrations` with **check_only** selected. This links the project and reads migration history, reports pending versions, and skips SQL deployment and the Vercel hook. Read-only diagnostics can also run on a manually selected branch; deployment remains restricted to main. CLI JSON output is retained in the job log even when reading history fails, so connection errors are visible instead of disappearing into a temporary file. Locally, use `bash scripts/deploy-migrations.sh --local --check-only` against a disposable stack.

Diagnostic runs also read history with `psql` independently of the Supabase CLI, using the same environment password and the session pooler on port 5432. `SUPABASE_POOLER_HOST` is an optional Production variable, defaulting to this project's `aws-0-us-west-1.pooler.supabase.com`; override it when diagnosing a different project. If both clients reject authentication, check the **Production environment** secret (which overrides a repository secret of the same name) and verify it belongs to the project above. Use the raw database password without quotes, connection-string prefixes, or URL encoding.

**Initial rollout:** merge PRs #57 and #58 before this automation. Their comments/votes migrations have already been applied to the hosted database but are not yet in `main`. Remote versions missing from the checkout cause an explicit failure before SQL is pushed. This prevents an old checkout from rewriting or incorrectly repairing newer history.

Add a new migration for every schema change; do not edit an applied migration. A green history check verifies recorded migration versions, not every possible manual schema/data change. Invalid credentials, network outages, inconsistent history, SQL errors, and lint failures make the run red rather than reporting success. The workflow cannot guarantee that manual changes or outages never occur; the migration job and deployment schema gate make those failures visible and prevent a missing schema from silently publishing.

## Quality Gates

```bash
npm run verify   # all of the below except mutation + DB gates, sequentially, stopping at the first failure
npm run lint     # eslint src + tests (typescript-eslint: no any, no @ts-ignore, no non-null ! in src)
npm run typecheck
npm test        # vitest with 100% coverage thresholds (shadcn ui/ excluded as vendor code)
npm run cpd     # jscpd copy-paste detector, fails above 2.5% duplicated lines
npm run knip    # unused files/exports/deps and imports of packages missing from package.json
npm run mutation # StrykerJS mutation testing, fails below a 95% mutation score
npm run mutation:diff # Stryker on only the src files changed vs origin/main (BASE=<branch> to override)
npm run build

# Database-level gates (need a running local Supabase instance):
supabase start
supabase test db          # pgTAP: schema + RLS policy assertions (supabase/tests/database/)
npm run test:integration  # Vitest against the local instance — proves RLS is enforced
                           # through the real app code (src/lib/bookmarks, src/lib/auth), not just mocks
supabase stop

# Browser E2E (needs Docker; starts its own Supabase stack, app build and fake GitHub):
npx playwright install chromium  # once
npm run test:e2e
```

Lint, typecheck, tests, the duplication check, knip, a production build (`next build`), and the pgTAP + integration database gates all run on every pull request via GitHub Actions; Vercel then performs its own build for each deployment. The full mutation run is not part of the automated CI gate (it's slow) — run it locally/on-demand with `npm run mutation`. PRs do run `mutation:diff`, which only mutates the files the PR touches — each whole file, at the same 95% break threshold, so editing a file below that score means raising it.

Coverage checks whether a line ran during tests; it doesn't check whether the test would catch a bug there. Mutation testing (via [StrykerJS](https://stryker-mutator.io/)) makes small deliberate changes ("mutants") to the source and reruns the tests — a mutant that survives means a real bug in that spot could survive too. The `mutation` script mutates everything under `src/` (excluding vendored `components/ui/`) and opens an HTML report at `reports/mutation/index.html`.

The unit suite (`npm test`) mocks Supabase entirely, so it can't catch a weakened or missing RLS policy. Two layers close that gap: pgTAP tests in `supabase/tests/database/` assert the `bookmarks` policies directly at the SQL layer (impersonating `anon`/`authenticated` users via helpers in `000-setup-tests-hooks.sql`), and the integration suite in `tests/integration/` exercises `src/lib/bookmarks/*` and `src/lib/auth/user.ts` against that same real database. Both run in CI on every PR.

On top of those, a Playwright suite in `tests/e2e/` drives a real browser through a production build (`next start`): GitHub sign-in, sign-out, and save → `/saved` → unsave. Only github.com is faked. `scripts/e2e.sh` points local Supabase's GitHub provider at `tests/e2e/fake-github/server.mts` (through the CLI's `SUPABASE_AUTH_EXTERNAL_GITHUB_URL` override; `config.toml` stays unchanged). Everything else is real: the sign-in server action, the Supabase authorize redirect, PKCE, the code exchange, `/auth/callback`, and RLS. One setup step signs in and saves the browser state that the bookmark spec starts from. Home-page stories come from the live Algolia API. The `E2E` workflow runs nightly, on demand, and as a non-required check on PRs that touch auth/bookmark code.

### Verifying AI-generated code

Much of this codebase is written with AI agents, so the gates are layered to catch the usual failure modes as early as possible:

| Layer | When it runs | What it catches |
| --- | --- | --- |
| `.claude/settings.json` PostToolUse hook (`scripts/claude/lint-edited.mjs`) | After every Claude Code edit to `src/` or `tests/` | Lint errors fed straight back to the agent, so `any`/`@ts-ignore`/`!` escape hatches get fixed in the loop |
| `.claude/settings.json` Stop hook (`scripts/claude/stop-gate.mjs`) | When the agent tries to finish a turn that changed code | Runs `scripts/ci-local.sh --quick` when `src`/`tests`/`supabase`/`scripts` or lint/type config is dirty; a red gate blocks the first stop and feeds the failure back (a retried stop is let through to avoid an infinite loop) |
| Husky `pre-commit` / `pre-push` | `git commit` / `git push` | Lint + typecheck before commit; full `npm run verify` before push |
| knip (CI + `verify`) | Every PR | Dead code and hallucinated/undeclared dependencies |
| `mutation:diff` (CI) | Every PR | Tests that reach 100% coverage without asserting anything on the changed code |

Human-written changes go through the same gates; the Claude hooks only add the in-loop feedback.

## Deploy

The app is deployed to Vercel. Pushes to `main` deploy to production; pull requests get preview deployments. Set the two environment variables above in the Vercel project, and add the production URL (plus a preview wildcard such as `https://*-<scope>.vercel.app/**`) to the Supabase auth redirect allow-list.

## License

MIT
