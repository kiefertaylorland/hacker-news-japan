#!/usr/bin/env bash
# e2e.sh — runs the Playwright suite against a local Supabase stack whose GitHub
# provider points at the fake GitHub server (tests/e2e/fake-github/server.mts).
#
#   bash scripts/e2e.sh [playwright args…]
#
# (Re)starts Supabase with the override, since a stack started without it would
# send the browser to the real github.com. Leaves the stack running afterwards.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running — start it and retry." >&2
  exit 1
fi

# GoTrue (in Docker) calls the fake server on the host. Docker Desktop provides
# host.docker.internal; plain Docker Engine on Linux doesn't, so use the docker0 gateway.
if [ "$(uname)" = "Linux" ]; then FAKE_GITHUB_HOST=172.17.0.1; else FAKE_GITHUB_HOST=host.docker.internal; fi

# The Supabase CLI maps SUPABASE_<config.path> env vars onto config.toml keys, so
# this overrides [auth.external.github] url without touching config.toml.
export SUPABASE_AUTH_EXTERNAL_GITHUB_URL="http://${FAKE_GITHUB_HOST}:4010"
export SUPABASE_AUTH_GITHUB_CLIENT_ID=e2e-fake-client
export SUPABASE_AUTH_GITHUB_SECRET=e2e-fake-secret

npx supabase stop >/dev/null 2>&1 || true
npx supabase start -x studio,imgproxy,realtime,storage-api,edge-runtime,logflare,vector,supavisor

status=$(npx supabase status -o env)
env_value() { echo "$status" | grep "^$1=" | cut -d= -f2- | tr -d '"'; }
export NEXT_PUBLIC_SUPABASE_URL="$(env_value API_URL)"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(env_value PUBLISHABLE_KEY)"
export SUPABASE_SERVICE_ROLE_KEY="$(env_value SECRET_KEY)"

npx playwright test "$@"
