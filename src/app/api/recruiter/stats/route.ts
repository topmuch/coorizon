import { NextRequest } from "next/server";
import {
  ApplicationStatus,
  JobOfferStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/auth/session";
import { getRecruiterCompany } from "@/lib/auth/recruiter";

/**
 * GET /api/recruiter/stats
 *
 * Aggregated dashboard metrics for the authenticated recruiter.
 * Every query is scoped to the recruiter's own company — a recruiter
 * never sees another company's offers, applications or interviews.
 *
 * Response shape:
 * {
 *   company: { legalName, sector, city, region, status } | null,
 *   totalOffers: number,
 *   activeOffers: number,         // Published + PendingValidation
 *   publishedOffers: number,
 *   draftOffers: number,
 *   totalApplications: number,
 *   applicationsByStatus: Record<ApplicationStatus, number>,
 *   preselectedCount: number,
 *   interviewsScheduled: number,
 *   recruitmentsFinalized: number // applications "Accepted"
 * }
 */
export async function GET(_req: NextRequest): Promise<Response> {
  let companyId: string;
  try {
    const ctx = await getRecruiterCompany();
    companyId = ctx.companyId;
  } catch (error) {
    return authErrorResponse(error);
  }

  // Statuts considérés comme "actifs" pour une offre.
  const activeStatuses: JobOfferStatus[] = [
    JobOfferStatus.Published,
    JobOfferStatus.PendingValidation,
  ];

  // Tous les statuts de candidature, pour garantir une map complète
  // (même les statuts à zéro candidature sont présents).
  const allApplicationStatuses: ApplicationStatus[] = [
    ApplicationStatus.Submitted,
    ApplicationStatus.Preselected,
    ApplicationStatus.Interview,
    ApplicationStatus.Offered,
    ApplicationStatus.Accepted,
    ApplicationStatus.Rejected,
    ApplicationStatus.Withdrawn,
  ];

  const [
    company,
    totalOffers,
    activeOffers,
    publishedOffers,
    draftOffers,
    totalApplications,
    applicationsByStatusRaw,
    preselectedCount,
    interviewsScheduled,
    recruitmentsFinalized,
  ] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      select: {
        legalName: true,
        sector: true,
        city: true,
        region: true,
        status: true,
      },
    }),
    db.jobOffer.count({ where: { companyId } }),
    db.jobOffer.count({
      where: { companyId, status: { in: activeStatuses } },
    }),
    db.jobOffer.count({
      where: { companyId, status: JobOfferStatus.Published },
    }),
    db.jobOffer.count({
      where: { companyId, status: JobOfferStatus.Draft },
    }),
    db.application.count({
      where: { jobOffer: { companyId } },
    }),
    db.application.groupBy({
      by: ["status"],
      where: { jobOffer: { companyId } },
      _count: true,
    }),
    db.application.count({
      where: {
        jobOffer: { companyId },
        status: ApplicationStatus.Preselected,
      },
    }),
    db.interview.count({
      where: {
        application: { jobOffer: { companyId } },
        status: "Scheduled",
      },
    }),
    db.application.count({
      where: {
        jobOffer: { companyId },
        status: ApplicationStatus.Accepted,
      },
    }),
  ]);

  // Transforme le résultat de groupBy en map complète { Submitted: N, ... }.
  const applicationsByStatus = allApplicationStatuses.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<ApplicationStatus, number>
  );
  for (const row of applicationsByStatusRaw) {
    applicationsByStatus[row.status] = row._count;
  }

  return Response.json({
    company: company
      ? {
          legalName: company.legalName,
          sector: company.sector,
          city: company.city,
          region: company.region,
          status: company.status,
        }
      : null,
    totalOffers,
    activeOffers,
    publishedOffers,
    draftOffers,
    totalApplications,
    applicationsByStatus,
    preselectedCount,
    interviewsScheduled,
    recruitmentsFinalized,
  });
}
