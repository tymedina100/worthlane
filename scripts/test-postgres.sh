#!/usr/bin/env bash
# Isolated synthetic database verification for macOS/Linux. Never uses DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")/.."
pg_bin="${WORTHLANE_POSTGRES_BIN:-/Applications/Postgres.app/Contents/Versions/17/bin}"
port="${WORTHLANE_TEST_PORT:-55439}"
[[ "$port" =~ ^[0-9]+$ ]] && (( port > 1024 && port < 65536 )) || { echo 'Invalid test port' >&2; exit 1; }
if [[ ! -x "$pg_bin/initdb" ]]; then
  pg_bin="$(dirname "$(command -v initdb)")"
fi
mkdir -p .tmp
cluster="$(mktemp -d "$PWD/.tmp/postgres-XXXXXXXX")"
started=false
cleanup() {
  if [[ "$started" == true ]]; then "$pg_bin/pg_ctl" -D "$cluster" -m fast -w stop; fi
  echo "Isolated cluster retained for diagnosis: $cluster"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$cluster" -U worthlane_test -A trust --encoding=UTF8 --locale=C
"$pg_bin/pg_ctl" -D "$cluster" -l "$cluster/server.log" -o "-h 127.0.0.1 -p $port" -w start
started=true
"$pg_bin/createdb" -h 127.0.0.1 -p "$port" -U worthlane_test worthlane_beta_test
export WORTHLANE_TEST_DATABASE_URL="postgresql://worthlane_test@127.0.0.1:$port/worthlane_beta_test"
export DATABASE_URL="$WORTHLANE_TEST_DATABASE_URL"
corepack pnpm --filter @worthlane/db db:generate
corepack pnpm --filter @worthlane/db db:migrate:deploy
corepack pnpm --filter @worthlane/api exec vitest run --config vitest.integration.config.ts
if [[ "${1:-}" == --http ]]; then node scripts/test-http.mjs; fi
