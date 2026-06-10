"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ImportPanel } from "@/components/ImportPanel";
import { TmdbAttribution } from "@/components/TmdbAttribution";

const REGIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "BR", label: "Brazil" },
];

const TABS = [
  { key: "general", label: "General" },
  { key: "import", label: "Import" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function SettingsGeneral() {
  const [region, setRegion] = useState("US");
  const [watchmodeEnabled, setWatchmodeEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setRegion(data.preferredRegion ?? "US");
        setWatchmodeEnabled(data.watchmodeEnabled ?? false);
      });
  }, []);

  async function saveRegion() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredRegion: region }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Region saved. Provider data will refresh on next sync.");
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Failed to save");
    }
  }

  async function refreshAll() {
    setRefreshing(true);
    setMessage(null);
    const res = await fetch("/api/refresh", { method: "POST" });
    const data = await res.json();
    setRefreshing(false);
    if (res.ok) {
      const ok = data.results?.filter((r: { ok: boolean }) => r.ok).length ?? 0;
      setMessage(`Refreshed ${ok} show(s).`);
    } else {
      setMessage(data.error ?? "Refresh failed");
    }
  }

  return (
    <>
      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 font-semibold">Streaming Region</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Choose which country&apos;s streaming availability to display.
        </p>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label} ({r.code})
            </option>
          ))}
        </select>
        <button
          onClick={saveRegion}
          disabled={saving}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Region"}
        </button>
      </section>

      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 font-semibold">Data Refresh</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Manually refresh episode schedules and streaming providers for all monitored
          shows. A nightly cron can call{" "}
          <code className="text-xs">/api/cron/refresh</code>.
        </p>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh All Shows"}
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 font-semibold">Watchmode Integration</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {watchmodeEnabled
            ? "Watchmode API key detected. Episode-level streaming deep links are enabled."
            : "Optional: set WATCHMODE_API_KEY in .env for richer streaming data and deep links."}
        </p>
      </section>

      {message && (
        <p className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
          {message}
        </p>
      )}
    </>
  );
}

export function SettingsClient() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") === "import" ? "import" : "general") as TabKey;

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>

        <div className="mb-8 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "general" ? "/settings" : `/settings?tab=${t.key}`}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {tab === "general" ? <SettingsGeneral /> : <ImportPanel />}
      </main>
      <TmdbAttribution />
    </>
  );
}
