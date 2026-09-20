# Plan: Add authentication (Supabase Auth + GitHub OAuth) and story bookmarks; move hosting to Vercel

## Context

Hacker News Japan is a single-route Next.js 16.3 App Router app that queries the public Algolia HN API from the browser. It has **no backend, no persistence, no auth, and no per-user state** — all state lives in URL query params. It is built with `output: "export"` and deployed to GitHub Pages.

The owner wants real sign-in. Decisions confirmed with the user:

| Question | Decision |
|---|---|
| What auth unlocks | **Bookmarks / saved stories** (+ the sign-in/out plumbing) |
| Hosting | **Move to Vercel**, drop static export, so we can use server-side sessions (HttpOnly cookies) |
| Sign-in methods | **GitHub OAuth** only, for now |
| Backend | **New Supabase project** under the user's *personal* Supabase account (<personal Supabase account>, personal org) — the user will run `! supabase login` to switch the CLI |
| Vercel account | **Personal Vercel account** — the user will run `! vercel login` (CLI is currently on the work team) |
| GitHub Pages | **Delete `deploy.yml`, keep `ci.yml`**; README points at Vercel |

### Why Supabase Auth (chosen over Auth.js / Clerk)

- Auth **and** the bookmarks table come from one service; Postgres RLS protects rows with zero custom API code.
- `@supabase/ssr` is the official, current Next.js App Router integration (cookie-based sessions, `getClaims()` in proxy). Docs pulled via context7 (`/supabase/ssr`, `/supabase/supabase`, `/vercel/next.js`) on 2026-09-20.
- The user already has Supabase CLI 2.117 and an MCP connector installed; the team's conventions (memory rules for migrations, ground-truth checks) are Supabase-oriented.
- Auth.js would need a separate DB adapter for bookmarks; Clerk adds a paid vendor and still needs a DB.

### Hard constraints discovered

- **`vitest.config.ts:22-27` enforces 100 % coverage** on `src/**/*.{ts,tsx}`. Every new source file needs full tests or CI fails.
- Next 16: `middleware.ts` is renamed **`proxy.ts`** with a named `proxy` export, Node runtime only.
- `node_modules/` is **not installed** in this checkout. Run `npm ci` first and read `node_modules/next/dist/docs/` (proxy, route handlers, server actions, cookies) before writing code, per CLAUDE.md.
- Current branch is `auth` (clean, identical to `main`). Work happens here.

---

## Manual prerequisites (user actions — cannot be done by the agent)

Do these **before** implementation step 5 (Supabase provisioning):

1. **Switch Supabase CLI account:** `! supabase login` → sign in as <personal Supabase account>.
2. **Switch Vercel CLI account:** `! vercel login` (personal scope). Then `vercel switch` if a team picker appears.
3. **Create a GitHub OAuth App** (github.com → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: the Vercel production URL (fill in after step 6, or use `http://localhost:3000` initially)
   - Authorization callback URL: `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (ref comes from step 5)
   - Give me the **Client ID** and **Client Secret** (secret goes only into `supabase/config.toml` via `env(...)` + local `.env`, never committed).
4. After merge: disable GitHub Pages in repo Settings → Pages.

---

## Implementation

### 1. Un-static the app

- `next.config.ts` — remove `output: "export"`, `basePath`, `trailingSlash`, and `images.unoptimized`. Result: `const nextConfig: NextConfig = {}`.
  - `trailingSlash` is dropped so `/auth/callback?code=…` isn't bounced through a redirect.
- Delete `.github/workflows/deploy.yml`. Keep `ci.yml` unchanged.
- Delete stale `data-refactor-build.log`.
- Add `vercel.json`? **No** — zero-config Next.js on Vercel. (Vercel `vercel.ts` is optional; not needed.)

### 2. Dependencies

```bash
npm i @supabase/supabase-js @supabase/ssr
```

### 3. Supabase client plumbing (`src/lib/supabase/`)

- `client.ts` — `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)`.
- `server.ts` — `createClient()` using `cookies()` from `next/headers`, `getAll`/`setAll` pattern, `setAll` wrapped in try/catch (server components can't set cookies; proxy handles refresh).
- `env.ts` — tiny `getSupabaseEnv()` that throws a clear error when the two `NEXT_PUBLIC_*` vars are missing (one place to test the missing-env branch).
- `src/proxy.ts` — `export async function proxy(request)` implementing the official `updateSession` pattern: `createServerClient` with request/response cookies, `await supabase.auth.getClaims()`, return the response. **No redirects** — the search UI stays public. `config.matcher` excludes `_next/static`, `_next/image`, `favicon.ico`, and image files.

### 4. Auth routes, actions, and UI

- `src/app/auth/callback/route.ts` — GET handler: `exchangeCodeForSession(code)`, validate `next` is a relative path, redirect to `next` honouring `x-forwarded-host` (official pattern), else redirect to `/?auth_error=1`.
- `src/app/auth/actions.ts` (`"use server"`):
  - `signInWithGitHub(next = "/")` → `signInWithOAuth({ provider: "github", options: { redirectTo: \`${origin}/auth/callback?next=…\`, skipBrowserRedirect: true } })` then `redirect(data.url)`. Origin comes from `headers()` (`x-forwarded-host` / `host` + proto).
  - `signOut()` → `supabase.auth.signOut()`, `revalidatePath("/", "layout")`, `redirect("/")`.
- `src/components/auth/UserMenu.tsx` (client) — props `{ user: AuthUser | null }`. Signed out: shadcn `Button` "Sign in with GitHub" (form action → `signInWithGitHub`). Signed in: GitHub avatar (`user_metadata.avatar_url`, plain `<img>`), `user_name`, link to `/saved`, "Sign out" button (form action → `signOut`). Uses existing `Button`, `Tooltip`, `Separator` from `src/components/ui/`.
- `src/lib/auth/user.ts` — `getCurrentUser()` server helper: `getClaims()` → returns a slim `AuthUser { id, name, avatarUrl }` or `null` (maps claim fields once; keeps components ignorant of Supabase types).
- `src/app/page.tsx` — becomes `async`; calls `getCurrentUser()` and `getBookmarkIds(userId)`; renders `<Dashboard user={user} savedIds={savedIds} />` inside the existing `Suspense`.
- `src/components/dashboard/Dashboard.tsx` — accept `user` and `savedIds` props; render `<UserMenu user={user} />` right-aligned in the existing header block; pass `savedIds` + `canSave={!!user}` down to `StoryGrid` → `StoryCard`.

### 5. Bookmarks

**Schema** — `supabase/migrations/<ts>_bookmarks.sql`:

```sql
create table public.bookmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  object_id     text not null,
  title         text not null,
  url           text,
  author        text not null,
  points        integer,
  num_comments  integer,
  created_at_i  integer not null,
  tags          text[] not null default '{}',
  saved_at      timestamptz not null default now(),
  unique (user_id, object_id)
);
alter table public.bookmarks enable row level security;
create policy "bookmarks_select_own" on public.bookmarks for select to authenticated using (auth.uid() = user_id);
create policy "bookmarks_insert_own" on public.bookmarks for insert to authenticated with check (auth.uid() = user_id);
create policy "bookmarks_delete_own" on public.bookmarks for delete to authenticated using (auth.uid() = user_id);
create index bookmarks_user_saved_idx on public.bookmarks (user_id, saved_at desc);
```

We snapshot the `HNStory` fields so `/saved` renders without re-querying Algolia. `tags` keeps the `_tags` array so `StoryCard`'s badge logic works unchanged.

**Data access** — `src/lib/bookmarks.ts` (server-only):
- `getBookmarkIds(userId | null): Promise<Set<string>>`
- `listBookmarks(userId): Promise<HNStory[]>` — maps rows back to `HNStory` (`objectID`, `_tags`, `created_at` derived from `created_at_i`, `story_id = Number(object_id)`).
- `toHNStory(row)` / `toBookmarkRow(story, userId)` mappers (pure, easy to test).

**Server actions** — `src/app/saved/actions.ts` (`"use server"`): `toggleBookmark(story: HNStory, isSaved: boolean)` → insert or delete by `(user_id, object_id)`; if no user, `redirect("/")`; then `revalidatePath("/")` and `revalidatePath("/saved")`.

**UI**
- `StoryCard.tsx` — **restructure**: outer element becomes a `<div>`/`Card`; the `<a>` moves to wrap the title + external-link icon (nested interactive content inside `<a>` is invalid HTML). New optional props `isSaved?: boolean`, `onToggleSave?: (story) => void`. When `onToggleSave` is provided, render a `Button variant="ghost" size="icon"` with `BookmarkIcon` / `BookmarkCheckIcon` (lucide) in the header row, `aria-label="Save story"` / `"Remove bookmark"`, `aria-pressed`. Existing hover/focus styling moves to the card + title link.
- `StoryGrid.tsx` — accept `savedIds?: Set<string>` and `onToggleSave?`; forward per card.
- `Dashboard.tsx` — `handleToggleSave` uses `useTransition` to call `toggleBookmark`. Optimistic toggle via `useOptimistic` over `savedIds` so the icon flips instantly.
- `src/app/saved/page.tsx` (server, async) — if no user → render a small "Sign in to see saved stories" `Empty` state with the `UserMenu` sign-in button; else `listBookmarks()` → `<SavedStories stories={...} />`.
- `src/components/saved/SavedStories.tsx` (client) — header ("Saved stories", back link to `/`), reuses `StoryGrid` with `savedIds` = all, `onToggleSave` = remove (via the same action), and the existing `Empty` primitive when the list is empty.

### 6. Environment & docs

- `.env.example` (committed): `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`.
- `.env.local` (gitignored): real values written by me after provisioning.
- `README.md` — update Tech Stack (Next.js 16, Supabase Auth, Vercel), Features (GitHub sign-in, bookmarks), Local Development (env vars, `supabase start` optional), replace the GitHub Pages "Build & Deploy" section with Vercel notes. Remove the Pages badge.

### 7. Tests (must hold 100 % coverage)

Follow the existing flat, per-layer layout in `tests/` and the mocking style in `tests/hooks.test.tsx` (`vi.mock("next/navigation")`) and `tests/app.test.tsx`.

- `tests/supabase.test.ts` — `env.ts` (present/missing), `client.ts`, `server.ts` (`setAll` happy path + swallowed throw), `src/proxy.ts` (cookies copied to response, `getClaims` called, matcher exported). Mock `@supabase/ssr` and `next/headers`.
- `tests/auth.test.tsx` — callback route (code ok → redirect to `next`; forwarded host in prod; non-relative `next` falls back to `/`; missing/failed code → error redirect), `actions.ts` (`signInWithGitHub` redirects to provider URL, error path; `signOut`), `getCurrentUser` (claims → `AuthUser`, null), `UserMenu` (signed in / out renders, actions wired).
- `tests/bookmarks.test.tsx` — mappers, `getBookmarkIds`/`listBookmarks` with a mocked Supabase query builder, `toggleBookmark` insert/delete/unauthenticated, `/saved` page (signed in, signed out, empty), `SavedStories`.
- Update `tests/dashboard.test.tsx` and `tests/ui.test.tsx` for the `StoryCard` restructure (link now on the title), bookmark button rendering/absent, `aria-pressed`, click → `onToggleSave` with the story. Update `tests/app.test.tsx`: `page.tsx` is now async — mock `@/lib/auth/user` and `@/lib/bookmarks`, `await Home()`.
- `tests/setup.ts` — add `vi.stubEnv` for the two `NEXT_PUBLIC_*` vars.

### 8. Supabase provisioning (CLI, after the user has run `supabase login`)

```bash
supabase orgs list                                  # get "<personal org>" org id
supabase projects create hacker-news-japan --org-id <ORG_ID> --region us-west-1 --db-password "<generated>"
supabase init                                       # creates supabase/config.toml
supabase link --project-ref <REF>
supabase migration new bookmarks                    # paste SQL from §5
supabase db push                                    # fresh project → no divergence; prompts (permissions.ask)
supabase projects api-keys --project-ref <REF>      # publishable key → .env.local
```

Auth config in `supabase/config.toml`, then `supabase config push`:
```toml
[auth]
site_url = "https://<vercel-prod-url>"
additional_redirect_urls = ["http://localhost:3000/**", "https://*-<vercel-scope>.vercel.app/**"]
[auth.external.github]
enabled = true
client_id = "env(SUPABASE_AUTH_GITHUB_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GITHUB_SECRET)"
```
GitHub client id/secret live in the gitignored `.env` for the CLI. Verify afterwards with `supabase migration list` and by querying `pg_policies` for `bookmarks` (ground-truth check per house rules).

### 9. Vercel provisioning (after the user has run `vercel login`)

```bash
vercel link            # new project "hacker-news-japan" in personal scope
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production preview development
vercel git connect     # connect <owner>/hacker-news-japan for auto-deploys
vercel deploy          # preview deploy of the auth branch to smoke-test OAuth end-to-end
```
Then set `site_url` in step 8 to the production URL and re-run `supabase config push`.

### 10. Ship

1. Gate, sequentially: `npm run typecheck` → `npm run lint` → `npm test` (100 % coverage) → `npm run build`.
2. Commit on `auth` in logical chunks (config/un-static, supabase plumbing + proxy, auth UI, bookmarks, tests, docs/env).
3. `git push -u origin auth`.
4. `gh pr create --draft --base main --title "feat: GitHub sign-in and story bookmarks (Supabase Auth, Vercel)"` with a body covering: why Supabase, the hosting move, manual follow-ups (disable Pages, confirm GitHub OAuth App URLs), env vars.
5. Request Copilot review: `gh pr edit <n> --add-reviewer copilot-pull-request-reviewer[bot]` (fallback: `gh api -X POST repos/<owner>/hacker-news-japan/pulls/<n>/requested_reviewers -f 'reviewers[]=copilot-pull-request-reviewer[bot]'`). If Copilot won't review drafts, flag it — `gh pr ready` requires user approval per house rules.

---

## Verification

1. **Unit/CI gate:** `npm run typecheck && npm run lint && npm test` (sequential) — coverage table shows 100/100/100/100; `npm run build` succeeds without static-export errors.
2. **Local end-to-end:** `npm run dev` → home renders publicly with a "Sign in with GitHub" button → click → GitHub consent → returns to `/` signed in (avatar + name shown) → bookmark icon appears on cards → click saves (icon flips instantly) → `/saved` lists it → remove works → sign out clears menu and hides bookmark buttons.
3. **DB truth:** `select policyname, cmd from pg_policies where tablename = 'bookmarks'` shows 3 policies; RLS enabled; a second GitHub account cannot see the first's rows.
4. **Preview deploy:** repeat step 2 on the Vercel preview URL (validates `x-forwarded-host` redirect logic and the wildcard redirect URL).
5. **Regression:** existing search/filter/sort/pagination tests unchanged in behaviour; URL-state round-trip still works signed out.
