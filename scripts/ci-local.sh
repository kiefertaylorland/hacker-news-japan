#!/usr/bin/env bash
# ci-local.sh — the full local verification gate, mirroring the CI `checks` job.
# Steps run strictly sequentially (parallel runs cause flaky component-test timing)
# and stop at the first failure.
#
#   bash scripts/ci-local.sh          lint → typecheck → test → cpd → knip → build
#   bash scripts/ci-local.sh --quick  same, without the production build (used by the Claude Stop hook)
set -uo pipefail

QUICK=0
case "${1:-}" in
  --quick) QUICK=1 ;;
  "") ;;
  *) echo "Usage: ci-local.sh [--quick]" >&2; exit 1 ;;
esac

cd "$(git rev-parse --show-toplevel)" || exit 1
unset NODE_OPTIONS

step() { # $1 label, rest = command
  local label="$1"; shift
  echo "▶ $label"
  if ! "$@"; then echo "✖ $label — GATE: FAILED" >&2; exit 1; fi
}

step lint      npm run --silent lint
step typecheck npm run --silent typecheck
step test      npm test --silent
step cpd       npm run --silent cpd
step knip      npm run --silent knip
if [ "$QUICK" -eq 0 ]; then
  # Same placeholders as .github/workflows/ci.yml — the build only needs them to be well-formed.
  step build env NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_placeholder npm run --silent build
fi
echo "✔ GATE: PASSED"
