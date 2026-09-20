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
npm test        # vitest with 100% coverage thresholds
npm run build
```

Lint, typecheck, and tests run on every pull request via GitHub Actions; the build runs on Vercel for each deployment.

## Deploy

The app is deployed to Vercel. Pushes to `main` deploy to production; pull requests get preview deployments. Set the two environment variables above in the Vercel project, and add the production URL (plus a preview wildcard such as `https://*-<scope>.vercel.app/**`) to the Supabase auth redirect allow-list.

## License

MIT
