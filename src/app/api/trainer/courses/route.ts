import { NextRequest } from "next/server";
import { CourseLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse, requireSession } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Trainer courses API (LOT 6 — Task 6-d).
 *
 * GET  /api/trainer/courses  — list the trainer's courses with module, learner
 *                              and exercise counts.
 * POST /api/trainer/courses  — create a new course owned by the trainer.
 *
 * Every read/write is scoped to `session.user.id`. A trainer can only manage
 * courses for which `trainerId === session.user.id`.
 */

const COURSE_LEVELS: ReadonlyArray<CourseLevel> = [
  CourseLevel.A1,
  CourseLevel.A2,
  CourseLevel.B1,
  CourseLevel.B2,
  CourseLevel.C1,
  CourseLevel.C2,
];

/** Trim a string. Empty / whitespace / non-string → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Trim a string. Returns "" if missing/non-string. */
function toStringValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Coerce a number field. Returns null if missing/invalid. */
function toOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.floor(n));
}

/**
 * GET /api/trainer/courses
 * Returns the trainer's courses with module/enrollment/exercise counts.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Trainer) {
      return Response.json(
        { error: "Réservé aux formateurs." },
        { status: 403 }
      );
    }

    const trainerId = session.user.id;

    const courses = await db.trainingCourse.findMany({
      where: { trainerId },
      include: {
        _count: {
          select: { modules: true, enrollments: true, exercises: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ courses });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/trainer/courses
 * Create a new course owned by the authenticated trainer.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Trainer) {
      return Response.json(
        { error: "Réservé aux formateurs." },
        { status: 403 }
      );
    }

    const trainerId = session.user.id;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const title = toStringValue(body.title);
    const description = toStringValue(body.description);
    const levelRaw = toStringValue(body.level);

    if (!title) {
      return Response.json(
        { error: "Le titre de la formation est obligatoire." },
        { status: 400 }
      );
    }
    if (!description) {
      return Response.json(
        { error: "La description est obligatoire." },
        { status: 400 }
      );
    }
    if (!levelRaw || !COURSE_LEVELS.includes(levelRaw as CourseLevel)) {
      return Response.json(
        { error: "Le niveau (A1 à C2) est obligatoire." },
        { status: 400 }
      );
    }

    const level = levelRaw as CourseLevel;
    const subtitle = toOptionalString(body.subtitle);
    const durationHours = toOptionalInt(body.durationHours);
    const isPublished =
      typeof body.isPublished === "boolean" ? body.isPublished : false;

    const course = await db.trainingCourse.create({
      data: {
        title,
        subtitle,
        description,
        level,
        durationHours,
        isPublished,
        trainerId,
      },
      include: {
        _count: {
          select: { modules: true, enrollments: true, exercises: true },
        },
      },
    });

    await audit({
      actorId: trainerId,
      action: "trainer.course.create",
      targetType: "TrainingCourse",
      targetId: course.id,
      metadata: { title, level, isPublished },
      req,
    });

    return Response.json({ course }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
