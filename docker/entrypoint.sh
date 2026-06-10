#!/bin/sh
set -e

mkdir -p /data

cd /app
npx prisma migrate deploy

exec node server.js
