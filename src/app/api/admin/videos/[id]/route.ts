import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const { id } = await params;
    const video = await db.videoResource.findUnique({
      where: { id },
      include: { assignments: true, _count: { select: { views: true } } },
    });
    if (!video) return Response.json({ error: "Vidéo introuvable." }, { status: 404 });
    return Response.json({ video });
  } catch (e) { return authErrorResponse(e); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.category !== undefined) update.category = body.category;
    if (body.isPublished !== undefined) update.isPublished = body.isPublished;
    const video = await db.videoResource.update({ where: { id }, data: update });
    await audit({ actorId: session.user.id, action: "admin.video.update", targetType: "VideoResource", targetId: id, req });
    return Response.json({ video });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const { id } = await params;
    const video = await db.videoResource.findUnique({ where: { id }, select: { type: true, url: true } });
    if (!video) return Response.json({ error: "Vidéo introuvable." }, { status: 404 });
    // Delete MP4 file if applicable
    if (video.type === "mp4" && video.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), video.url);
      try { await fs.unlink(filePath); } catch {}
      // Also try to remove the directory
      try { await fs.rmdir(path.dirname(filePath)); } catch {}
    }
    await db.videoResource.delete({ where: { id } });
    await audit({ actorId: session.user.id, action: "admin.video.delete", targetType: "VideoResource", targetId: id, req });
    return Response.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
