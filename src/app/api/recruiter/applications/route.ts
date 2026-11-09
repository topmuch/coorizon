import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRecruiterCompany } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import type { ApplicationStatus } from "@prisma/client";

/**
 * GET /api/recruiter/applications
 *
 * Lists applications to the recruiter's company's job offers.
 * A recruiter only ever sees applications to THEIR company's offers.
 *
 * Query params:
 *  - status: filter by application status (ApplicationStatus)
 *  - offerId: filter by specific job offer
 *  - page: 1-based page number (default 1)
 *  - pageSize: items per page (default 20)
 */
export async function GET(req: NextRequest) {
  try {
    const { companyId } = await getRecruiterCompany();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const offerIdParam = searchParams.get("offerId");
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

    const offerId =
      typeof offerIdParam === "string" && offerIdParam.trim().length > 0
        ? offerIdParam.trim()
        : undefined;

    // Build the where clause, always scoped to the recruiter's company.
    const where = {
      jobOffer: { companyId },
      ...(status ? { status } : {}),
      ...(offerId ? { jobOfferId: offerId } : {}),
    };

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
              phone: true,
              candidateProfile: {
                select: {
                  desiredJob: true,
                  sector: true,
                  city: true,
                  italianLevel: true,
                  educationLevel: true,
                  nationality: true,
                },
              },
            },
          },
          jobOffer: {
            select: { id: true, title: true, city: true, sector: true },
          },
          interviews: {
            orderBy: { scheduledAt: "desc" },
            take: 1,
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
