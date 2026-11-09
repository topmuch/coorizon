import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authErrorResponse, requireSession } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/trainer/exams
 *
 * Returns the exercises (with question / attempt counts) for the
 * authenticated trainer's courses, plus the 50 most recent exam attempts on
 * those exercises. Every query is scoped to `course.trainerId === session.user.id`.
 *
 * Response shape:
 * {
 *   exams: Array<Exercise & { course: {...}, _count: { attempts, questions } }>,
 *   recentAttempts: Array<ExamAttempt & { candidate: {...}, exercise: {...} }>
 * }
 */
export async function GET(_req: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return authErrorResponse(error);
  }

  if (session.user.role !== ROLES.Trainer) {
    return Response.json(
      { error: "Réservé aux formateurs." },
      { status: 403 }
    );
  }

  const trainerId = session.user.id;

  const [exams, recentAttempts] = await Promise.all([
    db.exercise.findMany({
      where: { course: { trainerId } },
      include: {
        course: {
          select: { title: true, level: true },
        },
        _count: {
          select: { attempts: true, questions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.examAttempt.findMany({
      where: { exercise: { course: { trainerId } } },
      include: {
        candidate: {
          select: { firstName: true, lastName: true },
        },
        exercise: {
          select: { title: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
  ]);

  return Response.json({ exams, recentAttempts });
}
