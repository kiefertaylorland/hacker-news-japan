# Issue #52 implementation plan

Add failing flat-config and lint-rule regression tests. Upgrade ESLint to supported major 10 (ESLint 9 is now deprecated); adapt Next's React plugin using the official @eslint/compat wrapper and eslint-config-next to the installed Next 16 version. Preserve TypeScript restrictions, underscore ignores, console warnings, and test overrides. Verify lint CLI/hooks, typecheck, 100% application coverage, duplication, knip, and build.

## Test-first workflow

1. Add acceptance tests and record their initial failures.
2. Implement the smallest complete behavior.
3. Run focused tests, then the full verification gate; retain all existing coverage thresholds and exclusions.
4. Review the diff, commit, push and create a PR referencing the issue.

## Results

- Red: the new flat-config acceptance test failed before migration; the legacy rule fixtures passed.
- Green: 225 tests pass with 100% statements, branches, functions and lines.
- `npm run verify` passes (lint, typecheck, coverage, duplication, knip, production build).
- `npm ci --dry-run --ignore-scripts` succeeds. Next 16.3.4's legacy React/import/accessibility plugins still declare ESLint 9 peers, so npm emits warnings; the official `@eslint/compat` adapter preserves runtime compatibility with supported ESLint 10.
- A file-scoped override retains the existing URL/loading synchronization effects in `useSearch.ts`; all original TypeScript restrictions remain enabled.
