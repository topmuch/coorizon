import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin webhook detail API (LOT 9 — Automatisations).
 *
 * PUT    /api/admin/automation/webhooks/[id]  — update a webhook.
 * DELETE /api/admin/automation/webhooks/[id]  — delete a webhook.
 *
 * Next.js 16: `params: Promise<{ id: string }>`.
 *
 * Admin/SuperAdmin only. Mutations are audit-logged as
 * `admin.webhook.update` / `admin.webhook.delete`.
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

interface UpdateBody {
  name?: unknown;
  url?: unknown;
  eventTypes?: unknown;
  secret?: unknown;
  isActive?: unknown;
}

type UpdateData = {
  name?: string;
  url?: string;
  eventTypes?: string;
  secret?: string | null;
  isActive?: boolean;
};

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

function toRow(w: {
  id: string;
  name: string;
  url: string;
  eventTypes: string;
  secret: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): WebhookRow {
  return {
    id: w.id,
    name: w.name,
    url: w.url,
    eventTypes: w.eventTypes,
    secret: w.secret,
    isActive: w.isActive,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

/**
 * PUT /api/admin/automation/webhooks/[id]
 * Body: any subset of { name, url, eventTypes, secret, isActive }.
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

    const existing = await db.webhookConfig.findUnique({
      where: { id },
      select: { id: true, name: true, url: true, eventTypes: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Webhook introuvable." },
        { status: 404 }
      );
    }

    const body = (await req.json().catch(() => null)) as UpdateBody | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Données invalides." }, { status: 400 });
    }

    const data: UpdateData = {};

    if ("name" in body) {
      const name = toStringValue(body.name);
      if (!name) {
        return Response.json(
          { error: "Le nom du webhook est obligatoire." },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if ("url" in body) {
      const url = toStringValue(body.url);
      if (!url || !/^https?:\/\//i.test(url)) {
        return Response.json(
          { error: "L'URL doit commencer par http:// ou https://." },
          { status: 400 }
        );
      }
      data.url = url;
    }

    if ("eventTypes" in body) {
      const eventTypes = toStringValue(body.eventTypes);
      if (!eventTypes) {
        return Response.json(
          {
            error:
              "Les types d'événements sont obligatoires (utilisez * pour tous).",
          },
          { status: 400 }
        );
      }
      data.eventTypes = eventTypes;
    }

    if ("secret" in body) {
      // Allow clearing the secret by sending an empty string.
      data.secret = toOptionalString(body.secret);
    }

    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") {
        return Response.json(
          { error: "Le champ « isActive » doit être un booléen." },
          { status: 400 }
        );
      }
      data.isActive = body.isActive;
    }

    const webhook = await db.webhookConfig.update({
      where: { id },
      data,
    });

    await audit({
      actorId: session.user.id,
      action: "admin.webhook.update",
      targetType: "WebhookConfig",
      targetId: id,
      metadata: {
        fields: Object.keys(data),
        previousName: existing.name,
        previousUrl: existing.url,
        previousEventTypes: existing.eventTypes,
      },
      req,
    });

    return Response.json({ webhook: toRow(webhook) }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/automation/webhooks/[id]
 * Hard-deletes the webhook. The historical events remain in the journal.
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

    const existing = await db.webhookConfig.findUnique({
      where: { id },
      select: { id: true, name: true, url: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Webhook introuvable." },
        { status: 404 }
      );
    }

    await db.webhookConfig.delete({ where: { id } });

    await audit({
      actorId: session.user.id,
      action: "admin.webhook.delete",
      targetType: "WebhookConfig",
      targetId: id,
      metadata: {
        name: existing.name,
        url: existing.url,
      },
      req,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
