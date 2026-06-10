# TVMinder

Self-hosted TV show tracker for families. Monitor your shows, track watched episodes, tag your list, and filter by upcoming or newly released episodes — with streaming availability by country.

## Features

- Separate accounts per family member (own watch lists, tags, and progress)
- Search and add shows via [TMDb](https://www.themoviedb.org/)
- Mark seasons/episodes watched; custom tags
- Filter views: upcoming, recently aired, newly released unwatched
- Regional streaming availability (TMDb; optional Watchmode upgrade)
- SQLite database persisted via a bind-mounted `./data` directory

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A free [TMDb API key](https://www.themoviedb.org/settings/api) (API Read Access Token)

## Quick start

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
TMDB_API_KEY=your_tmdb_read_access_token
CRON_SECRET=a-long-random-string
DATABASE_URL=file:/data/tvminder.db
```

### 2. Start TVMinder

**From a published release (recommended):**

```bash
docker compose -f docker-compose.prod.yml up -d
```

**Build from source:**

```bash
docker compose up --build -d
```

### 3. Open the app

Visit `http://<your-host>:3000` and create an account at **Sign up**. Each family member should register their own account.

| Image | Use case |
|-------|----------|
| `ghcr.io/jwposton/tvminder:latest` | Latest stable release |
| `ghcr.io/jwposton/tvminder:0.1.0` | Pin to a specific version |

If the GHCR package is private, run `docker login ghcr.io` first, or make the package public under GitHub → Packages → tvminder → Package settings.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TMDB_API_KEY` | Yes | — | TMDb API Read Access Token (one key serves all users) |
| `DATABASE_URL` | Yes | `file:/data/tvminder.db` | SQLite path inside the container |
| `CRON_SECRET` | Recommended | — | Bearer token for the nightly refresh endpoint |
| `WATCHMODE_API_KEY` | No | — | Richer streaming data and deep links |

Show metadata is shared across users and cached server-side. Watch lists, tags, watched state, and region preferences are per account.

## Data persistence

Application data is stored in `./data/tvminder.db` on the host (bind-mounted to `/data` in the container). The process user is set in `docker-compose.prod.yml` via `user: "1000:1000"` — ensure `./data` is writable by that uid on first deploy:

```bash
mkdir -p data
chown 1000:1000 data   # or your deploy user's uid if it is 1000
```

```bash
# Back up the database
cp data/tvminder.db data/tvminder.db.bak
```

To reset completely, stop the stack and remove the database file:

```bash
docker compose -f docker-compose.prod.yml down
rm -f data/tvminder.db
```

## Keeping show data fresh

Episode schedules and streaming providers are cached and should be refreshed periodically.

**From the UI:** Settings → Refresh All Shows

**Via cron (recommended for always-on deployments):**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://<your-host>:3000/api/cron/refresh
```

Schedule that daily with cron, systemd timer, or your orchestrator.

## Updating

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Database migrations run automatically on container start.

To pin a version, set the image tag in `docker-compose.prod.yml`:

```yaml
image: ghcr.io/jwposton/tvminder:0.1.0
```

## Optional: Watchmode

For episode-level streaming deep links and fresher catalog data, sign up at [api.watchmode.com](https://api.watchmode.com/) and add `WATCHMODE_API_KEY` to `.env`, then restart the container.

## Attribution

This product uses the [TMDb API](https://www.themoviedb.org/) but is not endorsed or certified by TMDb.

## Development

For local development without Docker, see [DEVELOPMENT.md](DEVELOPMENT.md).

## License

[MIT](LICENSE) — see `LICENSE` for details.

TMDb and Watchmode have their own API terms of use; this app is not endorsed by TMDb.
