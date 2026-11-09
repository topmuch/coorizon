import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { ApplicationStatus } from "@prisma/client";

/**
 * GET /api/admin/applications
 *
 * Global applications list across all companies (admin back-office — LOT 5).
 *
 * Query params:
 *  - status:     filter by application status (ApplicationStatus)
 *  - companyId:  filter by job offer's company id
 *  - q:          free-text search on candidate firstName / lastName / email
 *  - page:       1-based page number (default 1)
 *  - pageSize:   items per page (default 20, capped to 100)
 *
 * Returns: { applications, total, page, pageSize }
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
    const companyIdParam = searchParams.get("companyId");
    const qParam = searchParams.get("q");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(pageSizeParam) || 20));

    // Validate status filter if provided.
    const ALLOWED_STATUSES: ApplicationStatus[] = [
      "Submitted",
      "Preselected",
      "Interview",
      "Offered",
      "Accepted",
      "Rejected",
      "Withdrawn",
    ];
    const status =
      statusParam && ALLOWED_STATUSES.includes(statusParam as ApplicationStatus)
        ? (statusParam as ApplicationStatus)
        : undefined;

    const companyId =
      typeof companyIdParam === "string" && companyIdParam.trim().length > 0
        ? companyIdParam.trim()
        : undefined;

    const q =
      typeof qParam === "string" && qParam.trim().length > 0
        ? qParam.trim()
        : undefined;

    // Build the where clause. AND array keeps it clean and composable.
    type WhereClause = {
      status?: ApplicationStatus;
      jobOffer?: { companyId?: string };
      candidate?: {
        OR?: Array<{
          firstName?: { contains: string };
          lastName?: { contains: string };
          email?: { contains: string };
        }>;
      };
    };

    const where: WhereClause = {};
    if (status) where.status = status;
    if (companyId) where.jobOffer = { companyId };

    if (q) {
      where.candidate = {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      };
    }

    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              candidateProfile: {
                select: {
                  desiredJob: true,
                  sector: true,
                  city: true,
                },
              },
            },
          },
          jobOffer: {
            select: {
              id: true,
              title: true,
              city: true,
              company: { select: { id: true, legalName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.application.count({ where }),
    ]);

    return Response.json({ applications, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
