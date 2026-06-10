"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const FILTERS = [
  { key: "all", label: "All Shows" },
  { key: "upcoming", label: "Upcoming" },
  { key: "recently_aired", label: "Recently Aired" },
  { key: "unwatched_new", label: "New Unwatched" },
] as const;

export function FilterTabs() {
  const searchParams = useSearchParams();
  const current = searchParams.get("filter") ?? "all";

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Link
          key={f.key}
          href={f.key === "all" ? "/" : `/?filter=${f.key}`}
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
