# Plan: Remove duplicated code with jscpd, modularize, and regroup the folder structure

## Context

The repo is a small Next.js 16 App Router app (~50 source files, 5.1k lines incl. tests). A jscpd scan on
branch `remove_slop` (2026-09-20) found:

| Scan | Clones | Duplicated lines |
|---|---|---|
| Exact (min 30 tokens / 4 lines) | 27 | 3.7% (191 lines) — almost all in `tests/` |
| Near-miss (`--ignore-identifiers --ignore-literals --similarity 0.8 --max-gap-lines 2`) | 250 | 42% — inflated by shadcn `ui/` files and tests |

Exact duplication in app code is near zero; the "slop" is structural: copy-pasted setter callbacks,
duplicated page shells / alert / empty-state markup, twin toggle-group renderers, URL helpers in two places,
three redefinitions of the same test fixture, and one test file that exists only to cover vendor shadcn code.

Decisions confirmed with the user:

| Question | Decision |
|---|---|
| Scope | `src` + `tests` + a committed jscpd config and CI gate |
| shadcn `src/components/ui/` | Treat as vendor: exclude from jscpd, do not refactor internals, prune unused primitives, stop unit-testing them |
| Folder structure | Regroup by domain (`components/{layout,search,stories,auth,ui}`, `lib/{search,bookmarks,auth,supabase}`, `tests/` mirrors `src/` + `helpers/` + `fixtures/`) |
| Orphan npm deps | Verify then remove; they were all added in commit `6b450bc` purely to force-patch transitive CVEs, so convert them to `overrides` |

Hard constraints:
- `vitest.config.ts` enforces **100% coverage** on `src/**/*.{ts,tsx}`. Every new file/branch needs tests.
- Next 16: `src/proxy.ts` is the middleware; `"use server"` files may live anywhere under `src/`.
- Read `node_modules/next/dist/docs/` before touching route/action/proxy code (per CLAUDE.md).
- CI (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `test` sequentially.

## Target layout

```
src/
  app/                       routes unchanged (page.tsx, saved/page.tsx, auth/*, layout, loading)
  proxy.ts
  components/
    layout/    PageShell.tsx, PageHeader.tsx, ErrorAlert.tsx, EmptyState.tsx
    search/    SearchBar, FilterBar, SortControls, OptionToggleGroup, ResultsHeader, Pagination
    stories/   StoryCard, StoryGrid, StoryCardSkeleton
    dashboard/ Dashboard.tsx, DashboardSkeleton.tsx
    saved/     SavedStories.tsx
    auth/      UserMenu.tsx
    ui/        shadcn (vendor) — minus tooltip, input, textarea
  hooks/       useSearch.ts, useDebounce.ts, useOptimisticBookmarks.ts
  lib/
    search/    algolia.ts, api.ts
    bookmarks/ queries.ts (was lib/bookmarks.ts), actions.ts (was app/saved/actions.ts)
    auth/      user.ts, origin.ts, constants.ts (AUTH_ERROR_REDIRECT)
    supabase/  server.ts, env.ts            (client.ts deleted: unused in src)
    types.ts, constants.ts, utils.ts, url.ts
tests/
  setup.ts
  helpers/     mockSearchState.ts, mockSupabase.ts, mockNext.ts
  fixtures/    stories.ts
  components/  layout/, search/, stories/, dashboard/, saved/, auth/
  hooks/       useSearch.test.tsx, useDebounce.test.tsx, useOptimisticBookmarks.test.tsx
  lib/         search/, bookmarks/, auth/, supabase/, utils.test.ts, url.test.ts
  app/         page.test.tsx, saved-page.test.tsx, auth-callback.test.ts, proxy.test.ts
.jscpd.json
```

## Steps (each commit must keep lint/typecheck/test green)

### 1. Baseline + jscpd tooling (no CI gate yet)
- `npm i -D jscpd` (5.3.0, Rust rewrite; per-platform optional binaries, works with `npm ci` on ubuntu). Add `.jscpd.json` — these keys were validated against 5.3.0 by running it with `--config` in this session:
  ```json
  {
    "format": ["typescript", "tsx"],
    "minTokens": 30,
    "minLines": 4,
    "ignore": ["**/node_modules/**", "**/.next/**", "**/src/components/ui/**"],
    "reporters": ["console", "json"],
    "output": ".jscpd-report",
    "gitignore": true
  }
  ```
  No `threshold` in this commit: the measured baseline with `ui/` excluded is **28 clones / 4.68% lines**, so a 2% gate would make commit 1 red. Threshold and the CI step land in the final commit.
- `package.json` script `"cpd": "jscpd src tests"`; add `.jscpd-report/` to `.gitignore`.
- Save the "before" JSON report for the PR description. (Do not quote the 42% near-miss figure as the headline; it came from `--ignore-identifiers --ignore-literals --similarity 0.8` and is an upper bound, not the gate metric.)

### 2. Dependency cleanup (`package.json` + regenerated lock, one commit)
- Move `browserslist`, `fast-uri`, `ip-address`, `js-yaml`, `nanoid`, `sharp`, `undici` from `dependencies` to top-level `overrides` (alongside the existing nested `next.postcss` override). Removing them from `dependencies` is mandatory: npm throws `EOVERRIDE` if a package is both a direct dep and an override with a different range. Use `"sharp": "^0.35.4"` (Next 16.3.4's own optional range); others keep their current minimums. Verified dependents: eslint→js-yaml, postcss→nanoid, shadcn→fast-uri/ip-address/undici, jsdom→undici, next→sharp (optional), babel/autoprefixer→browserslist; all ranges compatible.
- Remove `@radix-ui/react-tooltip` and delete `src/components/ui/tooltip.tsx` plus its import block and tests in `tests/ui.test.tsx` in this same commit (otherwise typecheck breaks).
- `npm install` (not `ci`) to regenerate `package-lock.json`; commit it. Confirm `npm audit` is not worse and `npm ls <pkg>` still resolves the patched versions.

### 3. Folder regroup (pure `git mv`, import-path updates, no logic change)
- Moves listed in "Target layout". Update all `@/…` imports (grep for `components/dashboard/`, `lib/algolia`, `lib/api`, `lib/bookmarks`, `app/saved/actions`).
- **Every `vi.mock()` path must move too** or the mock silently stops applying: `tests/app.test.tsx` (`@/lib/bookmarks` → `@/lib/bookmarks/queries`), `tests/dashboard.test.tsx` and `tests/bookmarks.test.tsx` (`@/app/saved/actions` → `@/lib/bookmarks/actions`), `tests/hooks.test.tsx` (`@/lib/api` → `@/lib/search/api`).
- **No `index.ts` barrels.** Each would be a new file under the coverage include, and mocking a barrel while source imports the direct path bypasses the mock.
- `api.ts` must keep importing `buildAlgoliaURL`/`fetchFromAlgolia`/`sortHitsByStrategy` from `./algolia` as live bindings; `tests/lib.test.ts` spies on that namespace.
- Split test files to mirror `src/` (`tests/dashboard.test.tsx` → `tests/components/dashboard/Dashboard.test.tsx` + `tests/components/search/*.test.tsx` etc.). `tests/lib.test.ts` and `tests/algolia.test.ts` overlap heavily; merge into `tests/lib/search/algolia.test.ts` + `api.test.ts`, dropping duplicate assertions.
- Run the full gate; coverage must stay 100%.

### 4. Shared test scaffolding (kills ~all exact clones jscpd found)
- `tests/fixtures/stories.ts`: `makeStory(overrides)`, `makeResults(overrides)`, `sampleBookmarkRow` — replaces the three copy-pasted `HNStory` literals (`tests/algolia.test.ts:13-27`, `tests/bookmarks.test.tsx:46-57`, `tests/dashboard.test.tsx:35-55`).
- `tests/helpers/mockSearchState.ts`: `mockSearchState(overrides)` returning the full `useSearch` shape with `vi.fn()` setters — replaces 6+ inline copies in `dashboard.test.tsx`.
- `tests/helpers/mockSupabase.ts`: chainable query-builder mock (lift from `tests/bookmarks.test.tsx:74-82`) + `mockAuthClient()` (lift from `tests/auth.test.tsx:34-45`).
- `tests/helpers/mockNext.ts`: the shared throw-on-redirect `next/navigation` and `next/cache` factories used by auth and bookmarks tests. `vi.mock` is hoisted above imports, so factories can't reference a static helper import; call `vi.mock("next/navigation", async () => (await import("../helpers/mockNext")).navigationMock())` in each test file (or use `vi.hoisted`).
- Collapse near-identical `it()` blocks in `hooks.test.tsx` / `controls.test.tsx` with `it.each` where the only delta is a value.

### 5. Source de-duplication
Coverage rule of thumb for every new component: an optional prop rendered as `{x && …}` or a default parameter is a branch that needs both sides exercised. Prefer required props and lookup maps over defaults and ternaries.

1. **`hooks/useSearch.ts`** — replace the five setter callbacks (`:118-146`) with one `applyChange(patch)` that computes `next = { ...current, page: 0, ...patch }` from closure state and pushes the URL **imperatively inside the setter** (not from a `useEffect`, which would push on mount and break the `pushMock` expectations in `tests/hooks.test.tsx`). Keep the returned API identical so components don't change. Collapse the three `if (!controller.signal.aborted)` guards into one early-return helper. Leave the `parseInt(... || "0")` URL parsing as is.
2. **`components/search/OptionToggleGroup.tsx`** — generic `<OptionToggleGroup options value onChange ariaLabel size>` owning the shared `ToggleGroup`/`ToggleGroupItem` markup and the `value && onChange(value)` guard (false branch already covered by `tests/controls.test.tsx`). Make `size` **required** and index a `SIZE_CLASSES` map (`md`: h-9/rounded-lg/px-3, `sm`: h-7/rounded-md/px-2.5) so there's no default-param branch. `FilterBar` and `SortControls` become thin wrappers.
3. **`components/layout/`**
   - `PageShell` — `<main className="min-h-screen w-full py-6 px-4 …"><div className="mx-auto max-w-7xl space-y-6">…`. Used by `Dashboard`, `SavedStories`, `DashboardSkeleton` (fixes the drifted padding in the skeleton), and `saved/page.tsx`.
   - `PageHeader` — the `flex flex-wrap items-start justify-between` row with `eyebrow`, `title`, `description`, `actions` slots. `description` is **required** (both callers pass one).
   - `ErrorAlert` — the `role="alert"` box duplicated at `Dashboard.tsx:94` and `:101`; takes only `children`, no branches.
   - `EmptyState` — the `Empty` composition duplicated in `StoryGrid.tsx:48-57` and `saved/page.tsx:25-38` (`icon`, `title`, `description`, optional `children`; both branches are already covered: StoryGrid passes none, saved page passes `UserMenu`).
4. **`hooks/useOptimisticBookmarks.ts`** — `useOptimisticBookmarks(savedIds)` returning `{ savedIds, toggle(story) }` built on `useOptimistic` + `useTransition` + `toggleBookmark`. The `includes ? filter : append` reducer is covered by the existing save-then-remove Dashboard test. `SavedStories` derives `visibleStories = stories.filter(s => savedIds.includes(s.objectID))` from the same hook. **No `mode` prop** (it would be an untested branch).
5. **`lib/url.ts`** — move `getDomain` (from `utils.ts`) and `getStoryUrl` + `hnItemUrl(objectID)` (from `StoryCard.tsx:54-66`) here. `utils.ts` keeps `cn` and `formatRelativeTime`. Update the `vi.spyOn(utils, "getDomain")` in the StoryGrid memo test to spy on `@/lib/url`, and make `StoryCard` import from `@/lib/url`. Existing `getStoryUrl` branch tests (null / `javascript:` / invalid / https) keep running through `StoryCard`.
6. **`lib/search/algolia.ts`** — `getUnixTimestamp` switch → `DATE_RANGE_SECONDS[dateRange] ?? null` lookup (both sides already covered by the `"all"` and `"unexpected"` cases); export `CLIENT_SORTS: ReadonlySet<SortBy>` and use it in both `sortHitsByStrategy` and `api.ts`, keeping the existing "fallback" sort test as the non-client cover; `buildAlgoliaURL(params: SearchParams)` instead of 5 positional args. This breaks the positional assertions in both `tests/lib.test.ts` and `tests/algolia.test.ts`, so merge those two files in the **same commit** as the signature change.
7. **`lib/bookmarks/queries.ts`** — `toggleBookmark`'s raw `.from("bookmarks")` write moves here as `saveBookmark`/`removeBookmark`; `actions.ts` (`"use server"`) keeps only auth check + call + `revalidatePath` and must export **only async functions** (no `toBookmarkRow`/types; those stay in `queries.ts`). Single `bookmarksError(msg)` helper for the repeated `Could not load bookmarks` throw. Note: moving the actions file changes the server-action hash; in-flight clients from the previous deploy get one failed click after deploy, which is acceptable.
8. **Auth constants** — `lib/auth/constants.ts` exporting `AUTH_ERROR_PATH = "/?auth_error=1"` and `AUTH_ERROR_PARAM = "auth_error"`; use in `app/auth/actions.ts:22`, `lib/bookmarks/actions.ts:13`, `app/auth/callback/route.ts:22`, `app/page.tsx:18`. For `callback/route.ts`, add a **pure** `resolveRedirectOrigin(headers: { get(name: string): string | null }, fallbackOrigin: string)` to `lib/auth/origin.ts` and pass `request.headers`. Do not switch the route to `headers()` from `next/headers`: `getRequestOrigin` has different fallback rules and the route's `NODE_ENV === "development"` behaviour is tested in `tests/auth.test.tsx`.
9. **`lib/supabase`** — leave `proxy.ts` and `server.ts` `createServerClient` calls separate (their `setAll` semantics differ: request/response cookie sync vs. read-only server-component cookies; the shared text is under jscpd's 30-token floor). Only delete `client.ts` (unused in `src/`), together with the `createBrowserClient` mock and "browser client" describe in `tests/supabase.test.ts`.
10. **Remove `"use client"`** from `DashboardSkeleton.tsx`, `StoryCardSkeleton.tsx`, `ResultsHeader.tsx` (no hooks/handlers; all rendered from client parents or `app/loading.tsx`).

### 6. Vendor pruning (`src/components/ui/`) — one atomic commit
All of these must land together or coverage/typecheck goes red in between:
- `vitest.config.ts`: `coverage.exclude: ["src/**/*.d.ts", "src/components/ui/**"]`. Verified against the installed istanbul provider: `exclude` is applied to both instrumentation and the untested-file sweep, so vendor files drop out of the 100% gate entirely.
- Delete `tests/ui.test.tsx` (it only tests vendor code).
- **Keep `ui/input.tsx`**: `InputGroupInput` is the canonical shadcn wrapper and `SearchBar` passes a `ref` through it. Delete `ui/textarea.tsx` and remove `InputGroupTextarea` + `InputGroupText` from `input-group.tsx` (unused in `src/`).
- Delete `src/lib/supabase/client.ts` + its test block (step 5.9) here if not already done.
(`tooltip.tsx` is already gone from step 2.)

### 7. CI gate (final commit)
- Run `npm run cpd`, record the post-refactor percentage, set `"threshold"` in `.jscpd.json` just above it (target ≤ 2%, expect ~1% once test fixtures/helpers are in), and add `- run: npm run cpd` to `.github/workflows/ci.yml` after `npm test`. Verified: a threshold breach exits 1.

### 8. Verification (after every commit, and in full at the end)
```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run cpd
```
- `npm run lint` only covers `src` (`eslint src`); `tsc --noEmit` covers `tests/` too, so test helper typos surface there.
- `npm test` must report 100% on all four metrics (now scoped to app code).
- `next build` fails if a `"use server"` file exports a non-async value; run it right after steps 5.7/5.8, not only at the end.
- `npm run cpd` must be under threshold; compare the JSON report with the step-1 baseline and paste both summary tables into the PR.
- `npm audit` shows the same or fewer advisories than before step 2.
- Smoke in browser via `/browse` skill against `npm run dev`: search, filter, sort, paginate, sign-in button renders, `/saved` signed-out empty state renders. (Bookmark toggle needs a real Supabase session; verify via tests only.)
- Open a **draft PR** from `remove_slop` with before/after jscpd tables.

## Commit order (each must be green on lint + typecheck + test)
1. jscpd devDep + `.jscpd.json` (no threshold) + `cpd` script + `.gitignore`.
2. `package.json` overrides + regenerated lock + remove tooltip dep/file/tests.
3. `git mv` regroup + all import and `vi.mock` path updates + test file split.
4. `tests/fixtures` + `tests/helpers`, applied across the split tests.
5–10. One commit per step-5 item with its test changes (5.6 includes the lib/algolia test merge).
11. Vendor prune + coverage exclude (step 6).
12. Threshold + CI step (step 7). Then draft PR.

## Files reused (do not reinvent)
- `cn` — `src/lib/utils.ts:5`
- `getSupabaseEnv` — `src/lib/supabase/env.ts`
- `sanitizeNextPath`, `getRequestOrigin` — `src/lib/auth/origin.ts`
- `STORY_TYPE_OPTIONS` / `DATE_RANGE_OPTIONS` / `SORT_BY_OPTIONS` — `src/lib/constants.ts` (already the right shape for `OptionToggleGroup`)
- jsdom polyfills + env stubs — `tests/setup.ts` (unchanged)

## Out of scope
- Refactoring shadcn internals (`ui/*` clone each other by design).
- Changing visual design, Tailwind classes beyond consolidating identical strings, or app behaviour.
- The `.gitignore` oddities (`next-env.d.ts`, `.env*`) and the auto-generated Next block in `CLAUDE.md`.
