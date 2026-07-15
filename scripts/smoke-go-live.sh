#!/usr/bin/env bash
# Smoke post-deploy: health + recordatorio de checks manuales multi-tenant.
# Uso: bash scripts/smoke-go-live.sh https://tu-host
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${1:-${APP_URL:-http://localhost:3000}}"

echo "==> Health ($BASE_URL)"
bash "$ROOT/scripts/check-health.sh" "$BASE_URL"

echo ""
echo "==> Smoke automático OK (health)."
echo ""
echo "Completá a mano (ver docs/GO_LIVE.md §3):"
echo "  1. Login org A + área de nombre único"
echo "  2. Login org B → esa área NO debe verse"
echo "  3. Tarea → Por aprobar → Aprobar/Devolver"
echo ""
