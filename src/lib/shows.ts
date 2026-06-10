import { parseProvidersJson } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  computeEpisodeStats,
  filterShows,
  type MonitoredShowView,
  type ShowFilter,
} from "@/lib/filters";

export async function getMonitoredShows(filter: ShowFilter = "all"): Promise<MonitoredShowView[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const shows = await prisma.monitoredShow.findMany({
    where: { userId: user.id },
    include: {
      showTags: { include: { tag: true } },
    },
  });

  const views: MonitoredShowView[] = [];

  for (const show of shows) {
    const cache = await prisma.showCache.findUnique({ where: { tmdbId: show.tmdbId } });
    const episodes = await prisma.episodeCache.findMany({
      where: { tmdbShowId: show.tmdbId },
    });
    const watched = await prisma.watchedEpisode.findMany({
      where: { userId: user.id, tmdbShowId: show.tmdbId },
    });
    const watchedKeys = new Set(watched.map((w) => `${w.season}-${w.episode}`));

    const providerCaches = await prisma.watchProvidersCache.findMany({
      where: { tmdbShowId: show.tmdbId, region: show.preferredRegion },
    });

    const tmdbCache = providerCaches.find((p) => p.source === "tmdb");
    const watchmodeCache = providerCaches.find((p) => p.source === "watchmode");

    const stats = computeEpisodeStats(episodes, watchedKeys);

    views.push({
      id: show.id,
      tmdbId: show.tmdbId,
      name: cache?.name ?? show.name,
      posterPath: cache?.posterPath ?? show.posterPath,
      status: cache?.status ?? show.status,
      preferredRegion: show.preferredRegion,
      tags: show.showTags.map((st) => ({
        id: st.tag.id,
        name: st.tag.name,
        color: st.tag.color,
      })),
      providers: {
        flatrate: tmdbCache ? parseProvidersJson(tmdbCache.providersJson).flatrate : undefined,
        watchmode: watchmodeCache
          ? (JSON.parse(watchmodeCache.providersJson) as Array<{
              name: string;
              type: string;
              webUrl?: string;
            }>)
          : undefined,
      },
      nextEpisode: cache?.nextEpisodeName
        ? {
            name: cache.nextEpisodeName,
            airDate: cache.nextEpisodeAirDate,
            season: cache.nextSeason ?? 0,
            episode: cache.nextEpisode ?? 0,
          }
        : null,
      lastAirDate: stats.lastAirDate ?? cache?.lastAirDate ?? null,
      unwatchedNewCount: stats.unwatchedNewCount,
      upcomingCount: stats.upcomingCount,
    });
  }

  return filterShows(views, filter);
}
