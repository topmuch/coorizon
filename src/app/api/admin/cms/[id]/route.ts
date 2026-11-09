import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * CMS page detail API (admin back-office — LOT 5).
 *
 * PUT    /api/admin/cms/[id]  — update a CMS page (slug, title, content,
 *                                excerpt, isPublished). Slug changes are
 *                                validated for uniqueness.
 * DELETE /api/admin/cms/[id]  — delete a CMS page.
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
 * PUT /api/admin/cms/[id]
 * Body: { slug?, title?, content?, excerpt?, isPublished? }
 * If the slug changes, check uniqueness before updating.
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

    const existing = await db.cMSPage.findUnique({
      where: { id },
      select: { id: true, slug: true, title: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Page introuvable." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Données invalides." }, { status: 400 });
    }

    type UpdateData = {
      slug?: string;
      title?: string;
      content?: string;
      excerpt?: string | null;
      isPublished?: boolean;
    };
    const data: UpdateData = {};

    if ("slug" in body) {
      const slug = toStringValue(body.slug);
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
      // If the slug changed, check uniqueness against other pages.
      if (slug !== existing.slug) {
        const clash = await db.cMSPage.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (clash && clash.id !== id) {
          return Response.json(
            { error: `Une page avec le slug « ${slug} » existe déjà.` },
            { status: 400 }
          );
        }
      }
      data.slug = slug;
    }

    if ("title" in body) {
      const title = toStringValue(body.title);
      if (!title) {
        return Response.json(
          { error: "Le titre est obligatoire." },
          { status: 400 }
        );
      }
      data.title = title;
    }

    if ("content" in body) {
      const content = toStringValue(body.content);
      data.content = content;
    }

    if ("excerpt" in body) {
      data.excerpt = toOptionalString(body.excerpt);
    }

    if ("isPublished" in body) {
      if (typeof body.isPublished !== "boolean") {
        return Response.json(
          { error: "Le champ « isPublished » doit être un booléen." },
          { status: 400 }
        );
      }
      data.isPublished = body.isPublished;
    }

    const page = await db.cMSPage.update({
      where: { id },
      data,
    });

    await audit({
      actorId: session.user.id,
      action: "admin.cms.update",
      targetType: "CMSPage",
      targetId: id,
      metadata: {
        fields: Object.keys(data),
        previousSlug: existing.slug,
        previousTitle: existing.title,
      },
      req,
    });

    return Response.json({ page }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/cms/[id]
 * Hard-deletes the CMS page. The audit log preserves the action trail.
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

    const existing = await db.cMSPage.findUnique({
      where: { id },
      select: { id: true, slug: true, title: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Page introuvable." },
        { status: 404 }
      );
    }

    await db.cMSPage.delete({ where: { id } });

    await audit({
      actorId: session.user.id,
      action: "admin.cms.delete",
      targetType: "CMSPage",
      targetId: id,
      metadata: { slug: existing.slug, title: existing.title },
      req,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
