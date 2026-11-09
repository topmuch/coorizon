import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authErrorResponse, requireSession } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/trainer/stats
 *
 * Aggregated dashboard metrics for the authenticated trainer. Every query is
 * scoped to `session.user.id` — a trainer never sees another trainer's data.
 *
 * Response shape:
 * {
 *   totalCourses: number,
 *   publishedCourses: number,
 *   totalLearners: number,        // inscriptions toutes confondues
 *   activeLearners: number,       // inscriptions "Active"
 *   completedLearners: number,    // inscriptions "Completed"
 *   totalAttempts: number,        // tentatives d'examen sur les exercices du formateur
 *   passedAttempts: number,       // tentatives réussies
 *   avgScore: number              // score moyen en pourcentage (0-100)
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

  const [
    totalCourses,
    publishedCourses,
    enrollments,
    attemptsAgg,
    passedAttempts,
  ] = await Promise.all([
    db.trainingCourse.count({ where: { trainerId } }),
    db.trainingCourse.count({ where: { trainerId, isPublished: true } }),
    db.enrollment.findMany({
      where: { course: { trainerId } },
      select: { status: true },
    }),
    db.examAttempt.aggregate({
      where: { exercise: { course: { trainerId } } },
      _count: true,
      _avg: { score: true, maxScore: true },
    }),
    db.examAttempt.count({
      where: { exercise: { course: { trainerId } }, passed: true },
    }),
  ]);

  const totalLearners = enrollments.length;
  const activeLearners = enrollments.filter(
    (e) => e.status === "Active"
  ).length;
  const completedLearners = enrollments.filter(
    (e) => e.status === "Completed"
  ).length;

  const totalAttempts = attemptsAgg._count;
  const avgScoreAvg = attemptsAgg._avg.score ?? 0;
  const maxScoreAvg = attemptsAgg._avg.maxScore ?? 0;
  const avgScore =
    totalAttempts > 0 && maxScoreAvg > 0
      ? Math.round((avgScoreAvg / maxScoreAvg) * 100)
      : 0;

  return Response.json({
    totalCourses,
    publishedCourses,
    totalLearners,
    activeLearners,
    completedLearners,
    totalAttempts,
    passedAttempts,
    avgScore,
  });
}
