import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * GET /api/admin/training — list all training courses (admin).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }
    const courses = await db.trainingCourse.findMany({
      include: {
        trainer: { select: { firstName: true, lastName: true } },
        _count: { select: { modules: true, enrollments: true, exercises: true } },
      },
      orderBy: [{ level: "asc" }, { createdAt: "desc" }],
    });
    return Response.json({ courses });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/admin/training — create a new training course (admin).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Données invalides." }, { status: 400 });

    const { title, subtitle, description, level, durationHours, isPublished } = body;
    if (!title?.trim() || !description?.trim()) {
      return Response.json({ error: "Le titre et la description sont requis." }, { status: 400 });
    }
    const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    if (!validLevels.includes(level)) {
      return Response.json({ error: "Niveau invalide." }, { status: 400 });
    }

    const course = await db.trainingCourse.create({
      data: {
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        description: description.trim(),
        level,
        durationHours: durationHours ? parseInt(durationHours) : null,
        isPublished: isPublished ?? false,
      },
    });

    await audit({ actorId: session.user.id, action: "admin.training.create", targetType: "TrainingCourse", targetId: course.id, req });
    return Response.json({ course }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
