import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin vidéothèque — détail d'une vidéo (COORIZON — Task "videos").
 *
 * Endpoints:
 *  - PUT    /api/admin/videos/[id]    → met à jour une vidéo (admin)
 *  - DELETE /api/admin/videos/[id]    → supprime une vidéo (admin)
 */

const VALID_TYPES = new Set(["youtube", "mp4", "vimeo"]);
const VALID_CATEGORIES = new Set([
  "formation",
  "tutoriel",
  "accueil",
  "personnalise",
  "autre",
]);

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const knownPrefixes = ["embed", "shorts", "v", "live"];
      if (parts.length >= 2 && knownPrefixes.includes(parts[0])) {
        return parts[1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 1) {
        if (parts[0] === "video" && parts[1]) return parts[1];
        if (/^\d+$/.test(parts[0])) return parts[0];
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * PUT /api/admin/videos/[id] — met à jour une vidéo.
 * Champs acceptés: title, description, url, category, isPublished.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const existing = await db.videoResource.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(
        { error: "Vidéo introuvable." },
        { status: 404 }
      );
    }

    const data: {
      title?: string;
      description?: string | null;
      url?: string;
      category?: string;
      isPublished?: boolean;
      embedId?: string | null;
      thumbnailUrl?: string | null;
    } = {};

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) {
        return Response.json(
          { error: "Le titre ne peut pas être vide." },
          { status: 400 }
        );
      }
      data.title = t;
    }
    if (body.description !== undefined) {
      data.description = body.description
        ? String(body.description).trim() || null
        : null;
    }
    if (body.category !== undefined) {
      const c = String(body.category);
      if (!VALID_CATEGORIES.has(c)) {
        return Response.json(
          { error: "Catégorie invalide." },
          { status: 400 }
        );
      }
      data.category = c;
    }
    if (body.isPublished !== undefined) {
      data.isPublished = Boolean(body.isPublished);
    }
    if (body.url !== undefined) {
      const url = String(body.url).trim();
      if (!url) {
        return Response.json(
          { error: "L'URL ne peut pas être vide." },
          { status: 400 }
        );
      }
      data.url = url;
      // Re-extract embedId + thumbnail if the URL changed for YouTube/Vimeo.
      if (existing.type === "youtube") {
        const eid = extractYouTubeId(url);
        if (!eid) {
          return Response.json(
            { error: "URL YouTube invalide." },
            { status: 400 }
          );
        }
        data.embedId = eid;
        data.thumbnailUrl = `https://img.youtube.com/vi/${eid}/hqdefault.jpg`;
      } else if (existing.type === "vimeo") {
        const eid = extractVimeoId(url);
        if (!eid) {
          return Response.json(
            { error: "URL Vimeo invalide." },
            { status: 400 }
          );
        }
        data.embedId = eid;
      }
    }
    // Optional type change is allowed only between valid types.
    if (body.type !== undefined) {
      const t = String(body.type);
      if (!VALID_TYPES.has(t)) {
        return Response.json(
          { error: "Type de vidéo invalide." },
          { status: 400 }
        );
      }
    }

    const updated = await db.videoResource.update({ where: { id }, data });
    await audit({
      actorId: session.user.id,
      action: "admin.video.update",
      targetType: "VideoResource",
      targetId: id,
      metadata: { fields: Object.keys(data) },
      req,
    });
    return Response.json({ video: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/videos/[id] — supprime une vidéo.
 * Si la vidéo est de type mp4 et stockée localement, le fichier est supprimé du disque.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }
    const { id } = await params;

    const video = await db.videoResource.findUnique({ where: { id } });
    if (!video) {
      return Response.json(
        { error: "Vidéo introuvable." },
        { status: 404 }
      );
    }

    // Delete the on-disk folder for MP4 uploads (best-effort).
    if (video.type === "mp4" && video.url.startsWith("uploads/videos/")) {
      const dir = path.join(process.cwd(), path.dirname(video.url));
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {
        // Best-effort: never block the DB delete.
      });
    }

    await db.videoResource.delete({ where: { id } });
    await audit({
      actorId: session.user.id,
      action: "admin.video.delete",
      targetType: "VideoResource",
      targetId: id,
      metadata: { title: video.title, type: video.type },
      req,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
