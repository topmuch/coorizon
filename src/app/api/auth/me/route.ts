import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's public profile, or 401.
 */
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ user: null }, { status: 200 });
  }
  return Response.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
    },
  });
}
