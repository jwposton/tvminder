import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">TVMinder</h1>
        <p className="mt-1 text-sm text-zinc-500">Track shows your way</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
