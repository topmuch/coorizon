import { NextRequest } from "next/server";
import { EnrollmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/exams
 *
 * Lists the exams available to the authenticated candidate (the exercises
 * attached to the courses they are actively enrolled in) together with their
 * past attempts, newest first.
 *
 * Response: { exams: Exercise[], attempts: ExamAttempt[] }
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

    // Active or completed enrollments → the courses the candidate may be
    // examined on.
    const enrollments = await db.enrollment.findMany({
      where: {
        candidateId,
        status: { in: [EnrollmentStatus.Active, EnrollmentStatus.Completed] },
      },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);

    const exams = await db.exercise.findMany({
      where: { course: { id: { in: courseIds } } },
      include: {
        course: { select: { id: true, title: true, level: true } },
      },
      orderBy: { order: "asc" },
    });

    const attempts = await db.examAttempt.findMany({
      where: { candidateId },
      include: {
        exercise: { select: { id: true, title: true, courseId: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return Response.json({ exams, attempts });
  } catch (error) {
    return authErrorResponse(error);
  }
}
