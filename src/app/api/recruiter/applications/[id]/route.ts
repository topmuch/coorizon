import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRecruiterCompany } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";
import type { ApplicationStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Allowed status transitions for a recruiter (business rules).
 * Withdrawn is terminal and not actionable from the recruiter space.
 */
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  Submitted: ["Preselected", "Rejected"],
  Preselected: ["Interview", "Rejected"],
  Interview: ["Offered", "Rejected"],
  Offered: ["Accepted", "Rejected"],
  Accepted: [],
  Rejected: [],
  Withdrawn: [],
};

/**
 * GET /api/recruiter/applications/[id]
 *
 * Fetch a single application with full details (candidate profile, job offer,
 * history timeline, interviews). The application must belong to the recruiter's
 * company (jobOffer.companyId === companyId), otherwise 403.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = await getRecruiterCompany();
    const { id } = await params;

    const application = await db.application.findUnique({
      where: { id },
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
                availability: true,
                geographicMobility: true,
                residenceCountry: true,
              },
            },
          },
        },
        jobOffer: {
          select: {
            id: true,
            title: true,
            city: true,
            sector: true,
            contractType: true,
            italianLevel: true,
            companyId: true,
          },
        },
        history: {
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        interviews: {
          include: {
            recruiter: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });

    if (!application) {
      return Response.json(
        { error: "Candidature introuvable." },
        { status: 404 }
      );
    }

    if (application.jobOffer.companyId !== companyId) {
      return Response.json(
        { error: "Accès refusé. Vous n'avez pas la permission d'effectuer cette action." },
        { status: 403 }
      );
    }

    return Response.json({ application });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface UpdateBody {
  status?: unknown;
  recruiterNote?: unknown;
  rejectionReason?: unknown;
  comment?: unknown;
}

/**
 * PUT /api/recruiter/applications/[id]
 *
 * Update an application: change its status, set an internal recruiter note,
 * or record a rejection reason. Every status change creates an ApplicationHistory
 * entry with the recruiter as the actor.
 *
 * Body: { status?, recruiterNote?, rejectionReason?, comment? }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, userId } = await getRecruiterCompany();
    const { id } = await params;

    let body: UpdateBody;
    try {
      body = (await req.json()) as UpdateBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const application = await db.application.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        jobOffer: { select: { companyId: true } },
      },
    });

    if (!application) {
      return Response.json(
        { error: "Candidature introuvable." },
        { status: 404 }
      );
    }

    if (application.jobOffer.companyId !== companyId) {
      return Response.json(
        { error: "Accès refusé. Vous n'avez pas la permission d'effectuer cette action." },
        { status: 403 }
      );
    }

    const currentStatus = application.status;
    const desiredStatus =
      typeof body.status === "string" && body.status.length > 0
        ? (body.status as ApplicationStatus)
        : undefined;

    const recruiterNote =
      typeof body.recruiterNote === "string"
        ? body.recruiterNote.trim().length > 0
          ? body.recruiterNote.trim()
          : null
        : undefined;

    const rejectionReason =
      typeof body.rejectionReason === "string"
        ? body.rejectionReason.trim().length > 0
          ? body.rejectionReason.trim()
          : null
        : undefined;

    const comment =
      typeof body.comment === "string" && body.comment.trim().length > 0
        ? body.comment.trim()
        : null;

    // Validate status transition if requested.
    if (desiredStatus && desiredStatus !== currentStatus) {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(desiredStatus)) {
        return Response.json(
          {
            error: `Transition de statut non autorisée : ${currentStatus} → ${desiredStatus}.`,
          },
          { status: 400 }
        );
      }

      // A rejection MUST include a reason.
      if (desiredStatus === "Rejected" && !rejectionReason) {
        return Response.json(
          { error: "Un motif de refus est obligatoire." },
          { status: 400 }
        );
      }
    }

    // Build the update payload + history entry.
    type UpdatePayload = {
      status?: ApplicationStatus;
      recruiterNote?: string | null;
      rejectionReason?: string | null;
      history?: {
        create: {
          fromStatus: ApplicationStatus;
          toStatus: ApplicationStatus;
          changedById: string;
          comment: string | null;
        }[];
      };
    };

    const updateData: UpdatePayload = {};

    if (recruiterNote !== undefined) {
      updateData.recruiterNote = recruiterNote;
    }
    if (rejectionReason !== undefined) {
      updateData.rejectionReason = rejectionReason;
    }

    let fromStatus: ApplicationStatus | null = currentStatus;
    let toStatus: ApplicationStatus | null = null;

    if (desiredStatus && desiredStatus !== currentStatus) {
      fromStatus = currentStatus;
      toStatus = desiredStatus;
      updateData.status = desiredStatus;
      // Clear rejection reason when leaving Rejected, set it when entering.
      if (desiredStatus === "Rejected") {
        updateData.rejectionReason = rejectionReason ?? null;
      }
      updateData.history = {
        create: [
          {
            fromStatus: currentStatus,
            toStatus: desiredStatus,
            changedById: userId,
            comment: comment ?? rejectionReason ?? null,
          },
        ],
      };
    }

    const updated = await db.application.update({
      where: { id },
      data: updateData,
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
    });

    await audit({
      actorId: userId,
      action: "recruiter.application.update",
      targetType: "Application",
      targetId: id,
      metadata: { fromStatus, toStatus },
      req,
    });

    return Response.json({ application: updated }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
