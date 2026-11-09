import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin vidéothèque — API (COORIZON — Task "videos").
 *
 * Endpoints:
 *  - GET    /api/admin/videos          → liste toutes les vidéos (admin)
 *  - POST   /api/admin/videos          → crée une vidéo (JSON ou multipart MP4)
 */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "videos");

const VALID_TYPES = new Set(["youtube", "mp4", "vimeo"]);
const VALID_CATEGORIES = new Set([
  "formation",
  "tutoriel",
  "accueil",
  "personnalise",
  "autre",
]);

const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const MAX_SIZE = 500 * 1024 * 1024; // 500 Mo

/**
 * Extrait l'identifiant d'une vidéo YouTube.
 * Accepte `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`,
 * `youtube.com/shorts/ID` et les URLs avec params supplémentaires.
 */
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

/**
 * Extrait l'identifiant d'une vidéo Vimeo.
 * Accepte `vimeo.com/ID`, `player.vimeo.com/video/ID`.
 */
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

function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[/\\]+/g, "_")
    .replace(/^[\s.]+/, "")
    .trim();
  return cleaned || "video.mp4";
}

/**
 * GET /api/admin/videos — liste toutes les vidéos (admin).
 * Inclut le nombre de vues et d'assignations.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }
    const videos = await db.videoResource.findMany({
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: { select: { views: true, assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ videos });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/admin/videos — crée une vidéo.
 *
 * Accepte deux formats:
 *  - application/json:        { title, description?, type, url, category, isPublished? }
 *  - multipart/form-data:     file + title + description + category (+ isPublished)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") ?? "";

    // ─── Multipart: MP4 upload ──────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch {
        return Response.json(
          { error: "Données de formulaire invalides." },
          { status: 400 }
        );
      }

      const title = (formData.get("title") as string | null)?.trim() ?? "";
      const description =
        (formData.get("description") as string | null)?.trim() || null;
      const category = (formData.get("category") as string | null) ?? "";
      const isPublishedRaw = formData.get("isPublished");
      const isPublished =
        isPublishedRaw === null || isPublishedRaw === undefined
          ? true
          : String(isPublishedRaw) === "true" || isPublishedRaw === "1";

      if (!title) {
        return Response.json(
          { error: "Le titre est requis." },
          { status: 400 }
        );
      }
      if (!VALID_CATEGORIES.has(category)) {
        return Response.json(
          { error: "Catégorie invalide." },
          { status: 400 }
        );
      }

      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return Response.json(
          { error: "Aucun fichier reçu." },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return Response.json(
          { error: "Format vidéo non supporté. Utilisez MP4, WebM ou OGG." },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return Response.json(
          { error: "La vidéo dépasse 500 Mo." },
          { status: 400 }
        );
      }

      // 1) Create the record first (so we have a stable videoId folder).
      const video = await db.videoResource.create({
        data: {
          title,
          description,
          type: "mp4",
          url: "",
          embedId: null,
          category,
          isPublished,
          uploadedById: session.user.id,
        },
      });

      // 2) Save the file to disk.
      const fileName = sanitizeFileName(file.name);
      const dir = path.join(UPLOAD_ROOT, video.id);
      try {
        await fs.mkdir(dir, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(dir, fileName), buffer);
      } catch {
        await db.videoResource.delete({ where: { id: video.id } }).catch(() => {});
        return Response.json(
          { error: "Échec de l'enregistrement du fichier vidéo." },
          { status: 500 }
        );
      }

      const filePath = `uploads/videos/${video.id}/${fileName}`;
      const updated = await db.videoResource.update({
        where: { id: video.id },
        data: { url: filePath },
      });

      await audit({
        actorId: session.user.id,
        action: "admin.video.create",
        targetType: "VideoResource",
        targetId: video.id,
        metadata: { title, type: "mp4", category, fileName, sizeBytes: file.size },
        req,
      });

      return Response.json({ video: updated }, { status: 201 });
    }

    // ─── JSON: YouTube / Vimeo / external MP4 ─────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const title: string = (body.title ?? "").toString().trim();
    const description: string | null = body.description
      ? String(body.description).trim() || null
      : null;
    const type: string = (body.type ?? "").toString();
    const url: string = (body.url ?? "").toString().trim();
    const category: string = (body.category ?? "").toString();
    const isPublished: boolean =
      body.isPublished === undefined ? true : Boolean(body.isPublished);

    if (!title) {
      return Response.json(
        { error: "Le titre est requis." },
        { status: 400 }
      );
    }
    if (!url) {
      return Response.json(
        { error: "L'URL est requise." },
        { status: 400 }
      );
    }
    if (!VALID_TYPES.has(type)) {
      return Response.json(
        { error: "Type de vidéo invalide." },
        { status: 400 }
      );
    }
    if (!VALID_CATEGORIES.has(category)) {
      return Response.json(
        { error: "Catégorie invalide." },
        { status: 400 }
      );
    }

    let embedId: string | null = null;
    let thumbnailUrl: string | null = null;
    let finalType = type;

    if (type === "youtube") {
      embedId = extractYouTubeId(url);
      if (!embedId) {
        return Response.json(
          { error: "URL YouTube invalide." },
          { status: 400 }
        );
      }
      thumbnailUrl = `https://img.youtube.com/vi/${embedId}/hqdefault.jpg`;
    } else if (type === "vimeo") {
      embedId = extractVimeoId(url);
      if (!embedId) {
        return Response.json(
          { error: "URL Vimeo invalide." },
          { status: 400 }
        );
      }
    } else if (type === "mp4") {
      finalType = "mp4";
    }

    const video = await db.videoResource.create({
      data: {
        title,
        description,
        type: finalType,
        url,
        embedId,
        thumbnailUrl,
        category,
        isPublished,
        uploadedById: session.user.id,
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.video.create",
      targetType: "VideoResource",
      targetId: video.id,
      metadata: { title, type: finalType, category, url },
      req,
    });

    return Response.json({ video }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
