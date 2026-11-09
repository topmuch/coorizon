import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const videos = await db.videoResource.findMany({
      include: { _count: { select: { assignments: true, views: true } }, uploadedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ videos });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });

    const contentType = req.headers.get("content-type") || "";
    let title: string, description: string, type: string, url: string, category: string, duration: number | null;
    let embedId: string | null = null;
    let thumbnailUrl: string | null = null;
    let videoId = crypto.randomUUID();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string)?.trim();
      description = (formData.get("description") as string)?.trim() || "";
      type = (formData.get("type") as string) || "mp4";
      category = (formData.get("category") as string) || "formation";
      duration = formData.get("duration") ? Number(formData.get("duration")) : null;
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "Fichier vidéo requis." }, { status: 400 });
      // Validate file type
      if (!file.type.startsWith("video/")) return Response.json({ error: "Le fichier doit être une vidéo." }, { status: 400 });
      if (file.size > 500 * 1024 * 1024) return Response.json({ error: "La vidéo ne doit pas dépasser 500 Mo." }, { status: 400 });
      const dir = path.join(process.cwd(), "uploads", "videos", videoId);
      await fs.mkdir(dir, { recursive: true });
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(dir, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      url = `/uploads/videos/${videoId}/${safeName}`;
    } else {
      const body = await req.json();
      title = body.title?.trim();
      description = body.description?.trim() || "";
      type = body.type || "youtube";
      url = body.url?.trim();
      category = body.category || "formation";
      duration = body.duration || null;
    }

    if (!title) return Response.json({ error: "Le titre est requis." }, { status: 400 });
    if (!url) return Response.json({ error: "L'URL est requise." }, { status: 400 });

    if (type === "youtube") { embedId = extractYouTubeId(url); if (embedId) thumbnailUrl = `https://img.youtube.com/vi/${embedId}/mqdefault.jpg`; }
    else if (type === "vimeo") { embedId = extractVimeoId(url); }

    const video = await db.videoResource.create({
      data: { id: videoId, title, description, type, url, embedId, duration, category, thumbnailUrl, uploadedById: session.user.id, isPublished: true },
    });
    await audit({ actorId: session.user.id, action: "admin.video.create", targetType: "VideoResource", targetId: video.id, req });
    return Response.json({ video }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && (e as any).code === "UNAUTHORIZED") return authErrorResponse(e);
    return Response.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
