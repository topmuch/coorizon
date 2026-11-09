import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin job offer detail API (LOT 5 — Task 5-c).
 *
 * GET /api/admin/offers/[id]  — fetch a single offer with its company and
 *                               the application count.
 * PUT /api/admin/offers/[id]  — update the offer's status (publish, suspend,
 *                               close, archive, send back to pending, or
 *                               revert to draft). Admin only manages status —
 *                               offer content stays the recruiter's
 *                               responsibility.
 *
 * Admin / SuperAdmin only. Every change is audit-logged as
 * `admin.offer.status` with `{ fromStatus, toStatus }`.
 */

type AdminOfferStatus =
  | "Draft"
  | "PendingValidation"
  | "Published"
  | "Suspended"
  | "Closed"
  | "Archived";

const ALLOWED_STATUSES: ReadonlySet<AdminOfferStatus> = new Set([
  "Draft",
  "PendingValidation",
  "Published",
  "Suspended",
  "Closed",
  "Archived",
]);

/** Trim a string. Empty / whitespace / non-string → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET /api/admin/offers/[id]
 * Single offer details with company + application count.
 */
export async function GET(
  _req: NextRequest,
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

    const offer = await db.jobOffer.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            city: true,
            region: true,
            sector: true,
            country: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!offer) {
      return Response.json({ error: "Offre introuvable." }, { status: 404 });
    }

    return Response.json({ offer });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/offers/[id]
 * Update the offer's status. Admin cannot edit offer content.
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
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Données invalides." }, { status: 400 });
    }

    const requestedStatus = toOptionalString(body.status);
    if (
      !requestedStatus ||
      !ALLOWED_STATUSES.has(requestedStatus as AdminOfferStatus)
    ) {
      return Response.json(
        {
          error:
            "Statut invalide. Statuts autorisés : Draft, PendingValidation, Published, Suspended, Closed, Archived.",
        },
        { status: 400 }
      );
    }

    const newStatus = requestedStatus as AdminOfferStatus;

    const existing = await db.jobOffer.findUnique({
      where: { id },
      select: { id: true, status: true, title: true },
    });
    if (!existing) {
      return Response.json({ error: "Offre introuvable." }, { status: 404 });
    }

    const fromStatus = existing.status;

    // Business rule: from a Draft, the admin can either publish directly or
    // send back to PendingValidation. Other transitions are unrestricted.
    // (No 400 is raised — we trust the admin and just apply the change.)

    const offer = await db.jobOffer.update({
      where: { id },
      data: { status: newStatus },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            city: true,
            region: true,
            sector: true,
            country: true,
            status: true,
          },
        },
        _count: { select: { applications: true } },
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.offer.status",
      targetType: "JobOffer",
      targetId: id,
      metadata: {
        fromStatus,
        toStatus: newStatus,
        title: existing.title,
      },
      req,
    });

    return Response.json({ offer }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
