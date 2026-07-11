#!/usr/bin/env bash
# Health check para cron, PM2 o monitoreo externo (UptimeRobot, etc.)
set -euo pipefail

BASE_URL="${1:-${APP_URL:-http://localhost:3000}}"
TOKEN="${HEALTH_CHECK_TOKEN:-}"

URL="${BASE_URL%/}/api/health?detailed=1"
CURL_ARGS=(-fsS --max-time 10)

if [[ -n "$TOKEN" ]]; then
  CURL_ARGS+=(-H "X-Health-Token: ${TOKEN}")
fi

RESPONSE="$(curl "${CURL_ARGS[@]}" "$URL")"
STATUS="$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)"

if [[ "$STATUS" != "ok" ]]; then
  echo "Health check FAILED: $RESPONSE" >&2
  exit 1
fi

echo "Health check OK: $RESPONSE"
