import { NextRequest } from "next/server";
import {
  ApplicationStatus,
  CompanyStatus,
  EnrollmentStatus,
  JobOfferStatus,
  PaymentStatus,
  Role,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * GET /api/admin/stats
 *
 * Aggregated platform metrics for the admin back-office dashboard.
 * Admin/SuperAdmin only — every other role gets a 403.
 *
 * Response shape:
 * {
 *   totals: {
 *     candidates, newCandidates, recruiters,
 *     validatedCompanies, pendingCompanies,
 *     activeOffers, pendingOffers,
 *     totalApplications, recruitmentsFinalized,
 *     enrollments, activeEnrollments,
 *     immigrationCases, certificates,
 *     payments, revenue
 *   },
 *   monthlyData: [{ month: "MM", candidates, applications, offers }, ...] // last 6 months
 *   applicationsByStatus: Record<ApplicationStatus, number>,
 *   usersByRole: Record<Role, number>
 * }
 */
export async function GET(_req: NextRequest): Promise<Response> {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // ----- Monthly buckets: last 6 months (current + 5 previous) -----
    // SQLite + Prisma groupBy on DateTime is unreliable, so we issue
    // explicit range-scoped counts per month bucket.
    const monthlyBuckets: { start: Date; end: Date; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1,
        0,
        0,
        0,
        0
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        1,
        0,
        0,
        0,
        0
      );
      const label = `${(start.getMonth() + 1).toString().padStart(2, "0")}`;
      monthlyBuckets.push({ start, end, label });
    }

    const monthlyData = await Promise.all(
      monthlyBuckets.map(async (bucket) => {
        const [candidates, applications, offers] = await Promise.all([
          db.user.count({
            where: {
              role: Role.Candidate,
              createdAt: { gte: bucket.start, lt: bucket.end },
            },
          }),
          db.application.count({
            where: { createdAt: { gte: bucket.start, lt: bucket.end } },
          }),
          db.jobOffer.count({
            where: { createdAt: { gte: bucket.start, lt: bucket.end } },
          }),
        ]);
        return {
          month: bucket.label,
          candidates,
          applications,
          offers,
        };
      })
    );

    // ----- Totals + groupBy (all in parallel) -----
    const [
      candidates,
      newCandidates,
      recruiters,
      validatedCompanies,
      pendingCompanies,
      activeOffers,
      pendingOffers,
      totalApplications,
      recruitmentsFinalized,
      enrollments,
      activeEnrollments,
      immigrationCases,
      certificates,
      payments,
      revenueAgg,
      applicationsByStatusRaw,
      usersByRoleRaw,
    ] = await Promise.all([
      db.user.count({ where: { role: Role.Candidate } }),
      db.user.count({
        where: {
          role: Role.Candidate,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      db.user.count({ where: { role: Role.Recruiter } }),
      db.company.count({ where: { status: CompanyStatus.Validated } }),
      db.company.count({ where: { status: CompanyStatus.Pending } }),
      db.jobOffer.count({ where: { status: JobOfferStatus.Published } }),
      db.jobOffer.count({
        where: { status: JobOfferStatus.PendingValidation },
      }),
      db.application.count(),
      db.application.count({
        where: { status: ApplicationStatus.Accepted },
      }),
      db.enrollment.count(),
      db.enrollment.count({ where: { status: EnrollmentStatus.Active } }),
      db.immigrationCase.count(),
      db.certificate.count(),
      db.payment.count({ where: { status: PaymentStatus.Paid } }),
      db.payment.aggregate({
        where: { status: PaymentStatus.Paid },
        _sum: { amount: true },
      }),
      db.application.groupBy({ by: ["status"], _count: true }),
      db.user.groupBy({ by: ["role"], _count: true }),
    ]);

    const applicationsByStatus: Record<string, number> = {};
    for (const row of applicationsByStatusRaw) {
      applicationsByStatus[row.status] = row._count;
    }
    const usersByRole: Record<string, number> = {};
    for (const row of usersByRoleRaw) {
      usersByRole[row.role] = row._count;
    }

    return Response.json({
      totals: {
        candidates,
        newCandidates,
        recruiters,
        validatedCompanies,
        pendingCompanies,
        activeOffers,
        pendingOffers,
        totalApplications,
        recruitmentsFinalized,
        enrollments,
        activeEnrollments,
        immigrationCases,
        certificates,
        payments,
        revenue: revenueAgg._sum.amount ?? 0,
      },
      monthlyData,
      applicationsByStatus,
      usersByRole,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
