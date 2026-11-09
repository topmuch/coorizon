import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/courses/[id]
 * Fetch a single published course with its full content tree
 * (modules → lessons → resources), its exercises (lightweight), the
 * candidate's enrollment for this course (if any), and their exam attempts.
 * Reserved to authenticated candidates.
 *
 * Next.js 16: `params` is a Promise and must be awaited.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;
    const { id: courseId } = await params;

    const course = await db.trainingCourse.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              include: { resources: true },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        exercises: {
          select: {
            id: true,
            title: true,
            type: true,
            passingScore: true,
            timeLimitMin: true,
          },
          orderBy: { order: "asc" },
        },
        trainer: { select: { firstName: true, lastName: true } },
      },
    });

    if (!course || !course.isPublished) {
      return Response.json(
        { error: "Formation introuvable ou non publiée." },
        { status: 404 }
      );
    }

    // The candidate's enrollment for this course, if any.
    const enrollment = await db.enrollment.findUnique({
      where: { candidateId_courseId: { candidateId, courseId } },
      select: {
        id: true,
        status: true,
        progressPct: true,
        enrolledAt: true,
        completedAt: true,
      },
    });

    // Their exam attempts for this course's exercises.
    const exerciseIds = course.exercises.map((e) => e.id);
    const attempts =
      exerciseIds.length === 0
        ? []
        : await db.examAttempt.findMany({
            where: { candidateId, exerciseId: { in: exerciseIds } },
            orderBy: { startedAt: "desc" },
            select: {
              id: true,
              exerciseId: true,
              score: true,
              maxScore: true,
              passed: true,
              completedAt: true,
              startedAt: true,
            },
          });

    return Response.json({ course, enrollment, attempts });
  } catch (error) {
    return authErrorResponse(error);
  }
}
