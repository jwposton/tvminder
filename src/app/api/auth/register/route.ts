import { NextRequest, NextResponse } from "next/server";
import { createSession, registerUser, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    const user = await registerUser({
      email: email ?? "",
      password: password ?? "",
      name: name ?? "",
    });

    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          preferredRegion: user.preferredRegion,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
