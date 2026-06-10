# Development Guide

Instructions for running TVMinder locally without Docker — useful for contributing or testing changes.

## Prerequisites

- Node.js 20+
- npm
- [TMDb API key](https://www.themoviedb.org/settings/api)

## Setup

```bash
cp .env.example .env
# Set TMDB_API_KEY in .env (DATABASE_URL=file:./dev.db for local SQLite)

npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account at `/signup`.

## Common commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run refresh` | Refresh all monitored shows from TMDb |

## Manual data refresh

```bash
npm run refresh

# Or via API (set CRON_SECRET in .env)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/refresh
```

## Docker (local build)

To test the production container locally:

```bash
docker compose up --build -d
```

See [README.md](README.md) for deployment-focused Docker instructions.

## Publishing a release

Tagged pushes build and publish multi-arch images to GHCR:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The [Docker Release](.github/workflows/docker-release.yml) workflow publishes:

- `ghcr.io/jwposton/tvminder:0.1.0`
- `ghcr.io/jwposton/tvminder:0.1`
- `ghcr.io/jwposton/tvminder:0`
- `ghcr.io/jwposton/tvminder:latest`

## Tech stack

- Next.js App Router + TypeScript
- Prisma + SQLite
- TMDb API (primary metadata)
- Watchmode API (optional streaming upgrade)

## Project structure

```
src/
  app/           # Pages and API routes
  components/    # UI components
  lib/           # TMDb client, auth, cache, filters
prisma/          # Schema and migrations
docker/          # Container entrypoint
```
