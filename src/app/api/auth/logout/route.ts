import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, destroySession } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("tvminder_session")?.value;
  if (sessionId) {
    await destroySession(sessionId);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
