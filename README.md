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

## Quality Gates

```bash
npm run lint
npm run typecheck
npm test        # vitest with 100% coverage thresholds (shadcn ui/ excluded as vendor code)
npm run cpd     # jscpd copy-paste detector, fails above 2.5% duplicated lines
npm run mutation # StrykerJS mutation testing, fails below an 85% mutation score
npm run build
```

Lint, typecheck, tests, the duplication check, and a production build (`next build`) all run on every pull request via GitHub Actions; Vercel then performs its own build for each deployment. Mutation testing is not part of the automated CI gate (it's slow) — run it locally/on-demand with `npm run mutation`.

Coverage checks whether a line ran during tests; it doesn't check whether the test would catch a bug there. Mutation testing (via [StrykerJS](https://stryker-mutator.io/)) makes small deliberate changes ("mutants") to the source and reruns the tests — a mutant that survives means a real bug in that spot could survive too. The `mutation` script mutates everything under `src/` (excluding vendored `components/ui/`) and opens an HTML report at `reports/mutation/index.html`.

## Deploy

The app is deployed to Vercel. Pushes to `main` deploy to production; pull requests get preview deployments. Set the two environment variables above in the Vercel project, and add the production URL (plus a preview wildcard such as `https://*-<scope>.vercel.app/**`) to the Supabase auth redirect allow-list.

## License

MIT
