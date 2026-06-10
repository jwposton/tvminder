import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const body = await request.json();
  const { name, color } = body as { name?: string; color?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        userId: user.id,
        name: name.trim(),
        color: color ?? "#6366f1",
      },
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
  }
}
