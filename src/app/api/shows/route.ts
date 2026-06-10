import { NextRequest, NextResponse } from "next/server";
import { refreshShowCache } from "@/lib/cache";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import type { ShowFilter } from "@/lib/filters";
import { getMonitoredShows } from "@/lib/shows";

export async function GET(request: NextRequest) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;

  const filter = (request.nextUrl.searchParams.get("filter") ?? "all") as ShowFilter;
  const shows = await getMonitoredShows(filter);
  return NextResponse.json({ shows });
}

export async function POST(request: NextRequest) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const body = await request.json();
  const { tmdbId, region } = body as { tmdbId?: number; region?: string };

  if (!tmdbId) {
    return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
  }

  const preferredRegion = region ?? user.preferredRegion;

  const existing = await prisma.monitoredShow.findUnique({
    where: { userId_tmdbId: { userId: user.id, tmdbId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Show already monitored" }, { status: 409 });
  }

  try {
    const details = await refreshShowCache(tmdbId, preferredRegion);

    const show = await prisma.monitoredShow.create({
      data: {
        userId: user.id,
        tmdbId,
        name: details.name,
        posterPath: details.poster_path,
        status: details.status,
        preferredRegion,
      },
    });

    return NextResponse.json({ show }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add show";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
