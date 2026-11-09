import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin service detail API (LOT 8 — Paiements).
 *
 * PUT    /api/admin/services/[id]  — update any subset of a service's fields.
 * DELETE /api/admin/services/[id]  — delete a service. Refused if any payment
 *                                    is linked to it (the admin should
 *                                    unpublish instead of hard-deleting).
 *
 * Next.js 16: `params: Promise<{ id: string }>`.
 *
 * Admin/SuperAdmin only. Every mutation is audit-logged as
 * `admin.service.update` / `admin.service.delete`.
 */

const ALLOWED_CATEGORIES = new Set([
  "formation",
  "accompagnement",
  "abonnement",
  "autre",
]);

type ServiceCategory =
  | "formation"
  | "accompagnement"
  | "abonnement"
  | "autre";

/** Trim a string. Non-string / empty → "". */
function toStringValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Trim a string. Non-string / empty / whitespace → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type UpdateData = {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  price?: number;
  currency?: string;
  durationLabel?: string | null;
  isPublished?: boolean;
};

/**
 * PUT /api/admin/services/[id]
 * Body: any subset of { name, description, category, price, currency,
 *                       durationLabel, isPublished }.
 *
 * Each present field is validated with the same rules as POST. Fields that
 * are absent from the body are left untouched.
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

    const existing = await db.service.findUnique({
      where: { id },
      select: { id: true, name: true, category: true, price: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Service introuvable." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Données invalides." }, { status: 400 });
    }

    const data: UpdateData = {};

    if ("name" in body) {
      const name = toStringValue(body.name);
      if (!name) {
        return Response.json(
          { error: "Le nom du service est obligatoire." },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if ("description" in body) {
      const description = toStringValue(body.description);
      if (!description) {
        return Response.json(
          { error: "La description du service est obligatoire." },
          { status: 400 }
        );
      }
      data.description = description;
    }

    if ("category" in body) {
      const categoryRaw = toStringValue(body.category);
      if (!categoryRaw || !ALLOWED_CATEGORIES.has(categoryRaw)) {
        return Response.json(
          {
            error:
              "Catégorie invalide. Valeurs autorisées : formation, accompagnement, abonnement, autre.",
          },
          { status: 400 }
        );
      }
      data.category = categoryRaw as ServiceCategory;
    }

    if ("price" in body) {
      const price =
        typeof body.price === "number" ? body.price : Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        return Response.json(
          { error: "Le prix doit être un nombre strictement positif." },
          { status: 400 }
        );
      }
      data.price = price;
    }

    if ("currency" in body) {
      const currency = toOptionalString(body.currency);
      if (!currency) {
        return Response.json(
          { error: "La devise est obligatoire." },
          { status: 400 }
        );
      }
      data.currency = currency;
    }

    if ("durationLabel" in body) {
      data.durationLabel = toOptionalString(body.durationLabel);
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

    const service = await db.service.update({
      where: { id },
      data,
    });

    await audit({
      actorId: session.user.id,
      action: "admin.service.update",
      targetType: "Service",
      targetId: id,
      metadata: {
        fields: Object.keys(data),
        previousName: existing.name,
        previousCategory: existing.category,
        previousPrice: existing.price,
      },
      req,
    });

    return Response.json({ service }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/services/[id]
 *
 * Refused with HTTP 400 if any payment is linked to the service — the admin
 * should unpublish (isPublished = false) instead of hard-deleting, so the
 * historical payment trail stays intact.
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

    const existing = await db.service.findUnique({
      where: { id },
      select: { id: true, name: true, category: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Service introuvable." },
        { status: 404 }
      );
    }

    // Refuse deletion if any payment is linked to this service — regardless
    // of the payment's status — to preserve the financial audit trail and
    // avoid breaking foreign-key integrity.
    const linkedPayments = await db.payment.count({
      where: { serviceId: id },
    });
    if (linkedPayments > 0) {
      return Response.json(
        {
          error:
            "Impossible de supprimer un service avec des paiements liés. Désactivez-le plutôt.",
        },
        { status: 400 }
      );
    }

    await db.service.delete({ where: { id } });

    await audit({
      actorId: session.user.id,
      action: "admin.service.delete",
      targetType: "Service",
      targetId: id,
      metadata: {
        name: existing.name,
        category: existing.category,
      },
      req,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
