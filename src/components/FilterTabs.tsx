"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const FILTERS = [
  { key: "all", label: "All Shows" },
  { key: "upcoming", label: "Upcoming" },
  { key: "recently_aired", label: "Recently Aired" },
  { key: "unwatched_new", label: "New Unwatched" },
] as const;

function buildUrl(filter: string, tags: string | null): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (tags) params.set("tags", tags);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function FilterTabs() {
  const searchParams = useSearchParams();
  const current = searchParams.get("filter") ?? "all";
  const tags = searchParams.get("tags");

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Link
          key={f.key}
          href={buildUrl(f.key, tags)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            current === f.key
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}
