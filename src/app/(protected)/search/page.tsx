"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TmdbAttribution } from "@/components/TmdbAttribution";
import { posterUrl } from "@/lib/tmdb";

type SearchResult = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string | null;
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(tmdbId: number) {
    setAdding(tmdbId);
    setError(null);
    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add show");
      router.push(`/shows/${data.show.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add show");
    } finally {
      setAdding(null);
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">Add a Show</h1>

        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search TV shows..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {results.map((show) => {
            const poster = posterUrl(show.poster_path, "w154");
            return (
              <div
                key={show.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                  {poster ? (
                    <Image src={poster} alt={show.name} fill className="object-cover" sizes="56px" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{show.name}</h3>
                  {show.first_air_date && (
                    <p className="text-sm text-zinc-500">{show.first_air_date.slice(0, 4)}</p>
                  )}
                  <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {show.overview}
                  </p>
                </div>
                <button
                  onClick={() => handleAdd(show.id)}
                  disabled={adding === show.id}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding === show.id ? "Adding..." : "Monitor"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
      <TmdbAttribution />
    </>
  );
}
