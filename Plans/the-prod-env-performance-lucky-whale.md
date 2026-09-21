# Prod performance: make the app feel fast, not just serve fast

## Context

PR #31 fixed server TTFB: production `/` is now a CDN `HIT` (shell prerendered, stories streamed and present in the HTML). Yet prod still *feels* slow, and you flagged two symptoms: **first page load** and **everything feels heavy**.

Measured today (2026-09-20, from SF, `https://hacker-news-japan.vercel.app`):

| Path | TTFB | Full response |
|---|---|---|
| `/` (warm remote cache) | 100–175 ms | 300–470 ms |
| `/?query=<cold>` | 100–115 ms | 370–720 ms |
| Algolia HN API direct | 280–780 ms | — |
| Supabase auth edge | 50–190 ms | — |
| Client JS on `/` | 10 chunks, ~745 KB raw / ~240 KB br; app code is one 48 KB chunk, the rest is React/Next runtime |

So the network is no longer the bottleneck for the first paint. The remaining cost is on the client and in the interaction path:

1. **Paint/composite load.** 30 `StoryCard`s each carry `backdrop-blur-md` (12 px) over a 3-layer gradient body, a 24–48 px box-shadow, `transition-all`, and a 0.4 s `animate-slide-up` staggered up to 320 ms (`src/components/stories/StoryCard.tsx:62-67`). Animating transform/opacity on 30 backdrop-filtered layers re-blurs every frame; this is the "heavy" feeling, worst on laptops without discrete GPUs and phones. `backdrop-blur` also sits on the search bar, filter chips, pagination, error alert and all 9 skeleton cards; the skeleton shell has ~170 `animate-pulse` elements running while JS loads.
2. **First-load sequence.** Prerendered skeleton (9 cards) → stream swaps in 30 cards → each card slides in over ~0.7 s → hydration of a client tree rooted at `Dashboard` (`src/components/dashboard/Dashboard.tsx:1`). The 9→30 card swap shifts layout, and the slide-in means content is not readable until ~1 s after it arrived.
3. **Interaction path.** `SearchBar` calls `setQuery` on every keystroke; `useSearch.applyFilterChange` does `router.push` immediately (`src/hooks/useSearch.ts:96-103`). Every keystroke therefore triggers an RSC navigation: proxy → `HomeContent` → `getCurrentUser` + `getCachedStories` (cache miss for each partial query → server-side Algolia 300–800 ms) → `getBookmarkIds`. After the 300 ms debounce the client *also* fetches Algolia directly (`useSearch.ts:76`), and each RSC response delivers a new `initialResults` object that re-runs the effect. Meanwhile `setResults(null)` flashes the grid to skeletons on every query change (`useSearch.ts:49-53`), then the new cards slide in again.
4. **Server waterfall for signed-in users.** `page.tsx:26-30` awaits `getBookmarkIds` serially after `Promise.all`, inside the single Suspense boundary, so ready story HTML waits on a second Supabase round trip. `getCurrentUser` repeats the `getClaims()` the proxy already did, and three Supabase clients are built per request.
5. **Re-render churn.** `useOptimisticBookmarks.toggle` is a new function every render (`src/hooks/useOptimisticBookmarks.ts:21`), so `memo(StoryGrid)` never bails out; all 30 cards re-render on every keystroke.

Out of scope / not the problem: translation (none exists), Supabase indexes (correct), fonts (system stack), images (one avatar), proxy auth cost for anonymous users (no cookie → `getClaims` returns without a network call). Vercel functions run in `iad1`; the Supabase project (`yovbadgitdtbmomeuotz`) lives under a different account so its region could not be read — see Verification for a manual check.

## Delivery

Two PRs, each measured separately against the baseline table above.

- **PR 1 — perceived speed:** render/paint trims (visual changes approved), interaction path, server waterfall.
- **PR 2 — bundle & hydration trims:** smaller, lower impact; only worth doing after PR 1 is measured.

---

## PR 1

### 1A. Make cards cheap to paint (biggest "heavy" win)

Files: `src/components/stories/StoryCard.tsx`, `src/components/stories/StoryCardSkeleton.tsx`, `src/components/stories/StoryGrid.tsx`, `src/components/search/ResultsHeader.tsx`, `src/components/search/{SearchBar,FilterBar,OptionToggleGroup,Pagination}.tsx`, `src/components/layout/ErrorAlert.tsx`, `tailwind.config.ts`.

- Remove `backdrop-blur-md` from `StoryCard` and `StoryCardSkeleton`; replace `bg-white/5` with an opaque token (`bg-card` already resolves to `240 6% 10%`, close to the blended result). Keep the blur only on the single `SearchBar` if desired; drop it from the chips, pagination and alert too (they sit on the same gradient, so the visual difference is negligible).
- Replace the multi-layer `shadow-[0_4px_24px…]` / hover `shadow-[0_12px_48px…]` pair with the theme `shadow` + `hover:shadow-lg`, and `transition-all duration-300` with `transition-[transform,border-color,box-shadow] duration-200`.
- Remove the per-card `style={{ animationDelay }}` and `animate-slide-up` (`StoryCard.tsx:61-64`); keep one `animate-fade-in` (0.3 s) on the grid container only (`StoryGrid.tsx:52`). Drop the `animate-slide-up` on `ResultsHeader` and the empty state.
- Skeleton: render `HITS_PER_PAGE` (30) `StoryCardSkeleton`s instead of 9 so the streamed grid does not shift layout; the skeleton cards keep `animate-pulse` on the inner bars only (already the case) but lose the blur. (1B makes the skeleton appear only on first load or after an empty result, so the count matters mostly for the prerendered shell.)
- `prefers-reduced-motion` handling in `globals.css` already exists; nothing to add.

Tests to update: `tests/components/stories/StoryCard.test.tsx` (if any assertion targets `animationDelay`/class names), `tests/components/stories/StoryGrid.test.tsx` (skeleton count 9 → 30).

### 1B. Interaction path: no router push per keystroke, no skeleton flash

Files: `src/hooks/useSearch.ts`, `src/hooks/useOptimisticBookmarks.ts`, `src/components/dashboard/Dashboard.tsx`, `src/components/stories/StoryGrid.tsx`.

**Decision:** the client hook is the single data source after first paint; the server seed (`initialResults`) is for first render only. `useSearch` never triggers an RSC navigation. URL sync uses the native History API, which Next 16 integrates with `useSearchParams` (`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, "Native History API" section). Rationale: an RSC hop costs proxy + two Supabase round trips + render (370–720 ms cold) versus one Algolia hop (280–780 ms); `router.replace` still performs that fetch, so only `pushState`/`replaceState` gives a zero-server-work URL update. Back/forward flows through the existing URL→state effect (`useSearch.ts:41-44`), already pinned by the "syncs state when the URL search params change externally" test.

`src/hooks/useSearch.ts`:
- Drop `useRouter`. Add `urlParamsRef` (latest URL params, written in the URL→state effect) and a `queryDirty` ref (typed query not yet mirrored to the URL).
- `setQuery`: mark dirty, functional `setParams` with `page: 0`, no URL write, stable `useCallback([])`.
- One `navigate(next)` helper for filter and page changes: clear dirty, `setParams(next)`, `window.history.pushState(null, "", toSearchUrl(next))`. `setPage` also calls `window.scrollTo({ top: 0 })` to keep today's scroll-to-top; filter/query changes no longer scroll (controls sit above the grid). Removes the 3-line duplicate between `applyFilterChange` and `setPage` (jscpd-friendly).
- Fetch effect: in the `query !== debouncedQuery` branch keep `setIsLoading(true)` but **delete `setResults(null)`** (previous results stay visible). When the debounced query settles and `queryDirty` is set, `replaceState` the canonical URL once (no history entry per keystroke). Read URL params from `urlParamsRef` and **remove `searchParams` from the deps**, so the `useSearchParams` change Next dispatches after our own pushState does not abort the in-flight fetch. Keep `initialResults`/`initialParams` in deps: they only change on real navigations (e.g. `Link` back from `/saved`), which is when the seed should be adopted. Keep the error path's `setResults(null)`.

`src/components/stories/StoryGrid.tsx`: show skeletons only when `isLoading && !stories?.length`; otherwise render the grid with `aria-busy={isLoading}` and `opacity-60 transition-opacity` while loading. The grid `div` now persists across loads, so no remount/animation replay. `ResultsHeader` keeps its small skeleton while loading (a stale count next to the new query would mislead); `Pagination` stays disabled while loading.

`src/hooks/useOptimisticBookmarks.ts`: wrap `toggle` in `useCallback([optimisticIds, toggleId])`. `src/components/stories/StoryCard.tsx`: export `memo(StoryCard)`. With `Dashboard`'s `EMPTY_IDS` default, `StoryGrid` then receives identical props during typing and only `isLoading` flips.

Prefetching the adjacent page: deferred (doubles Algolia traffic, adds cache/abort branches to cover; pagination is already one hop with results kept visible).

Tests (`tests/hooks/useSearch.test.tsx`): replace the `useRouter`/`pushMock` mock with `vi.spyOn(window.history, "pushState"|"replaceState")` and `vi.spyOn(window, "scrollTo")` in `beforeEach` (`tests/setup.ts` already restores mocks). Update "updates URL and state through each setter" (setQuery → no pushState; filters → pushState; setPage → pushState + scrollTo), "defers rapid input from a nonzero page" (pushState for the filter click, no replaceState after settle), rename "clears results…while debouncing" → "keeps previous results visible…" (results unchanged, then one replaceState). Add: "collapses rapid typing into one URL replace and one fetch"; "does not refetch when the URL catches up with state". `tests/components/dashboard/Dashboard.test.tsx`: rewrite "announces loading without presenting stale results" → previous results visible with `aria-busy="true"`. `tests/components/stories/StoryGrid.test.tsx`: skeleton test becomes `it.each([null, []])`; add dimmed/busy test; extend the memo test to flip `isLoading` and assert `getDomain` is not re-called. `tests/hooks/useOptimisticBookmarks.test.tsx`: add stable-identity test. Unchanged: `tests/app/page.test.tsx`, `tests/components/search/*`, `tests/helpers/*`.

Risks: relies on Next patching `window.history` at hydration (verify in-browser that back/forward restores filters with only Algolia requests in the Network tab); post-interaction fetches bypass the remote cache (first paint still uses it; revisit if Algolia rate-limits); filter changes no longer scroll to top (one-line revert if unwanted).

### 1C. Server waterfall and duplicate auth work

Files: `src/app/page.tsx`, `src/lib/auth/user.ts`, `src/lib/supabase/server.ts`.

- Wrap `createClient` in `React.cache` so the three per-request Supabase clients collapse to one (one `cookies()` read, one JWKS/claims verification). Wrap `getCurrentUser` in `React.cache` too, so `toggleBookmark`'s server action and the page share results within a request.
- In `HomeContent`, stop awaiting `getBookmarkIds` before rendering. Two options; pick the first:
  1. Pass `getBookmarkIds(user?.id ?? null)` as a **promise** prop to `Dashboard` and read it with React 19 `use()` inside `useOptimisticBookmarks` behind its own `<Suspense>` (fallback: cards rendered with no bookmark buttons). Story HTML then flushes as soon as Algolia/cache responds; bookmarks arrive in a later chunk.
  2. Keep the await but move it inside a nested `<Suspense>` around only the grid.
  Option 1 keeps the existing client-component shape and the test helpers in `tests/helpers/renderServerPage.tsx` can await the promise directly.
  Implementation note: React streams any Suspense boundary larger than its progressive chunk size (~12.8 KB) as fallback + later segment, so a 30-card fallback would double the grid HTML. The boundary is therefore only rendered when `savedIds` is a promise (signed-in); anonymous visitors get plain `[]` and a single grid.
- Leave `src/proxy.ts` logic alone (it is what keeps sessions from expiring). Only tighten the matcher to skip `_next/` wholesale plus `.css|.js|.map|.txt|.xml` so RSC prefetches and static assets don't run it: `"/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)"`.

Tests: `tests/app/page.test.tsx` (bookmark ids now a promise), `tests/lib/auth/*` for the cached `getCurrentUser`, add `tests/proxy.test.ts` asserting the matcher regex excludes `/_next/static/x.js` and includes `/` and `/saved`.

---

## PR 2 — bundle and hydration trims

App code is only ~48 KB raw of the ~745 KB total, so expect modest gains; do this after PR 1 is measured.

- **date-fns out of the client bundle.** `src/lib/utils.ts:3` imports `formatDistanceToNow`, and every client component imports `cn` from the same module. Move `formatRelativeTime` to `src/lib/time.ts` with a ~20-line `Intl.RelativeTimeFormat` implementation and drop the `date-fns` dependency. Update `tests/lib/utils.test.ts` → `tests/lib/time.test.ts`; `tests/components/stories/StoryCard.test.tsx:43` pins relative-time output.
- **Radix `Separator` ×30 → plain `<hr>`/bordered div** in `StoryCard.tsx:115` and `StoryCardSkeleton.tsx`. Remove `@radix-ui/react-separator` if no other use remains (`src/components/ui/separator.tsx` becomes dead; delete it only if unused).
- **Shrink the client boundary.** Move `PageShell`, `PageHeader` (title/eyebrow/description) and the static header markup out of `Dashboard` into `page.tsx` (server), passing `UserMenu` and the interactive controls as children. Only `SearchBar`, `FilterBar`, `SortControls`, `ResultsHeader`, `StoryGrid`, `Pagination` and the hooks stay client. This trims hydration work more than bytes.
- `next.config.ts`: add `experimental.optimizePackageImports: ["lucide-react"]` only if a build analysis shows lucide is not already tree-shaken (Next 16 does this by default; verify before adding).
- Avatar `<img>` in `UserMenu.tsx:36`: add `loading="lazy" decoding="async"`; not worth `next/image`.
- `/saved`: `listBookmarks` is unbounded (`src/lib/bookmarks/queries.ts:59-65`). Add `.limit(200)` now; paginate only if anyone exceeds it.

---

## Not doing (and why)

- Moving off `iad1` or pinning `preferredRegion`: Algolia (US) and the CDN are the external hops; TTFB is already ~100 ms. Revisit only if the Supabase project turns out to be outside the US.
- Increasing `cacheLife` beyond `minutes` for `/`: `minutes` = stale 5 m / revalidate 1 m / expire 1 h (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md:143`). Fresher is a product goal here; the cost is hidden behind the shell anyway.
- Virtualizing the grid: 30 cards is fine once they stop blurring and animating.
- Changing `HITS_PER_PAGE`: sorts `points/comments/date_asc` run client-side over the current 30 hits (`src/lib/search/algolia.ts:86`), which is a correctness quirk, not a perf issue. Note it, leave it.

## Verification

Run per PR, on the Vercel preview (previews are SSO-protected: use `vercel curl` or the OIDC header per `Plans/fizzy-cooking-backus.md`), then on prod after merge.

1. **Gate:** `~/.claude/scripts/ci-local.sh` (lint → typecheck → vitest with 100 % thresholds → jscpd), sequentially.
2. **Server:** 10× `curl -w '%{time_starttransfer} %{time_total}'` on `/`, `/?query=tokyo…`, `/?page=1…`; expect TTFB unchanged (~100–180 ms) and `x-vercel-cache: HIT`. `curl -s / | grep -c line-clamp-3` must still be 30 (stories server-rendered).
3. **Client, before/after on the same machine** with `/browse` (gstack headless Chrome) or Chrome DevTools Performance panel, CPU 4× throttle:
   - First load: LCP and Total Blocking Time; count of `animate-pulse`/`backdrop-blur` nodes (`document.querySelectorAll('[class*=backdrop-blur]').length` → 0–1).
   - Type "tokyo" in the search box: Network panel must show **one** `/?query=…` RSC request and **zero** direct `hn.algolia.com` requests per debounced query (after 1B), and the grid must not unmount to skeletons.
   - Frame rate while scrolling the grid: no long frames > 50 ms.
4. **Signed-in path:** log in via GitHub on the preview; `/` should stream cards before the bookmark buttons appear; toggle a bookmark and confirm only that card re-renders (React DevTools "highlight updates").
5. **Speed Insights:** compare p75 LCP/INP/CLS in the Vercel dashboard 24 h after each prod deploy (the MCP connector is authed to a different Vercel scope, so this is a dashboard check).
6. **Manual, once:** confirm the Supabase project region in its dashboard (account `kland7@wgu.edu`); if it is not a US region, note it as the next candidate.
