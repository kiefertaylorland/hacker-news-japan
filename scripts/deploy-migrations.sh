#!/usr/bin/env bash
# Apply committed migrations, then independently confirm history and schema health.
# --local is for disposable-stack verification; the workflow always uses --linked.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cli="${SUPABASE_BIN:-./node_modules/.bin/supabase}"
target="${1:---linked}"
case "$target" in
  --linked)
    for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID; do
      if [ -z "${!name:-}" ]; then
        echo "Missing $name. Configure the Production GitHub environment before running Database Migrations." >&2
        exit 1
      fi
    done
    if [[ ! "$SUPABASE_PROJECT_ID" =~ ^[a-z]{20}$ ]]; then
      echo "SUPABASE_PROJECT_ID must be a Supabase project reference." >&2
      exit 1
    fi
    "$cli" link --project-ref "$SUPABASE_PROJECT_ID" --yes
    ;;
  --local) ;;
  *) echo "Usage: bash scripts/deploy-migrations.sh [--linked|--local]" >&2; exit 1 ;;
esac

scratch_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/migration-deploy.XXXXXX")"
trap 'rm -rf -- "$scratch_dir"' EXIT
"$cli" migration list "$target" --output-format json > "$scratch_dir/before.json"
node "$script_dir/verify-migration-history.mjs" "$scratch_dir/before.json" --allow-pending > "$scratch_dir/plan.json"
cat "$scratch_dir/plan.json"
pending_count="$(node -e 'const fs = require("node:fs"); process.stdout.write(String(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).pending.length))' "$scratch_dir/plan.json")"

# --include-all also reconciles missing older versions; no seeds or vault changes.
"$cli" db push "$target" --include-all --skip-vault --dry-run --yes
"$cli" db push "$target" --include-all --skip-vault --yes
"$cli" migration list "$target" --output-format json > "$scratch_dir/after.json"
node "$script_dir/verify-migration-history.mjs" "$scratch_dir/after.json"
"$cli" db lint "$target" --level error --fail-on error

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "pending_count=$pending_count" >> "$GITHUB_OUTPUT"
fi
echo "Migration deployment verified ($pending_count pending migrations applied)."
