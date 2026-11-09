import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin webhooks API (LOT 9 — Automatisations).
 *
 * GET  /api/admin/automation/webhooks  — list all webhook configs.
 * POST /api/admin/automation/webhooks  — create a webhook config.
 *
 * Admin/SuperAdmin only. Every mutation is audit-logged as
 * `admin.webhook.create`.
 */

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  eventTypes: string;
  secret: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateBody {
  name?: unknown;
  url?: unknown;
  eventTypes?: unknown;
  secret?: unknown;
  isActive?: unknown;
}

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
 * GET /api/admin/automation/webhooks
 * Returns every webhook config, newest first.
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

    const webhooks = await db.webhookConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    const rows: WebhookRow[] = webhooks.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      eventTypes: w.eventTypes,
      secret: w.secret ? "***" : null,
      isActive: w.isActive,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));

    return Response.json({ webhooks: rows });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/admin/automation/webhooks
 * Body: { name, url, eventTypes, secret?, isActive? }
 *
 * Validation:
 *  - name       : non-empty string
 *  - url        : non-empty string starting with "http"
 *  - eventTypes : non-empty string (comma-separated list or "*")
 *  - secret     : optional, stored as null when blank
 *  - isActive   : optional boolean, defaults to true
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

    const body = (await req.json().catch(() => null)) as CreateBody | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Données invalides." }, { status: 400 });
    }

    const name = toStringValue(body.name);
    const url = toStringValue(body.url);
    const eventTypes = toStringValue(body.eventTypes);
    const secret = toOptionalString(body.secret);
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;

    if (!name) {
      return Response.json(
        { error: "Le nom du webhook est obligatoire." },
        { status: 400 }
      );
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      return Response.json(
        { error: "L'URL doit commencer par http:// ou https://." },
        { status: 400 }
      );
    }
    if (!eventTypes) {
      return Response.json(
        {
          error:
            "Les types d'événements sont obligatoires (utilisez * pour tous).",
        },
        { status: 400 }
      );
    }

    const webhook = await db.webhookConfig.create({
      data: {
        name,
        url,
        eventTypes,
        secret,
        isActive,
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.webhook.create",
      targetType: "WebhookConfig",
      targetId: webhook.id,
      metadata: { name, url, eventTypes, isActive },
      req,
    });

    const row: WebhookRow = {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      eventTypes: webhook.eventTypes,
      secret: webhook.secret,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    };

    return Response.json({ webhook: row }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
