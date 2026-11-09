import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRecruiterCompany } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";

/**
 * Recruiter job offer detail API (LOT 4 — Task 4-c).
 *
 * GET    /api/recruiter/offers/[id]  — fetch a single offer (must belong to
 *                                      the recruiter's company).
 * PUT    /api/recruiter/offers/[id]  — update editable fields and/or status.
 *                                      Recruiter may set status to "Draft",
 *                                      "PendingValidation", "Suspended" or
 *                                      "Closed" only. Self-publishing is
 *                                      rejected (admin-controlled in LOT 5).
 * DELETE /api/recruiter/offers/[id]  — archive the offer (soft delete). Safer
 *                                      than a hard delete when applications
 *                                      already exist.
 *
 * Every read/write is scoped to the authenticated recruiter's own company via
 * getRecruiterCompany().
 */

type ItalianLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const ITALIAN_LEVELS: ReadonlyArray<ItalianLevel> = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

/** Statuses a recruiter is allowed to set directly. */
const RECRUITER_ALLOWED_STATUSES = new Set([
  "Draft",
  "PendingValidation",
  "Suspended",
  "Closed",
]);

/** Trim a string. Empty / whitespace / non-string → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Trim a string. Returns "" if missing/non-string. */
function toStringValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Coerce a number field. Returns null if missing/invalid. */
function toOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.floor(n));
}

/** Coerce an ISO date string to a Date. Returns null if missing/invalid. */
function toOptionalDate(value: unknown): Date | null {
  const str = toStringValue(value);
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * GET /api/recruiter/offers/[id]
 * Fetch a single offer, scoped to the recruiter's company.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { companyId } = await getRecruiterCompany();
    const { id } = await params;

    const offer = await db.jobOffer.findUnique({
      where: { id },
      include: {
        _count: { select: { applications: true } },
      },
    });

    if (!offer) {
      return Response.json(
        { error: "Offre introuvable." },
        { status: 404 }
      );
    }

    if (offer.companyId !== companyId) {
      return Response.json(
        { error: "Accès refusé. Cette offre n'appartient pas à votre entreprise." },
        { status: 403 }
      );
    }

    return Response.json({ offer });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/recruiter/offers/[id]
 * Update editable fields and/or status. Self-publishing is rejected.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { companyId, userId } = await getRecruiterCompany();
    const { id } = await params;

    const existing = await db.jobOffer.findUnique({
      where: { id },
      select: { id: true, companyId: true, status: true },
    });

    if (!existing) {
      return Response.json(
        { error: "Offre introuvable." },
        { status: 404 }
      );
    }

    if (existing.companyId !== companyId) {
      return Response.json(
        { error: "Accès refusé. Cette offre n'appartient pas à votre entreprise." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    type RecruiterOfferStatus = "Draft" | "PendingValidation" | "Suspended" | "Closed";

    // Build the editable payload — only known JobOffer fields are allowed.
    const data: {
      title?: string;
      description?: string;
      missions?: string | null;
      sector?: string;
      city?: string;
      region?: string | null;
      positions?: number;
      contractType?: string;
      salary?: string | null;
      experienceRequired?: string | null;
      italianLevel?: ItalianLevel | null;
      qualifications?: string | null;
      applicationDeadline?: Date | null;
      status?: RecruiterOfferStatus;
    } = {};

    if ("title" in body) {
      const title = toStringValue(body.title);
      if (!title) {
        return Response.json(
          { error: "L'intitulé du poste est obligatoire." },
          { status: 400 }
        );
      }
      data.title = title;
    }

    if ("description" in body) {
      const description = toStringValue(body.description);
      if (!description) {
        return Response.json(
          { error: "La description est obligatoire." },
          { status: 400 }
        );
      }
      data.description = description;
    }

    if ("missions" in body) data.missions = toOptionalString(body.missions);

    if ("sector" in body) {
      const sector = toStringValue(body.sector);
      if (!sector) {
        return Response.json(
          { error: "Le secteur est obligatoire." },
          { status: 400 }
        );
      }
      data.sector = sector;
    }

    if ("city" in body) {
      const city = toStringValue(body.city);
      if (!city) {
        return Response.json(
          { error: "La ville est obligatoire." },
          { status: 400 }
        );
      }
      data.city = city;
    }

    if ("region" in body) data.region = toOptionalString(body.region);
    if ("positions" in body) {
      const positions = toOptionalInt(body.positions);
      if (positions !== null) data.positions = positions;
    }
    if ("contractType" in body) {
      data.contractType = toOptionalString(body.contractType) ?? "CDI";
    }
    if ("salary" in body) data.salary = toOptionalString(body.salary);
    if ("experienceRequired" in body) {
      data.experienceRequired = toOptionalString(body.experienceRequired);
    }
    if ("italianLevel" in body) {
      const italianLevelRaw = toOptionalString(body.italianLevel);
      data.italianLevel =
        italianLevelRaw &&
        ITALIAN_LEVELS.includes(italianLevelRaw as ItalianLevel)
          ? (italianLevelRaw as ItalianLevel)
          : null;
    }
    if ("qualifications" in body) {
      data.qualifications = toOptionalString(body.qualifications);
    }
    if ("applicationDeadline" in body) {
      data.applicationDeadline = toOptionalDate(body.applicationDeadline);
    }

    // Status change handling.
    if ("status" in body) {
      const requestedStatus = toStringValue(body.status);

      if (requestedStatus === "Published") {
        return Response.json(
          {
            error:
              "La publication est validée par l'administration. Vous pouvez soumettre l'offre pour validation ou la suspendre.",
          },
          { status: 400 }
        );
      }

      if (requestedStatus === "Archived") {
        return Response.json(
          { error: "L'archivage s'effectue via la suppression de l'offre." },
          { status: 400 }
        );
      }

      if (!RECRUITER_ALLOWED_STATUSES.has(requestedStatus)) {
        return Response.json(
          { error: "Statut invalide." },
          { status: 400 }
        );
      }

      data.status = requestedStatus as RecruiterOfferStatus;
    }

    const offer = await db.jobOffer.update({
      where: { id },
      data,
      include: {
        _count: { select: { applications: true } },
      },
    });

    await audit({
      actorId: userId,
      action: "recruiter.offer.update",
      targetType: "JobOffer",
      targetId: id,
      metadata: {
        fields: Object.keys(data),
        previousStatus: existing.status,
        newStatus: typeof data.status === "string" ? data.status : undefined,
      },
      req,
    });

    return Response.json({ offer }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/recruiter/offers/[id]
 * Archive the offer (soft delete). Safer than a hard delete when the offer
 * already has applications — preserves the audit trail.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { companyId, userId } = await getRecruiterCompany();
    const { id } = await params;

    const existing = await db.jobOffer.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        title: true,
        status: true,
        _count: { select: { applications: true } },
      },
    });

    if (!existing) {
      return Response.json(
        { error: "Offre introuvable." },
        { status: 404 }
      );
    }

    if (existing.companyId !== companyId) {
      return Response.json(
        { error: "Accès refusé. Cette offre n'appartient pas à votre entreprise." },
        { status: 403 }
      );
    }

    const offer = await db.jobOffer.update({
      where: { id },
      data: { status: "Archived" },
    });

    await audit({
      actorId: userId,
      action: "recruiter.offer.archive",
      targetType: "JobOffer",
      targetId: id,
      metadata: {
        title: existing.title,
        previousStatus: existing.status,
        applicationsCount: existing._count.applications,
      },
      req,
    });

    return Response.json({ offer }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
