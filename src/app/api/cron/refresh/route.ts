import { NextRequest, NextResponse } from "next/server";
import { refreshAllMonitoredShows } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await refreshAllMonitoredShows();
    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    return NextResponse.json({
      ok: true,
      succeeded,
      failed,
      results,
      refreshedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
