import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/courses
 * List the public training catalog (published courses) plus the candidate's
 * own enrollments. Reserved to authenticated candidates.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;

    const [courses, enrollments] = await Promise.all([
      db.trainingCourse.findMany({
        where: { isPublished: true },
        include: {
          _count: { select: { modules: true } },
          trainer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { level: "asc" },
      }),
      db.enrollment.findMany({
        where: { candidateId },
        include: {
          course: { select: { id: true, title: true, level: true } },
        },
      }),
    ]);

    return Response.json({ courses, enrollments });
  } catch (error) {
    return authErrorResponse(error);
  }
}
