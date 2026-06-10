import { Suspense } from "react";
import { SettingsClient } from "./SettingsClient";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
          <p className="text-zinc-600 dark:text-zinc-400">Loading settings...</p>
        </main>
      }
    >
      <SettingsClient />
    </Suspense>
  );
}
