import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

interface ProgressBody {
  courseId?: unknown;
  progressPct?: unknown;
}

/**
 * PUT /api/candidate/progress
 * Update the lesson-completion progress for the authenticated candidate on
 * a course they are enrolled in.
 *
 * Body: { courseId: string, progressPct: number (0–100) }
 * - 404 if the candidate is not enrolled in this course
 * - 200 with the updated enrollment otherwise
 *
 * When progressPct reaches 100, the enrollment is automatically marked
 * Completed and completedAt is stamped.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;

    let body: ProgressBody;
    try {
      body = (await req.json()) as ProgressBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const courseId =
      typeof body.courseId === "string" ? body.courseId.trim() : "";
    const rawPct = body.progressPct;
    const progressPct =
      typeof rawPct === "number" && Number.isFinite(rawPct)
        ? Math.max(0, Math.min(100, Math.round(rawPct)))
        : null;

    if (!courseId) {
      return Response.json(
        { error: "L'identifiant de la formation est requis." },
        { status: 400 }
      );
    }
    if (progressPct === null) {
      return Response.json(
        { error: "Le pourcentage de progression est invalide." },
        { status: 400 }
      );
    }

    const existing = await db.enrollment.findUnique({
      where: { candidateId_courseId: { candidateId, courseId } },
      select: { id: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Inscription introuvable pour cette formation." },
        { status: 404 }
      );
    }

    const isComplete = progressPct === 100;
    const enrollment = await db.enrollment.update({
      where: { candidateId_courseId: { candidateId, courseId } },
      data: {
        progressPct,
        ...(isComplete
          ? { status: "Completed", completedAt: new Date() }
          : {}),
      },
    });

    return Response.json({ enrollment }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
