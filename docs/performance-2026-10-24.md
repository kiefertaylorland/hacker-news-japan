# Performance changes, October 24, 2026

## Observed baseline

Vercel Speed Insights showed desktop RES **76** for production over the last
seven days, based on **59 events**. Individual Web Vitals were unavailable on
the current plan, so this work does not attribute that score to a specific metric.

## Changes

- Render the real dashboard heading and description in the prerendered loading
  shell, using the same header component as the completed dashboard.
- Match control placeholder heights and responsive layout to the dashboard,
  and reserve results-header space when switching between loading and results.
- Remove the story grid's 300 ms entrance fade so stories appear immediately.
- Dynamically import Sentry Replay after page load. Error reporting and tracing
  still initialize immediately, with existing sampling settings preserved.
  Replays now start after load and omit the initial loading sequence.

## Bundle comparison

Two production builds used identical environment settings, including
`NEXT_PUBLIC_VERCEL_ENV=production`, and differed only in Replay initialization.
Unique JavaScript script sources referenced by the prerendered home HTML totaled:

| Initial JavaScript | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Uncompressed bytes | 1,076,014 | 955,419 | 120,595 |
| Gzip bytes | 345,314 | 308,311 | 37,003 (10.7%) |

These are build-artifact sizes, not browser transfer measurements. Replay is
deferred, not removed; its code is downloaded later on deployed pages.

## Verification limits

Lint, type checking, duplication checks, and unused-code checks passed. All 356
unit tests passed with 100% coverage using `npm test -- --maxWorkers=2` outside
the sandbox, which blocks the schema tests' local HTTP listeners. The default
worker count produced intermittent timeouts in unchanged tests.

Chrome smoke testing confirmed story rendering and working filters in the local
production build. Local database credentials were placeholders, so votes and
authenticated database features were not verified against a live database.

No deployment or increase in real-user RES is claimed. After deployment, compare
the same desktop production view using fresh visitor events; a lab or bundle
improvement cannot establish the new RES in advance.
