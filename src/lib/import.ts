import { startOfDay, isAfter } from "date-fns";
import { refreshShowCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { pickBestMatch } from "@/lib/import-match";
import { searchTv, type TmdbSearchResult } from "@/lib/tmdb";
import type { AuthUser } from "@/lib/auth";

export type CsvImportRow = {
  line: number;
  name: string;
  status: 0 | 1;
  tagValue: string;
};

export type ImportMatchResult = {
  line: number;
  inputName: string;
  status: 0 | 1;
  tagValue: string;
  bestMatch: TmdbSearchResult | null;
  matchConfidence: number;
  candidates: TmdbSearchResult[];
};

export type ImportCommitRow = {
  line: number;
  tmdbId: number;
  status: 0 | 1;
  tagValue: string;
  skip?: boolean;
};

export type TagMapping = Record<string, { tagId?: number; newName?: string }>;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseImportCsv(text: string): CsvImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const rows: CsvImportRow[] = [];
  let startIndex = 0;

  const firstFields = parseCsvLine(lines[0]);
  const maybeHeader =
    firstFields.length >= 2 &&
    isNaN(Number(firstFields[1])) &&
    !/^[01]$/.test(firstFields[1].trim());

  if (maybeHeader) startIndex = 1;

  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 2) continue;

    const name = fields[0];
    const statusRaw = fields[1].trim();
    const tagValue = (fields[2] ?? "").trim();

    if (!name) continue;
    if (statusRaw !== "0" && statusRaw !== "1") continue;

    rows.push({
      line: i + 1,
      name,
      status: statusRaw === "1" ? 1 : 0,
      tagValue,
    });
  }

  return rows;
}

export async function matchImportRows(
  rows: CsvImportRow[]
): Promise<ImportMatchResult[]> {
  const results: ImportMatchResult[] = [];

  for (const row of rows) {
    let candidates: TmdbSearchResult[] = [];
    try {
      candidates = await searchTv(row.name);
    } catch {
      candidates = [];
    }

    const { match, confidence } = pickBestMatch(row.name, candidates);

    results.push({
      line: row.line,
      inputName: row.name,
      status: row.status,
      tagValue: row.tagValue,
      candidates: candidates.slice(0, 8),
      bestMatch: match,
      matchConfidence: confidence,
    });

    // Gentle pacing for TMDb rate limits
    await new Promise((r) => setTimeout(r, 120));
  }

  return results;
}

async function resolveTagId(
  userId: number,
  tagValue: string,
  mapping: TagMapping
): Promise<number | null> {
  if (!tagValue) return null;

  const mapEntry = mapping[tagValue];
  if (!mapEntry) return null;

  if (mapEntry.tagId) return mapEntry.tagId;

  if (mapEntry.newName?.trim()) {
    const name = mapEntry.newName.trim();
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
    });
    return tag.id;
  }

  return null;
}

async function markAiredEpisodesWatched(
  userId: number,
  monitoredShowId: number,
  tmdbShowId: number
) {
  const today = startOfDay(new Date());
  const episodes = await prisma.episodeCache.findMany({
    where: { tmdbShowId },
  });

  for (const ep of episodes) {
    if (
      !ep.airDate ||
      (isAfter(ep.airDate, today) && ep.airDate.getTime() !== today.getTime())
    ) {
      continue;
    }

    await prisma.watchedEpisode.upsert({
      where: {
        userId_tmdbShowId_season_episode: {
          userId,
          tmdbShowId,
          season: ep.season,
          episode: ep.episode,
        },
      },
      create: {
        userId,
        tmdbShowId,
        season: ep.season,
        episode: ep.episode,
        monitoredShowId,
      },
      update: { watchedAt: new Date() },
    });
  }
}

export async function commitImport(
  user: AuthUser,
  rows: ImportCommitRow[],
  tagMapping: TagMapping
) {
  const results: Array<{
    line: number;
    tmdbId: number;
    ok: boolean;
    error?: string;
    showId?: number;
  }> = [];

  for (const row of rows) {
    if (row.skip) {
      results.push({ line: row.line, tmdbId: row.tmdbId, ok: true });
      continue;
    }

    try {
      let monitored = await prisma.monitoredShow.findUnique({
        where: { userId_tmdbId: { userId: user.id, tmdbId: row.tmdbId } },
      });

      if (!monitored) {
        const details = await refreshShowCache(row.tmdbId, user.preferredRegion);
        monitored = await prisma.monitoredShow.create({
          data: {
            userId: user.id,
            tmdbId: row.tmdbId,
            name: details.name,
            posterPath: details.poster_path,
            status: details.status,
            preferredRegion: user.preferredRegion,
          },
        });
      } else {
        await refreshShowCache(row.tmdbId, monitored.preferredRegion);
      }

      const tagId = await resolveTagId(user.id, row.tagValue, tagMapping);
      if (tagId) {
        await prisma.showTag.upsert({
          where: {
            monitoredShowId_tagId: { monitoredShowId: monitored.id, tagId },
          },
          create: { monitoredShowId: monitored.id, tagId },
          update: {},
        });
      }

      if (row.status === 1) {
        await markAiredEpisodesWatched(user.id, monitored.id, row.tmdbId);
      }

      results.push({
        line: row.line,
        tmdbId: row.tmdbId,
        ok: true,
        showId: monitored.id,
      });
    } catch (e) {
      results.push({
        line: row.line,
        tmdbId: row.tmdbId,
        ok: false,
        error: e instanceof Error ? e.message : "Import failed",
      });
    }
  }

  return results;
}
