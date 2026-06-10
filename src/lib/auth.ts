import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "tvminder_session";
const SESSION_DAYS = 30;

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  preferredRegion: string;
};

function sessionExpiry(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  return expires;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: sessionExpiry(),
    },
  });
  return session.id;
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    preferredRegion: session.user.preferredRegion,
  };
}

export async function destroySession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

const DEFAULT_TAGS = [
  { name: "Completed", color: "#22c55e" },
  { name: "Watching", color: "#6366f1" },
  { name: "Priority", color: "#ef4444" },
];

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!email || !input.password || !name) {
    throw new Error("Email, password, and name are required");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      preferredRegion: "US",
      tags: {
        create: DEFAULT_TAGS,
      },
    },
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  return user;
}
