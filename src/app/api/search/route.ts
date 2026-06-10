import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { searchTv } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchTv(q.trim());
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
