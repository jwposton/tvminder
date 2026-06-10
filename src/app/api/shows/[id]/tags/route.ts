import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const { id } = await params;
  const showId = parseInt(id, 10);
  const body = await request.json();
  const { tagId } = body as { tagId?: number };

  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  const show = await prisma.monitoredShow.findFirst({
    where: { id: showId, userId: user.id },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId: user.id } });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  await prisma.showTag.upsert({
    where: { monitoredShowId_tagId: { monitoredShowId: showId, tagId } },
    create: { monitoredShowId: showId, tagId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const { id } = await params;
  const showId = parseInt(id, 10);
  const tagId = parseInt(request.nextUrl.searchParams.get("tagId") ?? "", 10);

  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  const show = await prisma.monitoredShow.findFirst({
    where: { id: showId, userId: user.id },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  await prisma.showTag.deleteMany({
    where: { monitoredShowId: showId, tagId },
  });

  return NextResponse.json({ ok: true });
}
