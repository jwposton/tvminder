import Link from "next/link";
import type { AuthUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { NavVersion } from "@/components/NavVersion";

export function Nav({ user }: { user: AuthUser }) {
  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex flex-col leading-tight text-indigo-600 dark:text-indigo-400"
        >
          <span className="text-xl font-bold">TVMinder</span>
          <NavVersion />
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Dashboard
          </Link>
          <Link
            href="/search"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Add Show
          </Link>
          <Link
            href="/settings"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Settings
          </Link>
          <div className="flex items-center gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-700">
            <span className="text-zinc-500 dark:text-zinc-400">{user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
