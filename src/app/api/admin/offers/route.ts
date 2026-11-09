import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * Admin job offers list API (LOT 5 — Task 5-c).
 *
 * GET /api/admin/offers  — list ALL job offers across ALL companies (excluding
 *                          Archived ones), with optional filters:
 *                            • status   — JobOfferStatus value
 *                            • companyId— restrict to one company
 *                            • q        — title search (case-insensitive)
 *                            • page     — 1-based page number (default 1)
 *                            • pageSize — items per page (default 20)
 *
 *                          Each offer is returned with its company's
 *                          `legalName`, `city`, `sector` and the application
 *                          count via `_count.applications`.
 *
 *                          Response shape:
 *                            { offers, total, page, pageSize }
 *
 * Admin / SuperAdmin only.
 */

type AdminOfferStatus =
  | "Draft"
  | "PendingValidation"
  | "Published"
  | "Suspended"
  | "Closed"
  | "Archived";

const STATUS_FILTERS: ReadonlySet<AdminOfferStatus> = new Set([
  "Draft",
  "PendingValidation",
  "Published",
  "Suspended",
  "Closed",
  "Archived",
]);

/** Trim a string. Empty / whitespace / non-string → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parse a positive integer from a query param. Returns null if invalid. */
function toPositiveInt(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/**
 * GET /api/admin/offers
 * Paginated, filterable list of all job offers (excluding archived).
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

    const statusParam = toOptionalString(searchParams.get("status"));
    const companyId = toOptionalString(searchParams.get("companyId"));
    const q = toOptionalString(searchParams.get("q"));

    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(
      toPositiveInt(searchParams.get("pageSize"), 20),
      100
    );

    // Build the WHERE clause. Archived offers are excluded by default; the
    // admin can still filter to see only archived ones by passing
    // ?status=Archived explicitly.
    const andClauses: Prisma.JobOfferWhereInput[] = [];
    if (
      statusParam &&
      STATUS_FILTERS.has(statusParam as AdminOfferStatus) &&
      statusParam !== "Archived"
    ) {
      andClauses.push({ status: statusParam as never });
    }
    if (companyId) {
      andClauses.push({ companyId });
    }
    if (q) {
      // SQLite's `contains` is case-insensitive for ASCII by default.
      andClauses.push({ title: { contains: q } });
    }

    const where: Prisma.JobOfferWhereInput = {
      status:
        statusParam === "Archived"
          ? ("Archived" as never)
          : { not: "Archived" },
      AND: andClauses,
    };

    const [offers, total] = await Promise.all([
      db.jobOffer.findMany({
        where,
        include: {
          company: {
            select: { id: true, legalName: true, city: true, sector: true },
          },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.jobOffer.count({ where }),
    ]);

    return Response.json({ offers, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
