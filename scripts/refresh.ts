import { refreshAllMonitoredShows } from "../src/lib/cache";

async function main() {
  console.log("Refreshing all monitored shows...");
  const results = await refreshAllMonitoredShows();
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`Done: ${ok} succeeded, ${failed.length} failed`);
  for (const f of failed) {
    console.error(`  tmdb:${f.tmdbId} - ${f.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
