import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const { id } = await params;
    const assignments = await db.videoAssignment.findMany({ where: { videoId: id }, orderBy: { createdAt: "desc" } });
    return Response.json({ assignments });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const { targetType, targetId } = body as { targetType?: string; targetId?: string };
    if (!targetType || !["candidate", "course", "level", "all"].includes(targetType))
      return Response.json({ error: "Type de cible invalide." }, { status: 400 });
    const tid = targetType === "all" ? null : (targetId || null);
    try {
      const assignment = await db.videoAssignment.create({ data: { videoId: id, targetType, targetId: tid, assignedById: session.user.id } });
      await audit({ actorId: session.user.id, action: "admin.video.assign", targetType: "VideoAssignment", targetId: assignment.id, metadata: { videoId: id, assignType: targetType, targetId: tid }, req });
      return Response.json({ assignment }, { status: 201 });
    } catch {
      return Response.json({ error: "Cette assignation existe déjà." }, { status: 409 });
    }
  } catch (e) { return authErrorResponse(e); }
}
