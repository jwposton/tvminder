const WATCHMODE_BASE = "https://api.watchmode.com/v1";

export type WatchmodeSource = {
  source_id: number;
  name: string;
  type: string;
  region: string;
  web_url?: string;
  ios_url?: string;
  android_url?: string;
  format?: string;
  price?: number;
  seasons?: number[];
  episodes?: number[];
};

export type WatchmodeTitleSources = {
  id: number;
  title: string;
  tmdb_id?: number;
  imdb_id?: string;
  sources: WatchmodeSource[];
};

function getApiKey(): string | null {
  return process.env.WATCHMODE_API_KEY || null;
}

export function isWatchmodeEnabled(): boolean {
  return Boolean(getApiKey());
}

async function watchmodeFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(`${WATCHMODE_BASE}${path}`);
  url.searchParams.set("apiKey", apiKey);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function getWatchmodeSourcesByTmdbId(
  tmdbId: number,
  region: string
): Promise<WatchmodeSource[]> {
  const data = await watchmodeFetch<WatchmodeTitleSources>(
    `/title/tmdb-tv-${tmdbId}/sources/`,
    { regions: region.toUpperCase() }
  );
  return data?.sources ?? [];
}

export async function searchWatchmodeByTmdbId(tmdbId: number): Promise<number | null> {
  const data = await watchmodeFetch<{ title_results: Array<{ id: number; tmdb_id: number }> }>(
    "/search/",
    { search_field: "tmdb_tv_id", search_value: String(tmdbId) }
  );
  return data?.title_results?.[0]?.id ?? null;
}

export function normalizeWatchmodeSources(sources: WatchmodeSource[]) {
  const byName = new Map<
    string,
    {
      name: string;
      type: string;
      webUrl?: string;
      iosUrl?: string;
      androidUrl?: string;
      episodes?: number[];
      seasons?: number[];
    }
  >();

  for (const s of sources) {
    const existing = byName.get(s.name);
    if (!existing) {
      byName.set(s.name, {
        name: s.name,
        type: s.type,
        webUrl: s.web_url,
        iosUrl: s.ios_url,
        androidUrl: s.android_url,
        episodes: s.episodes,
        seasons: s.seasons,
      });
    }
  }

  return Array.from(byName.values());
}
