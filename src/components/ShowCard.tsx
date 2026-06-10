import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb";
import { format } from "date-fns";

type ShowCardProps = {
  id: number;
  name: string;
  posterPath: string | null;
  status: string | null;
  tags: Array<{ id: number; name: string; color: string }>;
  providers: {
    flatrate?: Array<{ provider_name: string; logo_path: string }>;
    watchmode?: Array<{ name: string; type: string; webUrl?: string }>;
  };
  nextEpisode: {
    name: string;
    airDate: string | null;
    season: number;
    episode: number;
  } | null;
  unwatchedNewCount: number;
  upcomingCount: number;
};

export function ShowCard({
  id,
  name,
  posterPath,
  status,
  tags,
  providers,
  nextEpisode,
  unwatchedNewCount,
  upcomingCount,
}: ShowCardProps) {
  const poster = posterUrl(posterPath);

  return (
    <Link
      href={`/shows/${id}`}
      className="group flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {poster ? (
          <Image src={poster} alt={name} fill className="object-cover" sizes="96px" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">No poster</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-lg font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
          {name}
        </h3>
        {status && <p className="text-sm text-zinc-500">{status}</p>}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {unwatchedNewCount > 0 && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {unwatchedNewCount} new unwatched
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {upcomingCount} upcoming
            </span>
          )}
        </div>

        {nextEpisode?.airDate && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Next: S{nextEpisode.season}E{nextEpisode.episode} ·{" "}
            {format(new Date(nextEpisode.airDate), "MMM d, yyyy")}
          </p>
        )}

        {(providers.flatrate?.length || providers.watchmode?.length) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {providers.flatrate?.slice(0, 4).map((p) => (
              <span
                key={p.provider_name}
                className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
              >
                {p.provider_name}
              </span>
            ))}
            {providers.watchmode?.slice(0, 2).map((p) => (
              <span
                key={p.name}
                className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
