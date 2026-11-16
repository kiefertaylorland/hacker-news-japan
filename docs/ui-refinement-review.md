# UI review and refinement, 2026-11-15

Reviewed the editorial interface at baseline `83ded6e`, focusing on the shared
shell, search controls, story rows, and their use by search, saved, profile and
discussion pages. Preserved the existing wording, dark palette, reading layout
and application behavior.

## Findings and corrections

| Priority | Source finding | Refinement |
| --- | --- | --- |
| Medium | Main navigation exposes identical links on every page, without a current-page state. | Search, Saved and Profile now identify the current page with `aria-current`, a raised background and an orange underline. Loading, error and signed-out states retain the same selection. Discussions leave these destinations unselected. |
| Medium | Story-row hover feedback is inside the no-preference motion query. Its focus border also has no visible row border to color. | Hover and keyboard focus use a row background independently of motion preference. Reduced motion continues to disable transitions and animations. |
| Low | Clear search shrinks to 24px at desktop widths. Its mobile 44px button also sits inside an addon with 12px of vertical padding in a 52px field. | Keep a 44px target at every width and remove the clear-button addon's vertical padding. Existing clear-and-refocus behavior remains. |
| Low | Shared header flex children lack explicit shrinking and long-token wrapping rules. This is a source-level overflow risk, not a reproduced visual failure. | Allow title content to shrink and wrap long tokens; reserve space for the account controls. |
| Medium | At 1440px, the desktop filter row squeezes story types into two lines while date and sort controls compete for width. Confirmed in Brave. | Give sorting its own row and apply the same structure to the loading shell. |

## Verification

- Added navigation behavior checks for all three destinations, discussion pages
  with no selected destination, and the skip-link target.
- Source-token contrast calculations against the selected navigation background:
  foreground text **11.23:1**; orange underline **4.76:1**. These are calculations
  from the actual CSS tokens, not a complete rendered contrast audit.
- Checked affected copy and icons: existing labels, search and clear affordances
  remain; no additional promotional copy, decorative icons or motion introduced.
- `VITEST_MAX_WORKERS=2 npm run verify` passed: lint, typecheck, 419 tests in
  53 files, 100% statement/branch/function/line coverage, duplication and unused
  code checks, and the production build. `git diff --check` also passed.

## Browser evidence and remaining limits

Interceptor's initial preflight exited 5, and the Codex browser-extension host
was unavailable. The user subsequently authorized alternative browser tools.
Used agent-browser with a fresh, isolated Brave process against the local
production preview at `http://localhost:43186`, without signing in.

- Inspected dashboard screenshots at 1440px, 390px and 320px, including the
  lower story list and mobile pagination; signed-out Saved and Profile at 390px.
- Rebuilt and inspected the final dashboard at 1440px, 768px and 390px; all
  story-type filters share one row at desktop width. Sorting has its own row.
- Measured no horizontal overflow in the final dashboard at 320px/768px/1440px,
  the mobile dashboard at 390px, or the
  signed-out account pages checked. Checked the visible navigation selection.
- Entered a live search and cleared it: the clear button measured 44 by 44px,
  input returned to an empty value, and focus returned to the search field.
- Used Tab and Enter to reach and activate the skip link; focus reached
  `main-content`.
- Emulated reduced motion and focused a story link: row background remained
  `rgb(44, 44, 48)`, transition duration was `0s`, and the link retained a solid
  focus outline.

The preview uses placeholder Supabase settings. Live Algolia search works,
but votes report their expected database-loading error. Authenticated saved
lists, account data, voting, bookmarks and full discussion rendering are outside
this browser evidence. No full-accessibility or production-performance claim
is made. Captures are saved under `/private/tmp/hnj-refinement-*.png`.

The final verification gate passed after the control-layout adjustment: 419
tests, 100% coverage and the production build. An earlier sandboxed retry could
not bind the schema tests' local HTTP servers (`listen EPERM`); rerunning with
the authorized sandbox permission resolved it without source/test changes.
Closed the isolated Brave session and stopped the temporary preview afterward.

Final captures are local artifacts, not repository attachments:
`hnj-refinement-desktop-final.png`, `hnj-refinement-tablet-final.png`, and
`hnj-refinement-mobile-final.png`, under `/private/tmp/` on the review machine.
