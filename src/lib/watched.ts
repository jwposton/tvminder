import { startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { isEpisodeAired } from "@/lib/episodes";

async function getAiredEpisodes(tmdbShowId: number, season?: number) {
  const today = startOfDay(new Date());
  const episodes = await prisma.episodeCache.findMany({
    where: season != null ? { tmdbShowId, season } : { tmdbShowId },
  });
  return episodes.filter((ep) => isEpisodeAired(ep.airDate, today));
}

export async function setAiredEpisodesWatched(
  userId: number,
  monitoredShowId: number,
  tmdbShowId: number,
  options?: { season?: number }
) {
  const airedEpisodes = await getAiredEpisodes(tmdbShowId, options?.season);

  for (const ep of airedEpisodes) {
    await prisma.watchedEpisode.upsert({
      where: {
        userId_tmdbShowId_season_episode: {
          userId,
          tmdbShowId,
          season: ep.season,
          episode: ep.episode,
        },
      },
      create: {
        userId,
        tmdbShowId,
        season: ep.season,
        episode: ep.episode,
        monitoredShowId,
      },
      update: { watchedAt: new Date() },
    });
  }
}

export async function clearAiredEpisodesWatched(
  userId: number,
  tmdbShowId: number,
  options?: { season?: number }
) {
  const airedEpisodes = await getAiredEpisodes(tmdbShowId, options?.season);
  if (airedEpisodes.length === 0) return;

  if (options?.season != null) {
    await prisma.watchedEpisode.deleteMany({
      where: {
        userId,
        tmdbShowId,
        season: options.season,
        episode: { in: airedEpisodes.map((ep) => ep.episode) },
      },
    });
    return;
  }

  await prisma.watchedEpisode.deleteMany({
    where: {
      userId,
      tmdbShowId,
      OR: airedEpisodes.map((ep) => ({
        season: ep.season,
        episode: ep.episode,
      })),
    },
  });
}

export async function setAiredEpisodesWatchedState(
  userId: number,
  monitoredShowId: number,
  tmdbShowId: number,
  watched: boolean,
  options?: { season?: number }
) {
  if (watched) {
    await setAiredEpisodesWatched(userId, monitoredShowId, tmdbShowId, options);
  } else {
    await clearAiredEpisodesWatched(userId, tmdbShowId, options);
  }
}
