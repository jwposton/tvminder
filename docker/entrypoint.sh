#!/bin/sh
set -e

mkdir -p /data

cd /app
npx prisma migrate deploy

if [ -n "$CRON_SECRET" ]; then
  /docker/scheduled-refresh.sh &
else
  echo "[cron] CRON_SECRET not set — in-container scheduled refresh disabled"
fi

exec node server.js
