import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRecruiterCompany } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";

/**
 * GET /api/recruiter/interviews
 *
 * Lists all interviews scheduled for applications to the recruiter's company's
 * offers, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const { companyId } = await getRecruiterCompany();

    const interviews = await db.interview.findMany({
      where: { application: { jobOffer: { companyId } } },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        recruiter: {
          select: { id: true, firstName: true, lastName: true },
        },
        application: {
          include: {
            jobOffer: { select: { id: true, title: true, city: true } },
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    return Response.json({ interviews });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface CreateInterviewBody {
  applicationId?: unknown;
  scheduledAt?: unknown;
  durationMin?: unknown;
  location?: unknown;
  meetingUrl?: unknown;
  note?: unknown;
}

/**
 * POST /api/recruiter/interviews
 *
 * Schedule a new interview for an application.
 * - Verifies the application belongs to the recruiter's company.
 * - Creates the Interview row (status "Scheduled").
 * - Updates the application status to "Interview" and creates an
 *   ApplicationHistory entry.
 *
 * Body: { applicationId, scheduledAt, durationMin?, location?, meetingUrl?, note? }
 */
export async function POST(req: NextRequest) {
  try {
    const { companyId, userId } = await getRecruiterCompany();

    let body: CreateInterviewBody;
    try {
      body = (await req.json()) as CreateInterviewBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const applicationId =
      typeof body.applicationId === "string" && body.applicationId.trim().length > 0
        ? body.applicationId.trim()
        : "";

    const scheduledAtRaw =
      typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";

    if (!applicationId) {
      return Response.json(
        { error: "L'identifiant de la candidature est requis." },
        { status: 400 }
      );
    }

    if (!scheduledAtRaw) {
      return Response.json(
        { error: "La date et l'heure de l'entretien sont obligatoires." },
        { status: 400 }
      );
    }

    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return Response.json(
        { error: "Date d'entretien invalide." },
        { status: 400 }
      );
    }

    const durationMin =
      typeof body.durationMin === "number" && Number.isFinite(body.durationMin)
        ? Math.max(5, Math.min(480, Math.round(body.durationMin)))
        : typeof body.durationMin === "string" && body.durationMin.trim().length > 0
          ? Math.max(5, Math.min(480, Math.round(Number(body.durationMin)) || 30))
          : 30;

    const location =
      typeof body.location === "string" && body.location.trim().length > 0
        ? body.location.trim()
        : null;

    const meetingUrl =
      typeof body.meetingUrl === "string" && body.meetingUrl.trim().length > 0
        ? body.meetingUrl.trim()
        : null;

    const note =
      typeof body.note === "string" && body.note.trim().length > 0
        ? body.note.trim()
        : null;

    const application = await db.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        candidateId: true,
        jobOffer: { select: { companyId: true, title: true } },
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

    // Create the interview and update the application status atomically.
    const interview = await db.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          applicationId,
          candidateId: application.candidateId,
          recruiterId: userId,
          scheduledAt,
          durationMin,
          location,
          meetingUrl,
          note,
          status: "Scheduled",
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          application: {
            include: {
              jobOffer: { select: { id: true, title: true, city: true } },
            },
          },
        },
      });

      // Only move to "Interview" and log history if not already there.
      if (application.status !== "Interview") {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: "Interview",
            history: {
              create: [
                {
                  fromStatus: application.status,
                  toStatus: "Interview",
                  changedById: userId,
                  comment: "Entretien programmé",
                },
              ],
            },
          },
        });
      }

      return created;
    });

    await audit({
      actorId: userId,
      action: "recruiter.interview.create",
      targetType: "Interview",
      targetId: interview.id,
      metadata: {
        applicationId,
        scheduledAt: scheduledAt.toISOString(),
      },
      req,
    });

    return Response.json({ interview }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
