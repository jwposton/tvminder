import { prisma } from "@/lib/db";
import {
  getSeasonEpisodes,
  getTvDetails,
  getWatchProviders,
  type TmdbWatchProvidersResult,
} from "@/lib/tmdb";
import {
  getWatchmodeSourcesByTmdbId,
  isWatchmodeEnabled,
  normalizeWatchmodeSources,
} from "@/lib/watchmode";

function parseAirDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

export async function refreshShowCache(tmdbId: number, region: string) {
  const details = await getTvDetails(tmdbId);

  await prisma.showCache.upsert({
    where: { tmdbId },
    create: {
      tmdbId,
      name: details.name,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      status: details.status,
      overview: details.overview,
      lastAirDate: parseAirDate(details.last_air_date),
      nextEpisodeName: details.next_episode_to_air?.name ?? null,
      nextEpisodeAirDate: parseAirDate(details.next_episode_to_air?.air_date),
      nextSeason: details.next_episode_to_air?.season_number ?? null,
      nextEpisode: details.next_episode_to_air?.episode_number ?? null,
    },
    update: {
      name: details.name,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      status: details.status,
      overview: details.overview,
      lastAirDate: parseAirDate(details.last_air_date),
      nextEpisodeName: details.next_episode_to_air?.name ?? null,
      nextEpisodeAirDate: parseAirDate(details.next_episode_to_air?.air_date),
      nextSeason: details.next_episode_to_air?.season_number ?? null,
      nextEpisode: details.next_episode_to_air?.episode_number ?? null,
      refreshedAt: new Date(),
    },
  });

  const seasons = details.seasons.filter((s) => s.season_number > 0);
  for (const season of seasons) {
    const episodes = await getSeasonEpisodes(tmdbId, season.season_number);
    for (const ep of episodes) {
      await prisma.episodeCache.upsert({
        where: {
          tmdbShowId_season_episode: {
            tmdbShowId: tmdbId,
            season: ep.season_number,
            episode: ep.episode_number,
          },
        },
        create: {
          tmdbShowId: tmdbId,
          season: ep.season_number,
          episode: ep.episode_number,
          name: ep.name,
          airDate: parseAirDate(ep.air_date),
          stillPath: ep.still_path,
          overview: ep.overview,
        },
        update: {
          name: ep.name,
          airDate: parseAirDate(ep.air_date),
          stillPath: ep.still_path,
          overview: ep.overview,
          refreshedAt: new Date(),
        },
      });
    }
  }

  await refreshProvidersCache(tmdbId, region);

  return details;
}

export async function refreshProvidersCache(tmdbId: number, region: string) {
  const providers = await getWatchProviders(tmdbId, region);
  if (providers) {
    await prisma.watchProvidersCache.upsert({
      where: {
        tmdbShowId_region_source: {
          tmdbShowId: tmdbId,
          region: region.toUpperCase(),
          source: "tmdb",
        },
      },
      create: {
        tmdbShowId: tmdbId,
        region: region.toUpperCase(),
        providersJson: JSON.stringify(providers),
        source: "tmdb",
      },
      update: {
        providersJson: JSON.stringify(providers),
        refreshedAt: new Date(),
      },
    });
  }

  if (isWatchmodeEnabled()) {
    const sources = await getWatchmodeSourcesByTmdbId(tmdbId, region);
    if (sources.length > 0) {
      const normalized = normalizeWatchmodeSources(sources);
      await prisma.watchProvidersCache.upsert({
        where: {
          tmdbShowId_region_source: {
            tmdbShowId: tmdbId,
            region: region.toUpperCase(),
            source: "watchmode",
          },
        },
        create: {
          tmdbShowId: tmdbId,
          region: region.toUpperCase(),
          providersJson: JSON.stringify(normalized),
          source: "watchmode",
        },
        update: {
          providersJson: JSON.stringify(normalized),
          refreshedAt: new Date(),
        },
      });
    }
  }
}

export async function refreshAllMonitoredShows() {
  const shows = await prisma.monitoredShow.findMany();
  const results: Array<{ tmdbId: number; ok: boolean; error?: string }> = [];

  for (const show of shows) {
    try {
      await refreshShowCache(show.tmdbId, show.preferredRegion);
      results.push({ tmdbId: show.tmdbId, ok: true });
    } catch (e) {
      results.push({
        tmdbId: show.tmdbId,
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return results;
}

export function parseProvidersJson(json: string): TmdbWatchProvidersResult {
  return JSON.parse(json) as TmdbWatchProvidersResult;
}
