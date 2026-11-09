import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * Valid payment statuses (mirrors the Prisma PaymentStatus enum).
 */
const VALID_STATUSES: ReadonlySet<string> = new Set<string>([
  PaymentStatus.Pending,
  PaymentStatus.Paid,
  PaymentStatus.Failed,
  PaymentStatus.Refunded,
  PaymentStatus.Cancelled,
]);

function parsePage(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function parsePageSize(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 100);
}

interface ListStats {
  totalRevenue: number;
  pendingCount: number;
  refundedCount: number;
}

interface ListResponse {
  payments: Prisma.PaymentGetPayload<{
    include: {
      user: { select: { id: true; firstName: true; lastName: true; email: true } };
      service: { select: { id: true; name: true; category: true } };
    };
  }>[];
  total: number;
  page: number;
  pageSize: number;
  stats: ListStats;
}

/**
 * GET /api/admin/payments
 *
 * Paginated, filterable list of all payments with high-level commercial
 * statistics. Admin/SuperAdmin only.
 *
 * Query params:
 *  - status   : filter by PaymentStatus (Pending|Paid|Failed|Refunded|Cancelled)
 *  - q        : search across description and user email (contains, case-insensitive)
 *  - page     : 1-based page index (default 1)
 *  - pageSize : items per page (default 20, max 100)
 *
 * Response: { payments, total, page, pageSize, stats }
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
    const statusParam = searchParams.get("status");
    const qParam = (searchParams.get("q") ?? "").trim();

    const status =
      statusParam && VALID_STATUSES.has(statusParam)
        ? (statusParam as PaymentStatus)
        : undefined;

    const page = parsePage(searchParams.get("page"));
    const pageSize = parsePageSize(searchParams.get("pageSize"));

    const filters: Prisma.PaymentWhereInput[] = [];
    if (status) filters.push({ status });
    if (qParam.length > 0) {
      filters.push({
        OR: [
          { description: { contains: qParam } },
          { user: { email: { contains: qParam } } },
        ],
      });
    }

    const where: Prisma.PaymentWhereInput = { AND: filters };

    const [payments, total, paidAggregate, pendingCount, refundedCount] =
      await Promise.all([
        db.payment.findMany({
          where,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            service: { select: { id: true, name: true, category: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.payment.count({ where }),
        db.payment.aggregate({
          where: { status: PaymentStatus.Paid },
          _sum: { amount: true },
        }),
        db.payment.count({ where: { status: PaymentStatus.Pending } }),
        db.payment.count({ where: { status: PaymentStatus.Refunded } }),
      ]);

    const stats: ListStats = {
      totalRevenue: paidAggregate._sum.amount ?? 0,
      pendingCount,
      refundedCount,
    };

    const response: ListResponse = {
      payments,
      total,
      page,
      pageSize,
      stats,
    };

    return Response.json(response);
  } catch (error) {
    return authErrorResponse(error);
  }
}
