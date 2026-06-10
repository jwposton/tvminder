import { NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { refreshAllMonitoredShows } from "@/lib/cache";

export async function POST() {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;

  try {
    const results = await refreshAllMonitoredShows();
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
