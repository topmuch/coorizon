import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * GET /api/admin/audit
 *
 * Paginated audit logs viewer (admin back-office — LOT 5).
 *
 * Query params:
 *  - action:      filter by action contains (e.g. "user." → all user.* events)
 *  - actorId:     filter by acting user id
 *  - targetType:  filter by target type (e.g. "User", "Company", "Application")
 *  - page:        1-based page number (default 1)
 *  - pageSize:    items per page (default 50, capped to 200)
 *
 * Returns: { logs, total, page, pageSize }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const actionParam = searchParams.get("action");
    const actorIdParam = searchParams.get("actorId");
    const targetTypeParam = searchParams.get("targetType");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.max(1, Math.min(200, Number(pageSizeParam) || 50));

    const action =
      typeof actionParam === "string" && actionParam.trim().length > 0
        ? actionParam.trim()
        : undefined;

    const actorId =
      typeof actorIdParam === "string" && actorIdParam.trim().length > 0
        ? actorIdParam.trim()
        : undefined;

    const targetType =
      typeof targetTypeParam === "string" && targetTypeParam.trim().length > 0
        ? targetTypeParam.trim()
        : undefined;

    type WhereClause = {
      action?: { contains: string };
      actorId?: string;
      targetType?: string;
    };

    const where: WhereClause = {};
    if (action) where.action = { contains: action };
    if (actorId) where.actorId = actorId;
    if (targetType) where.targetType = targetType;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return Response.json({ logs, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
