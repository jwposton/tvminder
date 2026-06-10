"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { TmdbAttribution } from "@/components/TmdbAttribution";
import { isEpisodeAired } from "@/lib/episodes";
import { posterUrl, stillUrl } from "@/lib/tmdb";

type Tag = { id: number; name: string; color: string };

type Episode = {
  season: number;
  episode: number;
  name: string;
  airDate: string | null;
  stillPath: string | null;
  watched: boolean;
};

type ShowDetail = {
  id: number;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  preferredRegion: string;
  cache: {
    overview: string | null;
    status: string | null;
    nextEpisodeName: string | null;
    nextEpisodeAirDate: string | null;
    nextSeason: number | null;
    nextEpisode: number | null;
  } | null;
  tags: Tag[];
  providers: {
    tmdb: {
      flatrate?: Array<{ provider_name: string; logo_path: string }>;
      link?: string;
    } | null;
    watchmode: Array<{ name: string; type: string; webUrl?: string }> | null;
  };
  seasons: Array<{ season: number; episodes: Episode[] }>;
};

export default function ShowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [show, setShow] = useState<ShowDetail | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingAll, setTogglingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShow = useCallback(async () => {
    const res = await fetch(`/api/shows/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load show");
    setShow(data.show);
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        await loadShow();
        const tagsRes = await fetch("/api/tags");
        const tagsData = await tagsRes.json();
        setAllTags(tagsData.tags ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadShow]);

  async function toggleEpisode(season: number, episode: number, watched: boolean) {
    await fetch(`/api/shows/${id}/watched`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season, episode, watched: !watched }),
    });
    await loadShow();
  }

  async function toggleSeason(season: number, allWatched: boolean) {
    await fetch(`/api/shows/${id}/watched`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season, watched: !allWatched }),
    });
    await loadShow();
  }

  async function toggleAllAired(allAiredWatched: boolean) {
    setTogglingAll(true);
    try {
      await fetch(`/api/shows/${id}/watched`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: !allAiredWatched }),
      });
      await loadShow();
    } finally {
      setTogglingAll(false);
    }
  }

  async function addTag(tagId: number) {
    await fetch(`/api/shows/${id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    await loadShow();
  }

  async function removeTag(tagId: number) {
    await fetch(`/api/shows/${id}/tags?tagId=${tagId}`, { method: "DELETE" });
    await loadShow();
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setAllTags((prev) => [...prev, data.tag]);
      await addTag(data.tag.id);
      setNewTagName("");
    }
  }

  async function removeShow() {
    if (!confirm("Remove this show from your monitored list?")) return;
    await fetch(`/api/shows/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl flex-1 px-6 py-8">Loading...</main>;
  }

  if (error || !show) {
    return (
      <main className="mx-auto max-w-5xl flex-1 px-6 py-8 text-red-600">{error}</main>
    );
  }

  const poster = posterUrl(show.posterPath, "w342");
  const appliedTagIds = new Set(show.tags.map((t) => t.id));
  const allEpisodes = show.seasons.flatMap(({ episodes }) => episodes);
  const airedEpisodes = allEpisodes.filter((ep) => isEpisodeAired(ep.airDate));
  const hasAired = airedEpisodes.length > 0;
  const allAiredWatched = hasAired && airedEpisodes.every((ep) => ep.watched);

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Link href="/" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="mb-8 flex flex-col gap-6 sm:flex-row">
          <div className="relative h-72 w-48 shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
            {poster && <Image src={poster} alt={show.name} fill className="object-cover" sizes="192px" />}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{show.name}</h1>
            {show.cache?.status && <p className="text-zinc-500">{show.cache.status}</p>}
            {show.cache?.overview && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {show.cache.overview}
              </p>
            )}

            {show.cache?.nextEpisodeAirDate && (
              <p className="mt-3 text-sm">
                <span className="font-medium">Next episode:</span> {show.cache.nextEpisodeName} (S
                {show.cache.nextSeason}E{show.cache.nextEpisode}) ·{" "}
                {format(new Date(show.cache.nextEpisodeAirDate), "MMM d, yyyy")}
              </p>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-medium">Streaming ({show.preferredRegion})</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {show.providers.tmdb?.flatrate?.map((p) => (
                  <span key={p.provider_name} className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">
                    {p.provider_name}
                  </span>
                ))}
                {show.providers.watchmode?.map((p) => (
                  <a
                    key={p.name}
                    href={p.webUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800 hover:underline dark:bg-emerald-900/40 dark:text-emerald-200"
                  >
                    {p.name} ({p.type})
                  </a>
                ))}
              </div>
              {show.providers.tmdb?.link && (
                <a
                  href={show.providers.tmdb.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-indigo-600 hover:underline"
                >
                  View on TMDb
                </a>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium">Tags</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {show.tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => removeTag(tag.id)}
                    className="rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                    title="Click to remove"
                  >
                    {tag.name} ×
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {allTags
                  .filter((t) => !appliedTagIds.has(t.id))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag.id)}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
                    >
                      + {tag.name}
                    </button>
                  ))}
                <div className="flex gap-1">
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  <button
                    onClick={createTag}
                    className="rounded bg-indigo-600 px-2 py-1 text-xs text-white"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={removeShow}
              className="mt-6 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              Remove from list
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Episodes</h2>
          {hasAired && (
            <button
              onClick={() => toggleAllAired(allAiredWatched)}
              disabled={togglingAll}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {togglingAll
                ? "Updating…"
                : allAiredWatched
                  ? "Mark all unwatched"
                  : "Mark all watched"}
            </button>
          )}
        </div>
        {[...show.seasons].sort((a, b) => b.season - a.season).map(({ season, episodes }) => {
          const seasonAired = episodes.filter((ep) => isEpisodeAired(ep.airDate));
          const seasonHasAired = seasonAired.length > 0;
          const allSeasonAiredWatched =
            seasonHasAired && seasonAired.every((e) => e.watched);
          return (
            <div key={season} className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">Season {season}</h3>
                {seasonHasAired && (
                  <button
                    onClick={() => toggleSeason(season, allSeasonAiredWatched)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {allSeasonAiredWatched ? "Mark all unwatched" : "Mark all watched"}
                  </button>
                )}
              </div>
              <div className="grid gap-2">
                {episodes.map((ep) => {
                  const still = stillUrl(ep.stillPath);
                  return (
                    <label
                      key={`${ep.season}-${ep.episode}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        ep.watched
                          ? "border-zinc-200 bg-zinc-50 opacity-70 dark:border-zinc-800 dark:bg-zinc-900/50"
                          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ep.watched}
                        onChange={() => toggleEpisode(ep.season, ep.episode, ep.watched)}
                        className="h-4 w-4 rounded"
                      />
                      {still && (
                        <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded">
                          <Image src={still} alt="" fill className="object-cover" sizes="80px" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {ep.episode}. {ep.name}
                        </p>
                        {ep.airDate && (
                          <p className="text-xs text-zinc-500">
                            {format(new Date(ep.airDate), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
      <TmdbAttribution />
    </>
  );
}
