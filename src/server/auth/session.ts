import { redirect } from "next/navigation";
import { getServerSession, type Session } from "next-auth";
import type { Role } from "@/lib/auth/roles";
import { authOptions } from "@/server/auth/config";

type AuthSession = Session & {
  user: NonNullable<Session["user"]>;
};

export function isAdminSession(session: Session | null) {
  return session?.user?.role === "admin";
}

export function isAuthenticatedSession(session: Session | null) {
  return Boolean(session?.user);
}

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return session as AuthSession;
}

export async function requireRole(role: Role) {
  const session = await requireAuthSession();

  if (session.user.role !== role) {
    redirect("/unauthorized");
  }

  return session;
}
