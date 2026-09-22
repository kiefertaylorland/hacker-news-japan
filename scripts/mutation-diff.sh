#!/usr/bin/env bash
# mutation-diff.sh — run StrykerJS only on src files changed relative to the base branch,
# so a PR's new/edited code must have tests that actually fail when it breaks — without the
# full-suite runtime that got mutation testing pulled from CI (#45).
#
#   BASE=main bash scripts/mutation-diff.sh   (BASE defaults to main; compares origin/$BASE...HEAD)
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
BASE="${BASE:-main}"

# Same exclusions as the `mutate` globs in stryker.config.mjs.
files=$(git diff --name-only --diff-filter=AM "origin/$BASE...HEAD" -- 'src/*.ts' 'src/*.tsx' \
  | grep -v '\.d\.ts$' | grep -v '^src/components/ui/' || true)

if [ -z "$files" ]; then
  echo "mutation:diff — no mutable src changes vs origin/$BASE, skipping."
  exit 0
fi

echo "mutation:diff — mutating:"
echo "$files" | sed 's/^/  /'
npx stryker run --mutate "$(echo "$files" | paste -sd, -)"
