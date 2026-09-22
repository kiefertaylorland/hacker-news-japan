# jscpd: local pre-push gate + fix current duplication

## Context

jscpd is already configured (`.jscpd.json`, threshold 2.5% line-based) and already gates PRs via the last step of `.github/workflows/ci.yml` (`npm run cpd`). The problem is twofold:

1. **No local enforcement.** Husky is installed and `.husky/pre-push` already runs `npm test`, but nothing runs jscpd before a push — duplication is only discovered after pushing, when CI fails. That's the literal ask: "create a hook for PRs that ensures the threshold remains below 2.5%."
2. **The repo is currently over threshold.** A fresh local run (`npx jscpd src tests --config .jscpd.json`) confirms real duplication at **3.81%** (186 duplicated lines / 4883 total), exit code 1 — this isn't a flaky/false failure, CI is correctly failing right now. Adding a hook without fixing this would just block every push immediately. All 38 flagged clones are in `*.test.ts(x)` files; zero duplication in `src` production code.

Both parts are in scope per user confirmation: add the hook to the existing `pre-push` file, and fix the underlying duplication so the new hook (and CI) actually pass.

Of the ~10 duplication clusters jscpd flags, investigation (3 parallel Explore passes reading the actual overlapping code) found most are **not real copy-paste** and shouldn't be touched:
- `lib/constants.ts` vs `tests/lib/constants.test.ts` — necessary literal re-assertion for an equality test.
- Import-block "duplication" across `components/search/*.test.tsx`, `Dashboard.test.tsx`/`SavedStories.test.tsx`, `saved-page.test.tsx` — coincidental, same RTL/vitest import boilerplate every test file has.
- `lib/search/params.test.ts` vs `lib/utils.test.ts` — structurally similar assertions on unrelated data, not shared code.
- A couple of narratively-distinct steps inside `useOptimisticBookmarks.test.tsx` and `useSearch.test.tsx` that only share a short idiom (e.g. "resolve a stale promise, assert it's ignored") — extracting would hurt readability more than it helps.

The remaining clusters are genuine copy-paste and are what this plan fixes. Fixing only these brings duplicated lines from 186 down to roughly ~70-75 (well under the ~122-line ceiling for 2.5%), giving comfortable margin rather than skating right at the threshold.

## Part 1 — Local pre-push hook

Edit `.husky/pre-push` (currently just `npm test`) to also run the duplication check, chained so a failing test suite doesn't get masked by cpd still running:

```
npm test && npm run cpd
```

`npm run cpd` already exists in `package.json` (`jscpd src tests`, reads `.jscpd.json` for the threshold). No new script needed.

## Part 2 — Fix genuine duplication

Existing conventions to follow (already established in the repo, don't introduce new patterns): shared cross-file mocks live in `tests/helpers/mockNext.ts` and `tests/helpers/mockSupabase.ts`; within-file duplication is deduped with small local helper functions declared above the `describe` block (e.g. `useSearch.test.tsx` already has `deferredResponse()`, `renderSearch()`).

**A. Auth-client mock wiring** (`tests/app/auth-actions.test.ts`, `tests/app/auth-callback.test.ts`, `tests/lib/auth/user.test.ts`) — the single biggest cluster. All three repeat:
```ts
const auth = mockAuthClient();
beforeEach(() => {
  ...reset...
  vi.mocked(createClient).mockResolvedValue({ auth } as never);
});
```
Add `withMockedAuthClient(createClient)` to `tests/helpers/mockSupabase.ts`: creates `auth = mockAuthClient()`, registers a `beforeEach` that resets every mock fn and resolves `createClient` to `{ auth }`, returns `auth`. Each of the three test files replaces its `const auth = ...` + `beforeEach(...)` block with `const auth = withMockedAuthClient(createClient);`. (`auth-actions.test.ts` keeps its separate `beforeEach(() => headerValues.clear())` for the header mock — unrelated concern, stays as-is.) Note: `vi.mock("@/lib/supabase/server", ...)` itself must stay literally in each file — Vitest hoists `vi.mock` per-file, it can't move into a shared helper.

**B. `auth-actions.test.ts` internal duplication** (lines 40-50) — collapse the two near-identical "defaults next to home page" tests into one `it.each`, matching the `it.each` pattern already used later in the same file and in `user.test.ts`.

**C. `tests/hooks/useSearch.test.tsx`** (largest single-file cluster, ~10 clone pairs) — extend the existing local-helper pattern with:
- `renderSettledSearch()` — mock resolve + render + wait for `isLoading` to settle; absorbs 4 of the flagged pairs.
- `unmountWhilePending(mockedFn, pending, outcome)` — the 12-line "abort on unmount" setup, parameterized on which API mock and resolve/reject outcome; used by 2 tests.
- `renderWithSettledResultsThenFakeTimers()` — seed real results then switch to fake timers, used by the debounce tests.
- `renderSeededAndGoToPage(paged)` — seed + paginate setup shared by 2 "seeded server results" tests.
- `expectParamsState(result, {...})` — the 5-line param-state assertion block, used twice.
- `expectSettledResults(result, response)` — `results`/`isLoading` assertion pair, used 3x (resolves 2 flagged pairs since they key off the same source lines).

Leave the one flagged pair at lines 329-333/433-436 alone (agent-confirmed false-positive-ish: unrelated tests sharing only a 2-line idiom).

**D. `tests/hooks/useOptimisticBookmarks.test.tsx`** — add local helpers following its existing `deferred()`/`mockedToggleBookmark` pattern:
- `renderToggle(initialSavedIds = [])` — render + toggle, used 3x.
- `expectToggleResult(initial, expected)` — parameterized render/toggle/assert, replaces 2 near-duplicate tests.
- `renderWithRerenderableSavedIds()` — the `initialProps`-based render, used 2x.
- `toggleAndExpectCallCount(n)` — toggle + `waitFor(toHaveBeenCalledTimes(n))`, used 3-4x.

Leave the two agent-flagged narrative/sequential-step pairs alone (extracting would obscure the step-by-step comments explaining each wait).

**E. `tests/hooks/useDebounce.test.tsx`** — add `expectSettlesAt(result, before, after)` for the "just-before/at-delay" boundary check duplicated once (lines 28-33 vs 44-49). Small but cheap.

**F. `tests/lib/supabase/supabase.test.ts`** — the file already has a `captureCookieMethods()` helper for this exact pattern; extend it to accept an optional cookie/`setAll` param instead of the two tests (lines 117-122, 132-137) reinventing the mock inline.

## Verification

1. `npm run cpd` locally after each sub-change (A-F) — confirm duplicated-line count is dropping and no new clones are introduced by the extracted helpers themselves (helpers are single-definition, so they shouldn't create new cross-file clones).
2. Final `npm run cpd` run — must exit 0, with `percentage` comfortably under 2.5% (not just barely).
3. `npm test` — full suite still green after the refactors (behavior must be unchanged, only setup/assertion code is being shared).
4. `npm run typecheck` and `npm run lint` — clean.
5. Confirm the hook fires: make a trivial commit and run `git push --dry-run` (or inspect `.husky/pre-push` executes both commands) — verify `npm test && npm run cpd` both execute and a nonzero exit from either blocks the push.
6. Full local gate: `~/.claude/scripts/ci-local.sh` (typecheck → lint → test sequentially) plus the new `npm run cpd` step, all green, before considering this done.
