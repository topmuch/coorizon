import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * Admin automation events API (LOT 9 — Automatisations).
 *
 * GET /api/admin/automation/events
 *   Lists automation events (admin only) with optional filters on event type
 *   and webhook delivery status. Returns paginated results plus delivery
 *   stats for the last 24 hours.
 *
 * Query params:
 *   type           : filter by event type (e.g. "candidate.registered")
 *   webhookStatus  : "pending" | "delivered" | "failed" | "skipped"
 *   page           : 1-based page number (default 1)
 *   pageSize       : items per page (default 50, capped at 200)
 */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const ALLOWED_STATUSES = new Set([
  "pending",
  "delivered",
  "failed",
  "skipped",
]);

interface EventStats {
  totalEvents: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  skippedCount: number;
}

interface EventsListResponse {
  events: AutomationEventRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: EventStats;
}

interface AutomationEventRow {
  id: string;
  type: string;
  targetType: string | null;
  targetId: string | null;
  actorId: string | null;
  payload: string;
  webhookStatus: string | null;
  webhookError: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const typeParam = url.searchParams.get("type")?.trim() ?? "";
    const statusParam = url.searchParams.get("webhookStatus")?.trim() ?? "";

    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSizeRaw =
      Number(url.searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(Math.max(1, pageSizeRaw), MAX_PAGE_SIZE);

    // Build the WHERE clause from the provided filters.
    const andClause: Record<string, unknown>[] = [];
    if (typeParam) {
      andClause.push({ type: typeParam });
    }
    if (statusParam && ALLOWED_STATUSES.has(statusParam)) {
      andClause.push({ webhookStatus: statusParam });
    }
    const where = andClause.length > 0 ? { AND: andClause } : {};

    const [events, total, stats] = await Promise.all([
      db.automationEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.automationEvent.count({ where }),
      computeStats(),
    ]);

    const rows: AutomationEventRow[] = events.map((e) => ({
      id: e.id,
      type: e.type,
      targetType: e.targetType,
      targetId: e.targetId,
      actorId: e.actorId,
      payload: e.payload,
      webhookStatus: e.webhookStatus,
      webhookError: e.webhookError,
      deliveredAt: e.deliveredAt ? e.deliveredAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
    }));

    const body: EventsListResponse = {
      events: rows,
      total,
      page,
      pageSize,
      stats,
    };

    return Response.json(body);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * Compute delivery stats for the last 24 hours. Each count is independent —
 * the totals are not mutually exclusive across the whole table, only across
 * the 24h window (an event has exactly one of these statuses).
 */
async function computeStats(): Promise<EventStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalEvents, deliveredCount, failedCount, pendingCount, skippedCount] =
    await Promise.all([
      db.automationEvent.count({ where: { createdAt: { gte: since } } }),
      db.automationEvent.count({
        where: { createdAt: { gte: since }, webhookStatus: "delivered" },
      }),
      db.automationEvent.count({
        where: { createdAt: { gte: since }, webhookStatus: "failed" },
      }),
      db.automationEvent.count({
        where: { createdAt: { gte: since }, webhookStatus: "pending" },
      }),
      db.automationEvent.count({
        where: { createdAt: { gte: since }, webhookStatus: "skipped" },
      }),
    ]);

  return {
    totalEvents,
    deliveredCount,
    failedCount,
    pendingCount,
    skippedCount,
  };
}
