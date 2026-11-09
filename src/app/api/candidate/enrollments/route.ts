import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/enrollments
 * List the authenticated candidate's enrollments with full course content
 * (modules → lessons → exercises) and progress. Newest first.
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

    const enrollments = await db.enrollment.findMany({
      where: { candidateId },
      include: {
        course: {
          include: {
            modules: { include: { lessons: true } },
            exercises: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return Response.json({ enrollments });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface EnrollBody {
  courseId?: unknown;
}

/**
 * POST /api/candidate/enrollments
 * Enroll the authenticated candidate in a published course.
 *
 * Body: { courseId: string }
 * - 404 if the course does not exist or is not published
 * - 409 if the candidate is already enrolled
 * - 201 with the created enrollment otherwise
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

    let body: EnrollBody;
    try {
      body = (await req.json()) as EnrollBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const courseId =
      typeof body.courseId === "string" ? body.courseId.trim() : "";

    if (!courseId) {
      return Response.json(
        { error: "L'identifiant de la formation est requis." },
        { status: 400 }
      );
    }

    const course = await db.trainingCourse.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, isPublished: true },
    });

    if (!course || !course.isPublished) {
      return Response.json(
        { error: "Formation introuvable ou non publiée." },
        { status: 404 }
      );
    }

    const existing = await db.enrollment.findFirst({
      where: { candidateId, courseId },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { error: "Vous êtes déjà inscrit à cette formation." },
        { status: 409 }
      );
    }

    const enrollment = await db.enrollment.create({
      data: {
        candidateId,
        courseId,
        status: "Active",
        progressPct: 0,
      },
      include: {
        course: { select: { id: true, title: true, level: true } },
      },
    });

    await audit({
      actorId: candidateId,
      action: "candidate.enrollment.create",
      targetType: "Enrollment",
      targetId: enrollment.id,
      metadata: { courseId, courseTitle: course.title },
      req,
    });

    return Response.json({ enrollment }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
