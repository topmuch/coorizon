import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

/**
 * Notifications API (LOT 8 — Task 8-c).
 *
 * GET /api/notifications
 *   List the authenticated user's notifications, newest first.
 *   Query params:
 *     - unread   ("true" → filter isRead=false)
 *     - page     (1-based, default 1)
 *     - pageSize (default 50)
 *   Returns { notifications, unreadCount, total }.
 *
 * PUT /api/notifications
 *   Mark notifications as read.
 *   Body: { notificationIds?: string[], all?: boolean }
 *   - all === true     → mark ALL unread notifications as read.
 *   - notificationIds  → mark the given ids (owned by the user) as read.
 *   Returns 200 { updated: count }.
 *
 * Available to ANY authenticated user (notifications are personal).
 */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/** Safe integer parse for pagination params. */
function parsePositiveInt(
  value: string | null,
  fallback: number
): number {
  if (value === null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/**
 * GET /api/notifications
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const url = new URL(req.url);
    const unread = url.searchParams.get("unread") === "true";
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      parsePositiveInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const listWhere = {
      userId,
      ...(unread ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: listWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      db.notification.count({ where: listWhere }),
      db.notification.count({ where: { userId, isRead: false } }),
    ]);

    return Response.json({ notifications, unreadCount, total });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface MarkReadBody {
  notificationIds?: unknown;
  all?: unknown;
}

/**
 * PUT /api/notifications
 * Mark one or several notifications as read for the authenticated user.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    let body: MarkReadBody;
    try {
      body = (await req.json()) as MarkReadBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const all = body.all === true;
    const rawIds = Array.isArray(body.notificationIds)
      ? body.notificationIds
      : [];
    const notificationIds = rawIds
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (!all && notificationIds.length === 0) {
      return Response.json(
        {
          error:
            "Spécifiez 'all: true' ou un tableau 'notificationIds' non vide.",
        },
        { status: 400 }
      );
    }

    const where = all
      ? { userId, isRead: false }
      : { id: { in: notificationIds }, userId, isRead: false };

    const result = await db.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    return Response.json({ updated: result.count }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
