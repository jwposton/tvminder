"use client";

import { useEffect, useState } from "react";

type VersionInfo = {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  releasesUrl: string;
};

export function NavVersion() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  const current = info?.current ?? "…";

  return (
    <span className="mt-0.5 flex items-center gap-1 text-[10px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
      <span>v{current}</span>
      {info?.updateAvailable && info.latest && (
        <a
          href={info.releasesUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
          title={`Version ${info.latest} is available`}
        >
          {info.latest} available
        </a>
      )}
    </span>
  );
}
