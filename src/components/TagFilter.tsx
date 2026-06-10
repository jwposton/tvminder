"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tag = { id: number; name: string; color: string };

function buildHomeUrl(filter: string, tagIds: number[]): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (tagIds.length > 0) params.set("tags", tagIds.join(","));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function TagFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? "all";
  const selectedIds = (searchParams.get("tags") ?? "")
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []));
  }, []);

  function toggleTag(tagId: number) {
    const next = selectedIds.includes(tagId)
      ? selectedIds.filter((id) => id !== tagId)
      : [...selectedIds, tagId];
    router.push(buildHomeUrl(filter, next));
  }

  function clearTags() {
    router.push(buildHomeUrl(filter, []));
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Tags
        </span>
        {selectedIds.length > 0 && (
          <Link
            href={buildHomeUrl(filter, [])}
            onClick={(e) => {
              e.preventDefault();
              clearTags();
            }}
            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Clear
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "text-white ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
              style={
                active
                  ? {
                      backgroundColor: tag.color,
                      // Tailwind ring color via CSS variable
                      ["--tw-ring-color" as string]: tag.color,
                    }
                  : undefined
              }
            >
              {tag.name}
            </button>
          );
        })}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Showing shows with any selected tag
        </p>
      )}
    </div>
  );
}
