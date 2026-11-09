import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRecruiterCompany } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";

/**
 * Recruiter job offers API (LOT 4 — Task 4-c).
 *
 * GET  /api/recruiter/offers  — list all of the recruiter's company offers
 *                               (excluding archived ones), with the number of
 *                               applications for each.
 * POST /api/recruiter/offers  — create a new offer (status restricted to
 *                               "Draft" or "PendingValidation" — the recruiter
 *                               cannot self-publish, this is validated by the
 *                               administration in LOT 5).
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
 * GET /api/recruiter/offers
 * Returns the recruiter's company offers (excluding archived ones).
 */
export async function GET(_req: NextRequest) {
  try {
    const { companyId } = await getRecruiterCompany();

    const offers = await db.jobOffer.findMany({
      where: {
        companyId,
        status: { not: "Archived" },
      },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ offers });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/recruiter/offers
 * Create a new offer. Recruiters may only create offers in "Draft" or
 * "PendingValidation" — they cannot self-publish.
 */
export async function POST(req: NextRequest) {
  try {
    const { companyId, userId } = await getRecruiterCompany();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const title = toStringValue(body.title);
    const description = toStringValue(body.description);
    const sector = toStringValue(body.sector);
    const city = toStringValue(body.city);

    if (!title || !description || !sector || !city) {
      return Response.json(
        {
          error:
            "Les champs intitulé, description, secteur et ville sont obligatoires.",
        },
        { status: 400 }
      );
    }

    // Status: only "Draft" or "PendingValidation" allowed on creation.
    // Default to "Draft" if missing or invalid. "Published" is rejected.
    let status: "Draft" | "PendingValidation" = "Draft";
    if (typeof body.status === "string") {
      if (body.status === "Draft" || body.status === "PendingValidation") {
        status = body.status;
      } else if (body.status === "Published") {
        return Response.json(
          {
            error:
              "La publication est validée par l'administration. Vous pouvez enregistrer un brouillon ou soumettre l'offre pour validation.",
          },
          { status: 400 }
        );
      }
    }

    const positions = toOptionalInt(body.positions) ?? 1;
    const contractType = toOptionalString(body.contractType) ?? "CDI";

    const italianLevelRaw = toOptionalString(body.italianLevel);
    const italianLevel =
      italianLevelRaw && ITALIAN_LEVELS.includes(italianLevelRaw as ItalianLevel)
        ? (italianLevelRaw as ItalianLevel)
        : null;

    const applicationDeadline = toOptionalDate(body.applicationDeadline);

    const offer = await db.jobOffer.create({
      data: {
        companyId,
        createdById: userId,
        title,
        description,
        missions: toOptionalString(body.missions),
        sector,
        city,
        region: toOptionalString(body.region),
        positions,
        contractType,
        salary: toOptionalString(body.salary),
        experienceRequired: toOptionalString(body.experienceRequired),
        italianLevel,
        qualifications: toOptionalString(body.qualifications),
        applicationDeadline,
        status,
      },
      include: {
        _count: { select: { applications: true } },
      },
    });

    await audit({
      actorId: userId,
      action: "recruiter.offer.create",
      targetType: "JobOffer",
      targetId: offer.id,
      metadata: { status, title, sector, city },
      req,
    });

    return Response.json({ offer }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
