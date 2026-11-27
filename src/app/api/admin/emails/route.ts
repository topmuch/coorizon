import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * GET /api/admin/emails
 *
 * Email journal: the latest notification emails recorded by the platform
 * (registrations, payments, messages…). Admin/SuperAdmin only.
 *
 * Query params:
 *   - template (optional filter: registration | payment | message | account)
 *   - take     (default 50, max 200)
 *
 * Response: { emails, total }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const url = new URL(req.url);
    const template = url.searchParams.get("template");
    const takeParam = Number(url.searchParams.get("take"));
    const take = Number.isFinite(takeParam) && takeParam > 0 ? Math.min(Math.floor(takeParam), 200) : 50;

    const where = template && template !== "all" ? { template } : {};

    const [emails, total] = await Promise.all([
      db.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
      }),
      db.emailLog.count({ where }),
    ]);

    return Response.json({ emails, total });
  } catch (error) {
    return authErrorResponse(error);
  }
}
