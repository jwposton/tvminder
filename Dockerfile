# syntax=docker/dockerfile:1

# AWS public ECR mirror of Docker Hub library images — more reliable in CI than registry-1.docker.io
FROM public.ecr.aws/docker/library/node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
ARG APP_VERSION
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV APP_VERSION=${APP_VERSION}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/tvminder.db

# node:20-alpine already provides node:node at uid/gid 1000
RUN mkdir -p /data \
  && chown node:node /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/cron-refresh.sh docker/scheduled-refresh.sh /docker/
RUN npm install --no-save prisma@6.19.3 \
  && chmod +x /entrypoint.sh /docker/cron-refresh.sh /docker/scheduled-refresh.sh \
  && chown -R node:node /app

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
