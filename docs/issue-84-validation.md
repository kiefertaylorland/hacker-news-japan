# Issue 84: validation and evidence

Design and inventory: [approved editorial direction](plans/issue-84-editorial-ui.md).
Baseline: `dbc5156`. No deployment or production-metric improvement is claimed.

## Behavior and interfaces

- Shared editorial story rows replace the search/saved/recommendation cards and
  profile story list; routes, article destinations and backend contracts remain.
- `useSearch` adds `retry()` and `reset()`. Errors keep the last successful
  response; the dashboard explicitly labels previous results and disables stale
  pagination until retry/recovery. Existing debounce, cancellation, history and
  date presets remain.
- `useOptimisticBookmarks` adds per-story `pendingIds`, `errors`, `message`, and
  `retryFailed(id)`. Requests for the same story are locked; different stories
  remain usable. Failed operations roll back independently, remain retryable
  after leaving results, and retain their original save/unsave intent after an
  ambiguous response followed by server revalidation.
- Saved-list removal moves focus to its stable heading; a failure restores focus
  to the row when the user has not moved to another task. Filter-chip removal
  keeps focus in the filter region. The shell supplies a skip link.
- GitHub/sign-out forms expose pending state and prevent duplicate submissions.
  Saved/profile/discussion use shared loading, empty and recovery treatments.
  Offline feedback uses the browser connectivity signal and does not promise
  detection of every network failure.
- Removed the unused Radix separator wrapper and dependency after the card
  replacement. No new runtime dependencies or database migrations.

## Verification matrix

| Area | Automated evidence | Manual visual evidence |
| --- | --- | --- |
| Search/filter/sort/pagination | Hook coverage for URL/history, cancellation, client-sort cache, retry/reset; browser refresh/failure/empty/history/chips flow | Pending |
| Save/unsave | Duplicate lock, independent concurrent mutations, rollback, retry, lost-response intent, revalidation; real DB persistence and browser failure injection | Pending |
| Shared screens/auth | Component/server-page coverage, OAuth return path, sign-out, saved recommendations, profile activity, discussion/comments/votes | Pending |
| Accessibility/responsiveness | Accessible status/focus assertions; browser reduced-motion, skip link, offline and overflow checks at 320/390/768/1440px | Full keyboard/touch and visual inspection pending |

The repository keeps its existing 100% unit-coverage thresholds. Integration and
browser tests use a separate `hacker-news-japan-issue84` Supabase project on
55480–55489, app port 43184 and fake GitHub port 44184. Existing project stacks
are not stopped or reset. The browser config accepts `PORT` and
`FAKE_GITHUB_PORT`; defaults remain 3000/4010.

## Contrast and motion

Source-level contrast calculations for the default surfaces: body 15.16:1,
muted text 8.59:1, slate metadata 6.91:1, orange 6.03:1, error text 9.36:1.
These checks cover the named text colors, not every composited state; they do
not establish complete WCAG conformance. Low-contrast slate-500 labels were
replaced with the shared muted token across scoped screens.

Motion tokens are 140/180/220ms. Reduced motion disables animations,
transitions and smooth scrolling. Controls remain usable without entrance
animations; touch controls have a minimum 44px target under coarse pointers.
Ambient animation, scroll storytelling, 3D, sliders, steppers and calculators
are deliberately excluded because they do not serve existing reading tasks.

## Performance reproduction

Use an unchanged baseline checkout and the implementation checkout, each built
with the same local Supabase environment and dependency versions. Start each
production server on its own localhost port. From the implementation checkout:

```sh
BASE_URL=http://localhost:43185 BUILD_DIR=/private/tmp/hnj-84-baseline/.next \
  OUTPUT_PATH=/private/tmp/hnj-84-before-perf.json node scripts/measure-ui.mjs
BASE_URL=http://localhost:43184 BUILD_DIR=.next \
  OUTPUT_PATH=/private/tmp/hnj-84-after-perf.json node scripts/measure-ui.mjs
```

Provide the three local Supabase test variables to measure save feedback with a
synthetic user, deleted afterward. Without authentication the script reports
save as NOT RUN. It refuses synthetic user creation or save writes against a
non-local app/database. No credential/session data enters its JSON output.

The script defaults to five fresh browser contexts at 1280×900. It records
Next.js script requests through load + 1s, sums raw and gzip-9 build bytes,
observes CLS windows, stubs client Algolia responses, and measures search
input-to-results-frame (including the 300ms debounce) and save
click-to-optimistic-frame. Hosted telemetry scripts are excluded. Server-side
content and latency remain live. Timings are lab proxies, not production INP.

## Evidence limits

Interceptor preflight failed: no connected test-browser context and no configured
test Chrome profile for automatic launch. Desktop/mobile screenshots and direct
visual verification could not be captured through the required tool. Automated
browser checks do not replace that evidence or establish full WCAG 2.2 AA.
Production traffic and Vercel real-user metrics have not been measured.

## Executed checks

- Baseline: 376 tests in 48 files; lint/types/duplication/unused checks passed.
  The first build failed because Turbopack cannot compile dependencies linked
  outside the worktree. Installed the lockfile locally, then built the unchanged
  baseline successfully in a temporary copy.
- Implementation: `VITEST_MAX_WORKERS=2 npm run verify` passed: 415 tests in
  52 files, 100% statements/branches/functions/lines, lint, types, duplication,
  unused-code/dependency checks, and production build.
- Integration: four files, 12 tests passed against the isolated local database.
- Source review: independent reviewer findings on overflow, saved recovery,
  off-screen errors and ambiguous-response retries were fixed and rechecked.
  Primary actions follow current labels; retry actions replay original intent.
- Browser: all nine cases passed after the final source changes, including real
  OAuth return paths, saved persistence, profile/comments/votes, request-failure
  injection, retry, filters/date/sort/pagination/history, 320–1440px overflow,
  reduced motion, offline feedback and skip-link focus. The final run also
  emulates a coarse pointer, uses real taps and checks 44px target heights at
  all four widths.
- Changed-source mutation gate passed at **96.47%** with the existing 95%
  threshold: 629 killed, 23 survived, zero timeouts or uncovered mutations.
  The initial run scored 93.25%; added behavior assertions for retained-result
  messaging, empty-state visibility, pagination locks, repeated retry, tab order,
  focus recovery, initial status and SSR offline feedback. The supported Stryker
  incremental cache reused 219 unchanged results and reran the affected results.
  No thresholds, exclusions or production code were changed to raise the score.
  No remote CI result is claimed.

The final desktop/mobile screenshot and manual accessibility signoff remain
pending because the required Interceptor browser context is unavailable.


## Five-run performance comparison

Chromium 153.0.8010.12; Node 24.18.1; 1280×900; fresh contexts; same local
Supabase stack and measurement script. Measurements ran without concurrent
verification jobs. Raw reports: [before](performance/issue-84/before.json) and
[after](performance/issue-84/after.json).

| Median metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Next startup JavaScript, gzip bytes | 275,000 | 287,119 | +4.41% |
| Next startup JavaScript, raw bytes | 862,237 | 889,899 | +3.21% |
| Initial CLS | 0 | 0 | unchanged |
| Final observed CLS | 0 | 0.009 | below 0.1 limit |
| Search input → results frame | 323.5 ms | 326.5 ms | +0.93% |
| Save click → optimistic frame | 47.6 ms | 47.5 ms | -0.21% |

Startup bytes include Next route-prefetch/deferred script requests in the fixed
observation window. The added UI/recovery behavior has a measured payload cost;
all measured increases remain below the agreed 5% investigation threshold.
Search timings include the existing 300ms debounce. These results do not prove
production INP, a Vercel score change, or equivalent behavior on slower devices.

During harness development, waiting for the complete streamed action body could
hang after feedback appeared. The final script uses bounded HTTP-header success
checks; actual persistence is verified by the browser suite. Temporary local
users from interrupted runs were removed; completed runs delete their user.


After verification, the temporary production servers and isolated database were
stopped. An admin readback confirmed zero remaining synthetic users. The final
touch-device regression run also passed all nine cases; its temporary test
stack was then stopped again.
