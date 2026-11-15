# Issue 84: editorial dark interface

## Approved direction and inventory

Keep the existing dark-only, English interface, orange identity, date presets,
URLs, OAuth, bookmarks, comments, votes, and recommendation algorithm. Unify
search, saved stories, recommendations, profile and story discussions around
compact editorial rows, restrained surfaces and readable hierarchy.

| Surface | Before | Required change |
| --- | --- | --- |
| Search | Three-column cards, URL-backed filters, initial skeletons, retained content during refresh | Single-column rows, active-filter chips/reset, visible refresh feedback and retry without deleting previous results |
| Save/unsave | Optimistic toggles without exposed pending/error state | Per-story request lock, rollback, retry, concise status and focus recovery |
| Saved/recommendations | Shared cards; errors require manual refresh | Shared rows, browse CTA, distinct unavailable/empty recommendations and retry |
| Profile | Plain table and independent lists; bare loading text | Shared shell, useful empty states and consistent story rows |
| Discussion | Bare loading state and separate header | Shared navigation, readable content width, missing/error recovery |
| Auth/navigation | Per-page menus without submission feedback | Consistent navigation and pending GitHub/sign-out controls |

## Shared design and interaction rules

- Charcoal background, slightly raised surfaces, muted borders, orange used for
  selection and focus. Remove the background grid and glow treatment.
- System sans with Japanese fallbacks; serif Japanese masthead. Base reading
  size 16px, story titles 16–18px, metadata 12–14px. Use a 4px spacing rhythm.
- One story list column at every width; title first, then source/type and
  metadata. Discussion prose has a narrower measure. Controls wrap on mobile;
  no horizontal scrolling at 320px. Touch controls target 44px.
- Visible focus ring on all interactive elements; selected states use text or
  shape in addition to color. Hover-only details are prohibited.
- Press/selection transitions 140–220ms; content is immediately visible.
  Reduced motion disables transitions, animations and smooth scrolling.
- Initial loading uses geometry-matched skeletons; refresh retains content and
  announces progress. Failures retain input and label prior results accurately.
- Bookmarks flip optimistically, lock each story until settlement, recover on
  error and offer retry. Other stories remain independently usable. Removed
  rows recover focus to an adjacent control and return focus on rollback.
- Preserve existing URL defaults/history/debounce/cancellation and page-reset
  rules. Active chips remove one filter; reset restores existing defaults.
- Detect offline only from the browser's connectivity signal; it is a hint,
  never a substitute for handling request errors.

No density settings, card/list switch, new date picker, DB migration or new
runtime dependency. Ambient backgrounds, scroll storytelling, sliders,
steppers, calculators and 3D have no concrete role in these reading flows and
are deliberately excluded.

## Execution and acceptance

1. Capture baseline checks and production-build size; document evidence limits.
2. Implement shared tokens, shell, rows and skeletons.
3. Implement search/reset/retry and bookmark feedback/recovery.
4. Apply shared rules to saved/recommendations, profile, discussion and auth.
5. Cover success/pending/empty/error/retry, failed optimistic updates, duplicate
   prevention, stale searches, history and signed-out behavior in tests.
6. Run repository lint/typecheck/100%-coverage/duplication/unused/build gate,
   relevant integration and browser flows; independently review the final diff.
7. Capture desktop/mobile screenshots and check keyboard, focus, status,
   contrast, touch and reduced motion. Compare five identical lab runs for
   startup JS, CLS and interaction response; investigate >5% increases or
   CLS >0.1. Do not claim production metric improvements from lab data.

## Evidence

Baseline commit: `dbc5156`. Implementation evidence and unresolved verification
limits are recorded in `docs/issue-84-validation.md`.
