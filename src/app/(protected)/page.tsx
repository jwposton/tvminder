import { Suspense } from "react";
import { FilterTabs } from "@/components/FilterTabs";
import { ShowCard } from "@/components/ShowCard";
import { TmdbAttribution } from "@/components/TmdbAttribution";
import { getMonitoredShows, parseTagIdsParam } from "@/lib/shows";
import { TagFilter } from "@/components/TagFilter";
import type { ShowFilter } from "@/lib/filters";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; tags?: string }>;
}) {
  const { filter = "all", tags } = await searchParams;
  const tagIds = parseTagIdsParam(tags);
  const shows = await getMonitoredShows(filter as ShowFilter, tagIds);

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold">My Shows</h1>
            <Suspense fallback={null}>
              <FilterTabs />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <TagFilter />
          </Suspense>
        </div>

        {shows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              No shows match this filter.{" "}
              <a href="/search" className="text-indigo-600 underline dark:text-indigo-400">
                Add your first show
              </a>
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shows.map((show) => (
              <ShowCard
                key={show.id}
                id={show.id}
                name={show.name}
                posterPath={show.posterPath}
                status={show.status}
                tags={show.tags}
                providers={show.providers}
                nextEpisode={
                  show.nextEpisode
                    ? {
                        ...show.nextEpisode,
                        airDate: show.nextEpisode.airDate?.toISOString() ?? null,
                      }
                    : null
                }
                unwatchedNewCount={show.unwatchedNewCount}
                upcomingCount={show.upcomingCount}
              />
            ))}
          </div>
        )}
      </main>
      <TmdbAttribution />
    </>
  );
}
