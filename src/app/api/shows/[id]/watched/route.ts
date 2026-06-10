import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { setAiredEpisodesWatchedState } from "@/lib/watched";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const { id } = await params;
  const showId = parseInt(id, 10);
  const body = await request.json();
  const { season, episode, watched } = body as {
    season?: number;
    episode?: number;
    watched?: boolean;
  };

  if (season == null || episode == null) {
    return NextResponse.json({ error: "season and episode are required" }, { status: 400 });
  }

  const show = await prisma.monitoredShow.findFirst({
    where: { id: showId, userId: user.id },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  if (watched === false) {
    await prisma.watchedEpisode.deleteMany({
      where: {
        userId: user.id,
        tmdbShowId: show.tmdbId,
        season,
        episode,
      },
    });
  } else {
    await prisma.watchedEpisode.upsert({
      where: {
        userId_tmdbShowId_season_episode: {
          userId: user.id,
          tmdbShowId: show.tmdbId,
          season,
          episode,
        },
      },
      create: {
        userId: user.id,
        tmdbShowId: show.tmdbId,
        season,
        episode,
        monitoredShowId: show.id,
      },
      update: { watchedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const { id } = await params;
  const showId = parseInt(id, 10);
  const body = await request.json();
  const { season, watched: seasonWatched } = body as { season?: number; watched?: boolean };

  if (season == null) {
    return NextResponse.json({ error: "season is required" }, { status: 400 });
  }

  const show = await prisma.monitoredShow.findFirst({
    where: { id: showId, userId: user.id },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  await setAiredEpisodesWatchedState(
    user.id,
    show.id,
    show.tmdbId,
    seasonWatched !== false,
    { season }
  );

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const { id } = await params;
  const showId = parseInt(id, 10);
  const body = await request.json().catch(() => ({}));
  const { watched: markWatched = true } = body as { watched?: boolean };

  const show = await prisma.monitoredShow.findFirst({
    where: { id: showId, userId: user.id },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  await setAiredEpisodesWatchedState(
    user.id,
    show.id,
    show.tmdbId,
    markWatched !== false
  );

  return NextResponse.json({ ok: true });
}
