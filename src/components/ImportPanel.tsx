"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  matchConfidenceLabel,
  scoreMatchConfidence,
  sortByMatchConfidence,
} from "@/lib/import-match";
import { posterUrl } from "@/lib/tmdb";

type Tag = { id: number; name: string; color: string };

type SearchResult = {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string | null;
};

type MatchRow = {
  line: number;
  inputName: string;
  status: 0 | 1;
  tagValue: string;
  bestMatch: SearchResult | null;
  matchConfidence: number;
  candidates: SearchResult[];
};

type ReviewRow = {
  line: number;
  inputName: string;
  status: 0 | 1;
  tagValue: string;
  tmdbId: number | null;
  selectedShow: SearchResult | null;
  candidates: SearchResult[];
  matchConfidence: number;
  include: boolean;
  searchQuery: string;
  searching: boolean;
};

type TagMapping = Record<string, { tagId?: number; newName?: string }>;

type Step = "upload" | "tags" | "review" | "done";

const EXAMPLE_CSV = `Show Name,Status,Tag Code
Breaking Bad,1,1
The Office,0,2
Parks and Recreation,0,1`;

export function ImportPanel() {
  const [step, setStep] = useState<Step>("upload");
  const [csv, setCsv] = useState("");
  const [tagValues, setTagValues] = useState<string[]>([]);
  const [tagMapping, setTagMapping] = useState<TagMapping>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitSummary, setCommitSummary] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setAllTags(data.tags ?? []));
  }, []);

  async function handleParseAndMatch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/import/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to parse CSV");

      const values: string[] = data.tagValues ?? [];
      setTagValues(values);

      const initialMapping: TagMapping = {};
      for (const value of values) {
        initialMapping[value] = { newName: "" };
      }
      setTagMapping(initialMapping);

      const matches: MatchRow[] = data.matches ?? [];
      setReviewRows(
        matches.map((m) => ({
          line: m.line,
          inputName: m.inputName,
          status: m.status,
          tagValue: m.tagValue,
          tmdbId: m.bestMatch?.id ?? null,
          selectedShow: m.bestMatch,
          candidates: m.candidates,
          matchConfidence: m.matchConfidence,
          include: Boolean(m.bestMatch),
          searchQuery: m.inputName,
          searching: false,
        }))
      );

      setStep(values.length > 0 ? "tags" : "review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  function updateTagMapping(value: string, tagId: number | null, newName: string) {
    setTagMapping((prev) => ({
      ...prev,
      [value]: tagId ? { tagId } : { newName },
    }));
  }

  function tagMappingValid(): boolean {
    return tagValues.every((value) => {
      const entry = tagMapping[value];
      return entry?.tagId || entry?.newName?.trim();
    });
  }

  function updateRow(line: number, patch: Partial<ReviewRow>) {
    setReviewRows((rows) =>
      rows.map((r) => (r.line === line ? { ...r, ...patch } : r))
    );
  }

  const sortedReviewRows = useMemo(
    () => sortByMatchConfidence(reviewRows),
    [reviewRows]
  );

  async function searchForRow(line: number) {
    const row = reviewRows.find((r) => r.line === line);
    if (!row?.searchQuery.trim()) return;

    updateRow(line, { searching: true });

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(row.searchQuery.trim())}`
      );
      const data = await res.json();
      const candidates: SearchResult[] = data.results?.slice(0, 8) ?? [];
      const best = candidates[0] ?? null;
      const confidence = best
        ? scoreMatchConfidence(row.inputName, best.name)
        : 0;

      updateRow(line, {
        candidates,
        searching: false,
        selectedShow: best,
        tmdbId: best?.id ?? null,
        matchConfidence: confidence,
        include: Boolean(best),
      });
    } catch {
      updateRow(line, { searching: false });
    }
  }

  function selectShow(line: number, show: SearchResult) {
    const row = reviewRows.find((r) => r.line === line);
    if (!row) return;

    updateRow(line, {
      selectedShow: show,
      tmdbId: show.id,
      matchConfidence: scoreMatchConfidence(row.inputName, show.name),
      include: true,
    });
  }

  async function handleCommit() {
    setLoading(true);
    setError(null);
    try {
      const rows = reviewRows
        .filter((r) => r.include && r.tmdbId)
        .map((r) => ({
          line: r.line,
          tmdbId: r.tmdbId!,
          status: r.status,
          tagValue: r.tagValue,
        }));

      if (rows.length === 0) {
        throw new Error("No shows selected to import.");
      }

      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, tagMapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Commit failed");

      setCommitSummary(
        `Imported ${data.ok} show(s)${data.failed ? `, ${data.failed} failed` : ""}.`
      );
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setCsv("");
    setTagValues([]);
    setTagMapping({});
    setReviewRows([]);
    setError(null);
    setCommitSummary(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-2 font-semibold">How import works</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            Upload a CSV with three columns: <strong>show name</strong>,{" "}
            <strong>status</strong> (<code>0</code> = unwatched, <code>1</code> = all
            aired episodes watched), and an optional <strong>tag code</strong>.
          </li>
          <li>
            Map each unique tag code from your file to an existing tag or a new tag
            name (for example, code <code>1</code> → &quot;watching&quot;).
          </li>
          <li>
            Review each row: TVMinder searches TMDb for a best match. Confirm or
            change the matched show before importing.
          </li>
          <li>
            Import adds shows to your list, applies tags, and sets watched state for
            aired episodes when status is <code>1</code>.
          </li>
        </ol>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The first row can be a header (for example{" "}
          <code>Show Name,Status,Tag Code</code>). Up to 100 shows per import.
        </p>
      </section>

      {step === "upload" && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-semibold">1. Upload CSV</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Paste CSV text or choose a file. Status must be <code>0</code> or{" "}
            <code>1</code>.
          </p>

          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
            placeholder={EXAMPLE_CSV}
            className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800">
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setCsv(String(reader.result ?? ""));
                  reader.readAsText(file);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setCsv(EXAMPLE_CSV)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={handleParseAndMatch}
              disabled={loading || !csv.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Matching shows..." : "Next: map tags"}
            </button>
          </div>
        </section>
      )}

      {step === "tags" && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-semibold">2. Map tag codes</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Each unique value in the third column needs a tag. Pick an existing tag
            or enter a new name.
          </p>

          <div className="space-y-4">
            {tagValues.map((value) => (
              <div
                key={value}
                className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center dark:border-zinc-700"
              >
                <span className="min-w-24 font-mono text-sm font-medium">
                  &quot;{value}&quot;
                </span>
                <select
                  value={tagMapping[value]?.tagId ?? ""}
                  onChange={(e) => {
                    const tagId = e.target.value ? parseInt(e.target.value, 10) : null;
                    updateTagMapping(value, tagId, "");
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">— existing tag —</option>
                  {allTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-zinc-500">or new:</span>
                <input
                  type="text"
                  value={tagMapping[value]?.newName ?? ""}
                  onChange={(e) => updateTagMapping(value, null, e.target.value)}
                  placeholder="New tag name"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep("review")}
              disabled={!tagMappingValid()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Next: review matches
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-semibold">3. Review and confirm</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Rows are sorted by match confidence — unmatched and uncertain matches
            appear first. Confirm or fix each match before importing.
          </p>

          <div className="space-y-4">
            {sortedReviewRows.map((row) => (
              <div
                key={row.line}
                className={`rounded-lg border p-4 ${
                  row.matchConfidence === 0
                    ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
                    : row.matchConfidence < 40
                      ? "border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-900/10"
                      : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <div className="mb-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) =>
                      updateRow(row.line, { include: e.target.checked })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.inputName}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.matchConfidence === 0
                            ? "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                            : row.matchConfidence < 40
                              ? "bg-orange-200 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100"
                              : row.matchConfidence >= 70
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100"
                                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {matchConfidenceLabel(row.matchConfidence)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Line {row.line} · Status {row.status === 1 ? "watched" : "unwatched"}
                      {row.tagValue ? ` · Tag code "${row.tagValue}"` : ""}
                    </p>
                  </div>
                </div>

                {row.selectedShow ? (
                  <div className="mb-3 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                    {row.selectedShow.poster_path && (
                      <Image
                        src={posterUrl(row.selectedShow.poster_path, "w92")!}
                        alt=""
                        width={46}
                        height={69}
                        className="rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{row.selectedShow.name}</p>
                      {row.selectedShow.first_air_date && (
                        <p className="text-xs text-zinc-500">
                          First aired {row.selectedShow.first_air_date}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
                    No match found — search manually below.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={row.searchQuery}
                    onChange={(e) =>
                      updateRow(row.line, { searchQuery: e.target.value })
                    }
                    className="min-w-48 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => searchForRow(row.line)}
                    disabled={row.searching}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {row.searching ? "Searching..." : "Search"}
                  </button>
                </div>

                {row.candidates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => selectShow(row.line, candidate)}
                        className={`rounded-lg border px-3 py-1.5 text-left text-sm transition ${
                          row.tmdbId === candidate.id
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
                            : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {candidate.name}
                        {candidate.first_air_date
                          ? ` (${candidate.first_air_date.slice(0, 4)})`
                          : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(tagValues.length > 0 ? "tags" : "upload")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Importing..." : "Import shows"}
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-900/20">
          <h2 className="mb-2 font-semibold text-green-900 dark:text-green-100">
            Import complete
          </h2>
          <p className="text-sm text-green-800 dark:text-green-200">{commitSummary}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Import another file
          </button>
        </section>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
