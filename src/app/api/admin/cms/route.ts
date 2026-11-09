import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * CMS pages API (admin back-office — LOT 5).
 *
 * GET  /api/admin/cms  — list all CMS pages, newest first.
 * POST /api/admin/cms  — create a CMS page.
 *
 * Admin/SuperAdmin only.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toStringValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET /api/admin/cms
 * Returns all CMS pages ordered by updatedAt desc.
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

    const pages = await db.cMSPage.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return Response.json({ pages });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/admin/cms
 * Body: { slug, title, content, excerpt?, isPublished? }
 * Validates slug format and uniqueness, and title presence.
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Données invalides." }, { status: 400 });
    }

    const slug = toStringValue(body.slug);
    const title = toStringValue(body.title);
    const content = toStringValue(body.content);

    if (!slug) {
      return Response.json(
        { error: "Le slug est obligatoire." },
        { status: 400 }
      );
    }
    if (!SLUG_RE.test(slug)) {
      return Response.json(
        {
          error:
            "Le slug doit contenir uniquement des lettres minuscules, des chiffres et des tirets (ex. « mentions-legales »).",
        },
        { status: 400 }
      );
    }
    if (!title) {
      return Response.json(
        { error: "Le titre est obligatoire." },
        { status: 400 }
      );
    }

    // Slug uniqueness check.
    const existing = await db.cMSPage.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { error: `Une page avec le slug « ${slug} » existe déjà.` },
        { status: 400 }
      );
    }

    const isPublished =
      typeof body.isPublished === "boolean" ? body.isPublished : true;

    const page = await db.cMSPage.create({
      data: {
        slug,
        title,
        content: content || "",
        excerpt: toOptionalString(body.excerpt),
        isPublished,
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.cms.create",
      targetType: "CMSPage",
      targetId: page.id,
      metadata: { slug, title, isPublished },
      req,
    });

    return Response.json({ page }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
