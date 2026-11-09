import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authErrorResponse, requireSession } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/trainer/learners
 *
 * Lists all learners enrolled in the authenticated trainer's courses. Every
 * query is scoped to `course.trainerId === session.user.id`.
 *
 * Response shape:
 * {
 *   learners: Array<{
 *     id, status, progressPct, enrolledAt, completedAt,
 *     candidate: { id, firstName, lastName, email,
 *                  candidateProfile: { italianLevel } | null },
 *     course: { id, title, level }
 *   }>
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

  const learners = await db.enrollment.findMany({
    where: { course: { trainerId } },
    include: {
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          candidateProfile: {
            select: { italianLevel: true },
          },
        },
      },
      course: {
        select: { id: true, title: true, level: true },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return Response.json({ learners });
}
