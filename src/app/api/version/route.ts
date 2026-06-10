import { NextResponse } from "next/server";
import { APP_VERSION, isNewerVersion, RELEASES_URL } from "@/lib/version";

const GITHUB_LATEST_RELEASE =
  "https://api.github.com/repos/jwposton/tvminder/releases/latest";

export async function GET() {
  let latest: string | null = null;
  let updateAvailable = false;

  try {
    const res = await fetch(GITHUB_LATEST_RELEASE, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "TVMinder",
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = (await res.json()) as { tag_name?: string };
      latest = data.tag_name?.replace(/^v/i, "") ?? null;
      if (latest) {
        updateAvailable = isNewerVersion(latest, APP_VERSION);
      }
    }
  } catch {
    // Offline or GitHub unavailable — version display still works
  }

  return NextResponse.json({
    current: APP_VERSION,
    latest,
    updateAvailable,
    releasesUrl: RELEASES_URL,
  });
}
