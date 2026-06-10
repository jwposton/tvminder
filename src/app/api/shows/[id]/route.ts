import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { parseProvidersJson } from "@/lib/cache";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const { id } = await params;
  const showId = parseInt(id, 10);

  const show = await prisma.monitoredShow.findFirst({
    where: { id: showId, userId: user.id },
    include: { showTags: { include: { tag: true } } },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  const cache = await prisma.showCache.findUnique({ where: { tmdbId: show.tmdbId } });
  const episodes = await prisma.episodeCache.findMany({
    where: { tmdbShowId: show.tmdbId },
    orderBy: [{ season: "asc" }, { episode: "asc" }],
  });
  const watched = await prisma.watchedEpisode.findMany({
    where: { userId: user.id, tmdbShowId: show.tmdbId },
  });
  const watchedSet = new Set(watched.map((w) => `${w.season}-${w.episode}`));

  const providerCaches = await prisma.watchProvidersCache.findMany({
    where: { tmdbShowId: show.tmdbId, region: show.preferredRegion },
  });
  const tmdbCache = providerCaches.find((p) => p.source === "tmdb");
  const watchmodeCache = providerCaches.find((p) => p.source === "watchmode");

  const seasons = new Map<number, typeof episodes>();
  for (const ep of episodes) {
    const list = seasons.get(ep.season) ?? [];
    list.push(ep);
    seasons.set(ep.season, list);
  }

  return NextResponse.json({
    show: {
      ...show,
      cache,
      tags: show.showTags.map((st) => st.tag),
      providers: {
        tmdb: tmdbCache ? parseProvidersJson(tmdbCache.providersJson) : null,
        watchmode: watchmodeCache ? JSON.parse(watchmodeCache.providersJson) : null,
      },
      seasons: Array.from(seasons.entries()).map(([season, eps]) => ({
        season,
        episodes: eps.map((ep) => ({
          ...ep,
          watched: watchedSet.has(`${ep.season}-${ep.episode}`),
        })),
      })),
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const { id } = await params;
  const showId = parseInt(id, 10);

  const show = await prisma.monitoredShow.findFirst({
    where: { id: showId, userId: user.id },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  await prisma.monitoredShow.delete({ where: { id: showId } });
  return NextResponse.json({ ok: true });
}
