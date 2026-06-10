#!/bin/sh
# Calls the app refresh endpoint (requires CRON_SECRET and a running server).

PORT="${PORT:-3000}"
BASE_URL="http://127.0.0.1:${PORT}"

if [ -z "$CRON_SECRET" ]; then
  exit 0
fi

if ! wget -q -O /dev/null "${BASE_URL}/api/version" 2>/dev/null; then
  echo "[cron] App not ready, skipping refresh" >&2
  exit 1
fi

if wget -q -O- \
  --header="Authorization: Bearer ${CRON_SECRET}" \
  "${BASE_URL}/api/cron/refresh"; then
  echo "[cron] Refresh completed at $(date -Iseconds 2>/dev/null || date)"
else
  echo "[cron] Refresh failed at $(date -Iseconds 2>/dev/null || date)" >&2
  exit 1
fi
