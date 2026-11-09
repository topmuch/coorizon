import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Données invalides." }, { status: 400 });

    const { title, subtitle, description, level, durationHours, isPublished } = body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (subtitle !== undefined) data.subtitle = subtitle?.trim() || null;
    if (description !== undefined) data.description = description.trim();
    if (level !== undefined) {
      const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
      if (!validLevels.includes(level)) return Response.json({ error: "Niveau invalide." }, { status: 400 });
      data.level = level;
    }
    if (durationHours !== undefined) data.durationHours = durationHours ? parseInt(durationHours) : null;
    if (isPublished !== undefined) data.isPublished = isPublished;

    const course = await db.trainingCourse.update({ where: { id }, data });
    await audit({ actorId: session.user.id, action: "admin.training.update", targetType: "TrainingCourse", targetId: id, req });
    return Response.json({ course });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }
    const { id } = await params;
    await db.trainingCourse.delete({ where: { id } });
    await audit({ actorId: session.user.id, action: "admin.training.delete", targetType: "TrainingCourse", targetId: id, req });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
