const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbSearchResult = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string | null;
  vote_average: number;
};

export type TmdbShowDetails = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  status: string;
  last_air_date: string | null;
  next_episode_to_air: {
    id: number;
    name: string;
    air_date: string;
    season_number: number;
    episode_number: number;
  } | null;
  seasons: Array<{
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    poster_path: string | null;
    air_date: string | null;
  }>;
  external_ids?: { imdb_id: string | null };
};

export type TmdbEpisode = {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
};

export type TmdbWatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
};

export type TmdbWatchProvidersResult = {
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  link?: string;
};

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error(
      "TMDB_API_KEY is not set. Get a free key at https://www.themoviedb.org/settings/api"
    );
  }
  return key;
}

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDb API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export function posterUrl(path: string | null | undefined, size = "w342"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function stillUrl(path: string | null | undefined, size = "w300"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function searchTv(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>("/search/tv", {
    query,
    include_adult: "false",
  });
  return data.results;
}

export async function getTvDetails(id: number): Promise<TmdbShowDetails> {
  return tmdbFetch<TmdbShowDetails>(`/tv/${id}`, {
    append_to_response: "external_ids",
  });
}

export async function getSeasonEpisodes(
  showId: number,
  seasonNumber: number
): Promise<TmdbEpisode[]> {
  const data = await tmdbFetch<{ episodes: TmdbEpisode[] }>(
    `/tv/${showId}/season/${seasonNumber}`
  );
  return data.episodes;
}

export async function getWatchProviders(
  showId: number,
  region: string
): Promise<TmdbWatchProvidersResult | null> {
  const data = await tmdbFetch<{
    results: Record<string, TmdbWatchProvidersResult>;
  }>(`/tv/${showId}/watch/providers`);
  return data.results[region.toUpperCase()] ?? null;
}

export async function getOnTheAir(): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>("/tv/on_the_air");
  return data.results;
}
