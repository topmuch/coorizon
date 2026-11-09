import { NextRequest } from "next/server";
import {
  ApplicationStatus,
  DocumentStatus,
  DocumentType,
  EnrollmentStatus,
  type ImmigrationCaseStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse, requireSession } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/stats
 *
 * Aggregated dashboard metrics for the authenticated candidate.
 * Every query is scoped to `session.user.id` — a candidate never sees
 * another candidate's data.
 *
 * Response shape:
 * {
 *   profileCompletion: number,        // 0-100
 *   italianLevel: string | null,      // A1..C2
 *   activeEnrollments: number,        // formations "Active"
 *   applicationsSent: number,         // total candidatures
 *   applicationsInProgress: number,   // hors Rejected/Withdrawn
 *   interviewsScheduled: number,      // entretiens à venir (Scheduled + futur)
 *   pendingDocs: number,              // documents en attente de validation
 *   missingDocs: number,              // types requis sans doc valide/en attente
 *   immigrationStatus: ImmigrationCaseStatus | null
 * }
 */
export async function GET(_req: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return authErrorResponse(error);
  }

  if (session.user.role !== ROLES.Candidate) {
    return Response.json(
      { error: "Réservé aux candidats." },
      { status: 403 }
    );
  }

  const userId = session.user.id;

  // The 5 document types a candidate is always expected to provide.
  const requiredDocTypes: DocumentType[] = [
    DocumentType.CV,
    DocumentType.Passport,
    DocumentType.IDCard,
    DocumentType.Diploma,
    DocumentType.CoverLetter,
  ];

  // Statuts considérés comme "en cours" pour une candidature.
  const inProgressStatuses: ApplicationStatus[] = [
    ApplicationStatus.Submitted,
    ApplicationStatus.Preselected,
    ApplicationStatus.Interview,
    ApplicationStatus.Offered,
    ApplicationStatus.Accepted,
  ];

  // Statuts de document jugés "présents et exploitables".
  const okDocStatuses: DocumentStatus[] = [
    DocumentStatus.Validated,
    DocumentStatus.Pending,
  ];

  const [
    profile,
    pendingDocs,
    requiredDocs,
    applicationsSent,
    applicationsInProgress,
    interviewsScheduled,
    activeEnrollments,
    latestImmigrationCase,
  ] = await Promise.all([
    db.candidateProfile.findUnique({
      where: { userId },
      select: { completionPct: true, italianLevel: true },
    }),
    db.candidateDocument.count({
      where: { candidateId: userId, status: DocumentStatus.Pending },
    }),
    db.candidateDocument.findMany({
      where: {
        candidateId: userId,
        type: { in: requiredDocTypes },
        status: { in: okDocStatuses },
      },
      select: { type: true },
      distinct: ["type"],
    }),
    db.application.count({ where: { candidateId: userId } }),
    db.application.count({
      where: {
        candidateId: userId,
        status: { in: inProgressStatuses },
      },
    }),
    db.interview.count({
      where: {
        candidateId: userId,
        status: "Scheduled",
        scheduledAt: { gte: new Date() },
      },
    }),
    db.enrollment.count({
      where: { candidateId: userId, status: EnrollmentStatus.Active },
    }),
    db.immigrationCase.findFirst({
      where: { candidateId: userId },
      orderBy: { updatedAt: "desc" },
      select: { status: true },
    }),
  ]);

  // Types requis couverts par au moins un document Validated/Pending.
  const coveredTypes = new Set<DocumentType>(
    requiredDocs.map((d) => d.type)
  );
  const missingDocs = requiredDocTypes.filter(
    (t) => !coveredTypes.has(t)
  ).length;

  const italianLevel = profile?.italianLevel ?? null;

  const stats = {
    profileCompletion: profile?.completionPct ?? 0,
    italianLevel: italianLevel === null ? null : String(italianLevel),
    activeEnrollments,
    applicationsSent,
    applicationsInProgress,
    interviewsScheduled,
    pendingDocs,
    missingDocs,
    immigrationStatus:
      (latestImmigrationCase?.status as ImmigrationCaseStatus | undefined) ??
      null,
  };

  return Response.json(stats);
}
