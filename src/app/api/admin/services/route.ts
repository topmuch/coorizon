import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin service catalog API (LOT 8 — Paiements).
 *
 * GET  /api/admin/services  — list ALL services (admin only, including
 *                              unpublished).
 * POST /api/admin/services  — create a service.
 *
 * Admin/SuperAdmin only. Every mutation is audit-logged as
 * `admin.service.create`.
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

/**
 * GET /api/admin/services
 * Returns every service (published and unpublished), grouped by category
 * then newest first.
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

    const services = await db.service.findMany({
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    });

    return Response.json({ services });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/admin/services
 * Body: { name, description, category, price, currency?, durationLabel?, isPublished? }
 *
 * Validation:
 *  - name        : non-empty string
 *  - description : non-empty string
 *  - category    : one of formation | accompagnement | abonnement | autre
 *  - price       : finite number > 0
 *  - currency    : optional, defaults to "EUR"
 *  - durationLabel: optional, stored as null when blank
 *  - isPublished : optional boolean, defaults to true
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

    const name = toStringValue(body.name);
    const description = toStringValue(body.description);
    const categoryRaw = toStringValue(body.category);

    if (!name) {
      return Response.json(
        { error: "Le nom du service est obligatoire." },
        { status: 400 }
      );
    }
    if (!description) {
      return Response.json(
        { error: "La description du service est obligatoire." },
        { status: 400 }
      );
    }
    if (!categoryRaw || !ALLOWED_CATEGORIES.has(categoryRaw)) {
      return Response.json(
        {
          error:
            "Catégorie invalide. Valeurs autorisées : formation, accompagnement, abonnement, autre.",
        },
        { status: 400 }
      );
    }
    const category = categoryRaw as ServiceCategory;

    // Accept both raw numbers ("price": 49.9) and numeric strings
    // ("price": "49.9"). The number must be finite and strictly positive.
    const price =
      typeof body.price === "number" ? body.price : Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return Response.json(
        { error: "Le prix doit être un nombre strictement positif." },
        { status: 400 }
      );
    }

    const currency = toOptionalString(body.currency) ?? "EUR";
    const durationLabel = toOptionalString(body.durationLabel);
    const isPublished =
      typeof body.isPublished === "boolean" ? body.isPublished : true;

    const service = await db.service.create({
      data: {
        name,
        description,
        category,
        price,
        currency,
        durationLabel,
        isPublished,
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.service.create",
      targetType: "Service",
      targetId: service.id,
      metadata: { name, category, price, currency, isPublished },
      req,
    });

    return Response.json({ service }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
