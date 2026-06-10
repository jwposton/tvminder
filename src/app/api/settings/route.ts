import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  return NextResponse.json({
    preferredRegion: user.preferredRegion,
    watchmodeEnabled: Boolean(process.env.WATCHMODE_API_KEY),
  });
}

export async function PATCH(request: NextRequest) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const body = await request.json();
  const { preferredRegion } = body as { preferredRegion?: string };

  if (!preferredRegion || preferredRegion.length !== 2) {
    return NextResponse.json(
      { error: "preferredRegion must be a 2-letter country code" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { preferredRegion: preferredRegion.toUpperCase() },
  });

  await prisma.monitoredShow.updateMany({
    where: { userId: user.id },
    data: { preferredRegion: preferredRegion.toUpperCase() },
  });

  return NextResponse.json({ preferredRegion: updated.preferredRegion });
}
