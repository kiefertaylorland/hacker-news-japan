# Plan: get `/` load time under 300 ms

## Context

Goal (session `/goal`): improve app load times until they are under 300 ms.

**Baseline (production, `https://hacker-news-japan.vercel.app`, curl from SF, 10 runs):**

| Metric | Now |
|---|---|
| HTML TTFB p50 / p90 | ~205 ms / ~295 ms (one outlier 665 ms) |
| Vercel cache | `MISS` on every request, `cache-control: private, no-store` |
| Story cards in the HTML | 0 — stories are fetched **client-side** after hydration |
| Algolia HN API direct latency | 400–780 ms |
| Client JS on `/` | ~240 KB brotli across 10 chunks |

So the user-visible load is: dynamic HTML (~200 ms) → download + hydrate ~240 KB JS → `useSearch` effect → Algolia (400–800 ms) → cards animate in. Content is on screen well after 1 s. The HTML TTFB alone hovers right at the 300 ms line and is fully dynamic.

Root causes (from exploration):
- `src/app/page.tsx` awaits `searchParams`, `getCurrentUser()` and `getBookmarkIds()` **sequentially, above** its `<Suspense>`, so nothing streams and every request is dynamic.
- Stories are only fetched in `src/hooks/useSearch.ts` (`"use client"`, inside `useEffect`). No server fetch, no caching anywhere (`fetch` has no `cache`/`revalidate`).
- `next.config.ts` is empty: no Cache Components.
- `src/app/saved/page.tsx` has the same blocking shape.
- Auth is cheap: the Supabase project uses ES256 signing keys, so `getClaims()` verifies locally and JWKS is cached module-globally by `@supabase/auth-js`. The proxy is **not** the bottleneck; leave it alone.

**Definition of "load time" used for the goal** (stated assumption): the HTML document for `/` must arrive with **TTFB p50 < 300 ms** measured with curl against the Vercel deployment, **and** that document must already contain the server-rendered story cards so the first paint is content, not skeletons. Secondary check: LCP measured in a headless browser on the deployment.

## Approach

Enable Next 16 **Cache Components** and restructure `/` so the static shell is prerendered/CDN-served, the default story list is fetched **on the server** through a `"use cache"` function (Vercel Data Cache, 5-minute life), and only the per-user bits (`user`, `savedIds`) stream at request time. Seed `useSearch` with the server results so the client does not refetch on mount.

### 1. `next.config.ts`
```ts
const nextConfig: NextConfig = { cacheComponents: true };
```

### 2. Extract URL-param parsing to a shared server-safe module
New `src/lib/search/params.ts` (no directive). Move from `src/hooks/useSearch.ts`:
- `readSearchParams(searchParams: URLSearchParams): SearchParams`
- `sameSearchParams(a, b)`
- `toSearchUrl(params)`
Add `searchParamsFromRecord(record: Record<string, string | string[] | undefined>): URLSearchParams` (first value wins for arrays) so the page can reuse `readSearchParams`.
`useSearch.ts` imports these instead of defining them. Behaviour unchanged.

### 3. Cached server fetch
New `src/lib/search/cached.ts`:
```ts
import { cacheLife } from "next/cache";
import { searchStories } from "./api";
export async function getCachedStories(params: SearchParams): Promise<AlgoliaResponse> {
  "use cache";
  cacheLife("minutes");   // 5 min revalidate, 1 min stale, 1 h expire
  return searchStories(params);
}
```
Reuses `searchStories` (`src/lib/search/api.ts`) unchanged, including the `typeof window === "undefined"` User-Agent branch in `fetchFromAlgolia`. `Date.now()` in `getUnixTimestamp` runs inside the cached scope, which is allowed. Errors must **throw** (not return `null`) so a failed Algolia call is not cached; the caller converts to `null`.

### 4. `src/app/page.tsx` — static shell + streaming content
```tsx
export default function Home({ searchParams }: HomeProps) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: HomeProps) {
  const record = (await searchParams) ?? {};
  const search = readSearchParams(searchParamsFromRecord(record));
  const [user, initialResults] = await Promise.all([
    getCurrentUser(),
    getCachedStories(search).catch(() => null),
  ]);
  const savedIds = await getBookmarkIds(user?.id ?? null);
  return (
    <Dashboard user={user} savedIds={savedIds} initialResults={initialResults}
               authError={record[AUTH_ERROR_PARAM] !== undefined} />
  );
}
```
The skeleton becomes the prerendered shell (CDN `HIT`); user + cached stories stream in the same response. `Dashboard`'s `useSearchParams()` is now inside a Suspense boundary, which Cache Components requires.

### 5. `Dashboard` + `useSearch` accept `initialResults`
- `src/components/dashboard/Dashboard.tsx`: new optional prop `initialResults?: AlgoliaResponse | null`, passed to `useSearch(initialResults)`.
- `src/hooks/useSearch.ts`: `useSearch(initialResults: AlgoliaResponse | null = null)`.
  - `useState<AlgoliaResponse | null>(initialResults)`.
  - Keep a `useRef(params)` snapshot of the mount-time params. In the fetch effect, before creating the controller: if `initialResults && sameSearchParams({query: debouncedQuery, storyType, dateRange, sortBy, page}, initialParamsRef.current)` then `setResults(initialResults); setIsLoading(false); setError(null); return;`. This skips the mount fetch, is StrictMode-safe, and restores the server data when the user navigates back to the initial URL.
  - Everything else unchanged.

### 6. `src/app/saved/page.tsx` — same shape
Wrap the async body in `<Suspense fallback={<DashboardSkeleton />}>` via a `SavedContent` child; `getCurrentUser()` then `listBookmarks()` move into it. Without this, Cache Components fails the build on the uncached `cookies()` read outside Suspense.

### 7. Tests (100 % coverage thresholds must hold)
- `tests/lib/search/params.test.ts` (new): move the parsing cases that `tests/hooks/useSearch.test.tsx` currently covers indirectly, plus `searchParamsFromRecord` (string, array, undefined).
- `tests/lib/search/cached.test.ts` (new): mock `next/cache` (`cacheLife: vi.fn()`, add to `tests/helpers/mockNext.ts` `cacheMock`) and `@/lib/search/api`; assert it delegates and rethrows.
- `tests/app/page.test.tsx`: `Home` is now sync; render `await HomeContent(...)`-equivalent by rendering `<Home>` inside a Suspense-aware `render` and `await screen.findByText(...)`, or export `HomeContent` for direct testing. Mock `@/lib/search/cached` (resolved and rejected cases → `initialResults` passed / `null`). Keep the existing auth-error and anonymous cases.
- `tests/app/saved-page.test.tsx`: same adjustment for the Suspense wrapper.
- `tests/hooks/useSearch.test.tsx`: add cases — (a) with `initialResults` and matching params: no `searchStories` call, `results` equals the seed, `isLoading` false; (b) after a filter change it fetches; (c) returning to the initial params restores the seed without a fetch; (d) with `initialResults` but URL params that differ from the seed's params is not possible (server derives both from the same URL), so only cover the `null` default path.
- `tests/components/dashboard/Dashboard.test.tsx`: assert `initialResults` is forwarded to `useSearch` (the mock captures the argument).

### Out of scope (mention only)
- The 320 ms staggered `animate-slide-up` in `StoryCard` is a design feature; it delays visual completeness but not the load metric. Not touching it.
- Bundle trimming (`date-fns` in `utils.ts`, Radix Select) is low ROI once content is in the HTML; revisit only if the LCP check fails.
- `src/proxy.ts` stays as is (local JWT verification, no network on anonymous requests).

## Verification

1. `npm run typecheck && npm run lint && npm test` sequentially (100 % coverage gate), then `npm run build` — build must succeed with `cacheComponents` and show `/` and `/saved` as partially prerendered (static shell + dynamic holes); no "blocking-route"/"uncached data outside Suspense" errors.
2. Local smoke: `npm run start`, `curl -s localhost:3000 | grep -c news.ycombinator.com/item` > 0 (stories server-rendered); `curl -sI localhost:3000/?query=tokyo` returns 200.
3. Push the `performance` branch; Vercel creates a preview. Against the preview URL, run 10× `curl -so /dev/null -w "%{time_starttransfer}"` for `/`, `/?query=tokyo`, `/saved` and confirm **p50 < 300 ms**; check `x-vercel-cache` is `HIT`/`PRERENDER` on the shell and the body contains story cards.
4. Headless browser on the preview (gstack `/browse`): confirm cards are visible without a client Algolia request on first load, and record LCP.
5. Open a draft PR from `performance` → `main`; after merge/production deploy, re-run step 3 against production.
