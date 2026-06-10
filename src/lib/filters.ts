import { subDays, isAfter, isBefore, startOfDay } from "date-fns";

export type ShowFilter =
  | "all"
  | "upcoming"
  | "recently_aired"
  | "unwatched_new";

export type EpisodeWithWatch = {
  season: number;
  episode: number;
  name: string;
  airDate: Date | null;
  watched: boolean;
};

export type MonitoredShowView = {
  id: number;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  status: string | null;
  preferredRegion: string;
  tags: Array<{ id: number; name: string; color: string }>;
  providers: {
    flatrate?: Array<{ provider_name: string; logo_path: string }>;
    watchmode?: Array<{ name: string; type: string; webUrl?: string }>;
  };
  nextEpisode: {
    name: string;
    airDate: Date | null;
    season: number;
    episode: number;
  } | null;
  lastAirDate: Date | null;
  unwatchedNewCount: number;
  upcomingCount: number;
};

const today = () => startOfDay(new Date());

export function filterShows(
  shows: MonitoredShowView[],
  filter: ShowFilter,
  recentDays = 14
): MonitoredShowView[] {
  const now = today();
  const recentCutoff = subDays(now, recentDays);

  switch (filter) {
    case "upcoming":
      return shows
        .filter((s) => s.upcomingCount > 0 || (s.nextEpisode?.airDate && isAfter(s.nextEpisode.airDate, now)))
        .sort((a, b) => {
          const aDate = a.nextEpisode?.airDate?.getTime() ?? Infinity;
          const bDate = b.nextEpisode?.airDate?.getTime() ?? Infinity;
          return aDate - bDate;
        });

    case "recently_aired":
      return shows
        .filter((s) => s.lastAirDate && isAfter(s.lastAirDate, recentCutoff) && isBefore(s.lastAirDate, now))
        .sort((a, b) => (b.lastAirDate?.getTime() ?? 0) - (a.lastAirDate?.getTime() ?? 0));

    case "unwatched_new":
      return shows
        .filter((s) => s.unwatchedNewCount > 0)
        .sort((a, b) => b.unwatchedNewCount - a.unwatchedNewCount);

    default:
      return shows.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function computeEpisodeStats(
  episodes: Array<{ season: number; episode: number; airDate: Date | null }>,
  watchedKeys: Set<string>,
  recentDays = 14
) {
  const now = today();
  const recentCutoff = subDays(now, recentDays);

  let upcomingCount = 0;
  let unwatchedNewCount = 0;
  let lastAirDate: Date | null = null;

  for (const ep of episodes) {
    if (!ep.airDate) continue;
    const key = `${ep.season}-${ep.episode}`;
    const watched = watchedKeys.has(key);

    if (isAfter(ep.airDate, now)) {
      upcomingCount++;
    }

    if (
      isAfter(ep.airDate, recentCutoff) &&
      isBefore(ep.airDate, now) &&
      !watched
    ) {
      unwatchedNewCount++;
    }

    if (isBefore(ep.airDate, now) || ep.airDate.getTime() === now.getTime()) {
      if (!lastAirDate || isAfter(ep.airDate, lastAirDate)) {
        lastAirDate = ep.airDate;
      }
    }
  }

  return { upcomingCount, unwatchedNewCount, lastAirDate };
}
