import { NextRequest } from "next/server";
import { CourseLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse, requireSession } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Trainer course detail API (LOT 6 — Task 6-d).
 *
 * GET    /api/trainer/courses/[id]  — fetch a single course with its modules,
 *                                     lessons and exercises. Ownership check
 *                                     (trainerId === session.user.id).
 * PUT    /api/trainer/courses/[id]  — update editable course fields. Ownership
 *                                     check. audit.
 * DELETE /api/trainer/courses/[id]  — hard delete (cascade). Ownership check.
 *                                     audit.
 *
 * Next.js 16: `params` is a Promise.
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
 * GET /api/trainer/courses/[id]
 * Fetch a single course with modules (ordered) + lessons (ordered) +
 * exercises. Verifies trainer ownership.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Trainer) {
      return Response.json(
        { error: "Réservé aux formateurs." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const course = await db.trainingCourse.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
            },
          },
        },
        exercises: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course) {
      return Response.json(
        { error: "Formation introuvable." },
        { status: 404 }
      );
    }

    if (course.trainerId !== session.user.id) {
      return Response.json(
        {
          error:
            "Accès refusé. Cette formation ne vous appartient pas.",
        },
        { status: 403 }
      );
    }

    return Response.json({ course });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/trainer/courses/[id]
 * Update editable course fields. Ownership check. audit.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Trainer) {
      return Response.json(
        { error: "Réservé aux formateurs." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.trainingCourse.findUnique({
      where: { id },
      select: { id: true, trainerId: true, title: true, isPublished: true },
    });

    if (!existing) {
      return Response.json(
        { error: "Formation introuvable." },
        { status: 404 }
      );
    }

    if (existing.trainerId !== session.user.id) {
      return Response.json(
        {
          error:
            "Accès refusé. Cette formation ne vous appartient pas.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    type CourseUpdateData = {
      title?: string;
      subtitle?: string | null;
      description?: string;
      level?: CourseLevel;
      durationHours?: number | null;
      isPublished?: boolean;
    };

    const data: CourseUpdateData = {};

    if ("title" in body) {
      const title = toStringValue(body.title);
      if (!title) {
        return Response.json(
          { error: "Le titre de la formation est obligatoire." },
          { status: 400 }
        );
      }
      data.title = title;
    }

    if ("subtitle" in body) {
      data.subtitle = toOptionalString(body.subtitle);
    }

    if ("description" in body) {
      const description = toStringValue(body.description);
      if (!description) {
        return Response.json(
          { error: "La description est obligatoire." },
          { status: 400 }
        );
      }
      data.description = description;
    }

    if ("level" in body) {
      const levelRaw = toStringValue(body.level);
      if (!levelRaw || !COURSE_LEVELS.includes(levelRaw as CourseLevel)) {
        return Response.json(
          { error: "Niveau invalide (A1 à C2)." },
          { status: 400 }
        );
      }
      data.level = levelRaw as CourseLevel;
    }

    if ("durationHours" in body) {
      data.durationHours = toOptionalInt(body.durationHours);
    }

    if ("isPublished" in body) {
      if (typeof body.isPublished !== "boolean") {
        return Response.json(
          { error: "Le champ « publiée » doit être un booléen." },
          { status: 400 }
        );
      }
      data.isPublished = body.isPublished;
    }

    const course = await db.trainingCourse.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { modules: true, enrollments: true, exercises: true },
        },
      },
    });

    await audit({
      actorId: session.user.id,
      action: "trainer.course.update",
      targetType: "TrainingCourse",
      targetId: id,
      metadata: {
        fields: Object.keys(data),
        previousPublished: existing.isPublished,
        newPublished:
          typeof data.isPublished === "boolean"
            ? data.isPublished
            : undefined,
      },
      req,
    });

    return Response.json({ course });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/trainer/courses/[id]
 * Hard delete the course. Prisma cascades modules → lessons → resources and
 * exercises → questions, plus enrollments and exam attempts. Ownership check.
 * audit.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Trainer) {
      return Response.json(
        { error: "Réservé aux formateurs." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.trainingCourse.findUnique({
      where: { id },
      select: {
        id: true,
        trainerId: true,
        title: true,
        _count: { select: { enrollments: true, modules: true } },
      },
    });

    if (!existing) {
      return Response.json(
        { error: "Formation introuvable." },
        { status: 404 }
      );
    }

    if (existing.trainerId !== session.user.id) {
      return Response.json(
        {
          error:
            "Accès refusé. Cette formation ne vous appartient pas.",
        },
        { status: 403 }
      );
    }

    await db.trainingCourse.delete({ where: { id } });

    await audit({
      actorId: session.user.id,
      action: "trainer.course.delete",
      targetType: "TrainingCourse",
      targetId: id,
      metadata: {
        title: existing.title,
        enrollmentsCount: existing._count.enrollments,
        modulesCount: existing._count.modules,
      },
      req,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
