export function TmdbAttribution() {
  return (
    <footer className="mt-auto border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
      This product uses the{" "}
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        TMDb API
      </a>{" "}
      but is not endorsed or certified by TMDb.
    </footer>
  );
}
