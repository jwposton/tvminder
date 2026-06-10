#!/bin/sh
# Background loop: daily refresh at CRON_REFRESH_HOUR (default 03:00 container local time).

REFRESH_HOUR="${CRON_REFRESH_HOUR:-3}"
PORT="${PORT:-3000}"
BASE_URL="http://127.0.0.1:${PORT}"

seconds_until_hour() {
  target_hour=$1
  h=$(date +%H)
  m=$(date +%M)
  s=$(date +%S)
  now=$((10#$h * 3600 + 10#$m * 60 + 10#$s))
  target=$((10#$target_hour * 3600))
  if [ "$now" -lt "$target" ]; then
    echo $((target - now))
  else
    echo $((86400 - now + target))
  fi
}

echo "[cron] Scheduled refresh enabled (daily at ${REFRESH_HOUR}:00)"

while ! wget -q -O /dev/null "${BASE_URL}/api/version" 2>/dev/null; do
  sleep 5
done

while true; do
  wait_secs=$(seconds_until_hour "$REFRESH_HOUR")
  echo "[cron] Next refresh in ${wait_secs}s"
  sleep "$wait_secs"
  /docker/cron-refresh.sh
done
