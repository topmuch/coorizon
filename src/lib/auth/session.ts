import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "./config";
import { can as canPerform, type Permission, ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  status: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface ServerSession {
  user: SessionUser;
}

/**
 * Get the current authenticated session (server-side only).
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<ServerSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session as unknown as ServerSession;
}

/**
 * Require an authenticated session. Throws a structured error if missing.
 */
export async function requireSession(): Promise<ServerSession> {
  const session = await getSession();
  if (!session) {
    const err = new Error("UNAUTHORIZED") as Error & { code: string; status: number };
    err.code = "UNAUTHORIZED";
    err.status = 401;
    throw err;
  }
  return session;
}

/**
 * Require the session AND a specific permission.
 * Throws a structured error if forbidden.
 */
export async function requirePermission(permission: Permission): Promise<ServerSession> {
  const session = await requireSession();
  if (!canPerform(session.user.role, permission)) {
    const err = new Error("FORBIDDEN") as Error & { code: string; status: number };
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }
  return session;
}

/**
 * Standard JSON error response for auth failures.
 */
export function authErrorResponse(error: unknown): Response {
  const e = error as Error & { code?: string; status?: number };
  if (e?.code === "FORBIDDEN") {
    return Response.json({ error: "Accès refusé. Vous n'avez pas la permission d'effectuer cette action." }, { status: 403 });
  }
  if (e?.code === "UNAUTHORIZED") {
    return Response.json({ error: "Vous devez être connecté pour effectuer cette action." }, { status: 401 });
  }
  // Never leak raw error messages (Prisma constraints, SDK errors, etc.)
  return Response.json({ error: "Une erreur est survenue." }, { status: 500 });
}

export { ROLES };
