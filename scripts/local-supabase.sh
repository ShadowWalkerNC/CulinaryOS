#!/usr/bin/env bash
# ============================================================
# CulinaryOS — local Supabase data plane helper (M2)
#
# Starts `supabase start` (Docker), prints the keys to drop into
# .env, reminds you to push migrations, and runs `pnpm seed`.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "[local:supabase] Supabase CLI not found."
  echo "  Install: https://supabase.com/docs/guides/cli"
  echo "  Or:      npm i -g supabase"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[local:supabase] Docker is required for \`supabase start\`."
  exit 1
fi

echo "[local:supabase] Starting local Supabase (Docker)…"
supabase start

echo
echo "[local:supabase] Status / keys:"
supabase status

API_URL="$(supabase status -o env 2>/dev/null | sed -n 's/^API_URL=//p' | tr -d '"' || true)"
ANON_KEY="$(supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY=//p' | tr -d '"' || true)"
SERVICE_ROLE_KEY="$(supabase status -o env 2>/dev/null | sed -n 's/^SERVICE_ROLE_KEY=//p' | tr -d '"' || true)"
DB_URL="$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL=//p' | tr -d '"' || true)"

cat <<EOF

[local:supabase] Put these into .env (and matching VITE_* client vars):

  SUPABASE_URL=${API_URL:-http://127.0.0.1:54321}
  SUPABASE_ANON_KEY=${ANON_KEY:-<from status>}
  SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY:-<from status>}
  DATABASE_URL=${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}
  VITE_SUPABASE_URL=${API_URL:-http://127.0.0.1:54321}
  VITE_SUPABASE_ANON_KEY=${ANON_KEY:-<from status>}
  VITE_TENANT_ID=00000000-0000-0000-0000-000000000001
  AUTH_RELAXED=false

Migrations: already applied by \`supabase start\` when files live in supabase/migrations/.
If you need a reset:  supabase db reset

EOF

if [[ -n "${SERVICE_ROLE_KEY:-}" || -n "${DB_URL:-}" ]]; then
  echo "[local:supabase] Seeding demo tenant + menu…"
  export SUPABASE_URL="${API_URL:-http://127.0.0.1:54321}"
  export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"
  export DATABASE_URL="${DB_URL:-}"
  pnpm seed || {
    echo "[local:supabase] Seed failed — fix .env / migrations and re-run: pnpm seed"
    exit 1
  }
else
  echo "[local:supabase] Could not parse keys from \`supabase status -o env\`."
  echo "  Copy them manually into .env, then run: pnpm seed"
fi

echo
echo "[local:supabase] Done. Start the API + clients (or \`docker compose up --build\`)."
echo "  POS fire → KDS tickets now hit real kitchen_tickets when Supabase is configured."
