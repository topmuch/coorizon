import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/applications
 * List the authenticated candidate's own applications, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;

    const applications = await db.application.findMany({
      where: { candidateId },
      include: {
        jobOffer: {
          include: {
            company: { select: { legalName: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ applications });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface ApplyBody {
  jobOfferId?: unknown;
  coverLetter?: unknown;
}

/**
 * POST /api/candidate/applications
 * Apply to a published job offer.
 *
 * Body: { jobOfferId: string, coverLetter?: string }
 * - 404 if the offer doesn't exist or isn't published
 * - 409 if the candidate has already applied to this offer
 * - 201 with the created application otherwise
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;

    let body: ApplyBody;
    try {
      body = (await req.json()) as ApplyBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const jobOfferId =
      typeof body.jobOfferId === "string" ? body.jobOfferId.trim() : "";
    const coverLetter =
      typeof body.coverLetter === "string" && body.coverLetter.trim().length > 0
        ? body.coverLetter.trim()
        : null;

    if (!jobOfferId) {
      return Response.json(
        { error: "L'identifiant de l'offre est requis." },
        { status: 400 }
      );
    }

    const offer = await db.jobOffer.findUnique({
      where: { id: jobOfferId },
      select: { id: true, status: true, title: true },
    });

    if (!offer || offer.status !== "Published") {
      return Response.json(
        { error: "Offre introuvable ou non publiée." },
        { status: 404 }
      );
    }

    const existing = await db.application.findFirst({
      where: { candidateId, jobOfferId },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { error: "Vous avez déjà postulé à cette offre." },
        { status: 409 }
      );
    }

    const application = await db.application.create({
      data: {
        candidateId,
        jobOfferId,
        status: "Submitted",
        coverLetter,
        history: {
          create: [
            {
              fromStatus: null,
              toStatus: "Submitted",
              changedById: candidateId,
              comment: "Candidature envoyée",
            },
          ],
        },
      },
      include: {
        jobOffer: {
          include: { company: { select: { legalName: true, city: true } } },
        },
      },
    });

    await audit({
      actorId: candidateId,
      action: "candidate.application.create",
      targetType: "Application",
      targetId: application.id,
      metadata: { jobOfferId },
      req,
    });

    return Response.json({ application }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
