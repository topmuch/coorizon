import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRecruiterCompany, } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";

/**
 * Recruiter company profile API (LOT 4 — Task 4-b).
 *
 * GET  /api/recruiter/company  — returns the recruiter's own company (with
 *                                documents & co-recruiters) and their own
 *                                RecruiterProfile.
 * PUT  /api/recruiter/company  — updates the editable company fields
 *                                (status / validatedAt are admin-controlled).
 *
 * Every read/write is scoped to the authenticated recruiter's own company
 * via getRecruiterCompany().
 */

/** Editable fields a recruiter may modify on their company. */
const EDITABLE_KEYS = [
  "legalName",
  "registrationNumber",
  "taxId",
  "vatNumber",
  "address",
  "city",
  "region",
  "website",
  "sector",
  "size",
] as const;

type EditableKey = (typeof EDITABLE_KEYS)[number];

/** Trim a string field. Empty / whitespace / non-string → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET /api/recruiter/company
 * Returns the recruiter's company (with documents & recruiters) + their
 * own RecruiterProfile.
 */
export async function GET(_req: NextRequest) {
  try {
    const { companyId, userId } = await getRecruiterCompany();

    const [company, profile] = await Promise.all([
      db.company.findUnique({
        where: { id: companyId },
        include: {
          documents: { orderBy: { createdAt: "desc" } },
          recruiters: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      db.recruiterProfile.findUnique({ where: { userId } }),
    ]);

    if (!company) {
      return Response.json(
        { error: "Entreprise introuvable." },
        { status: 404 }
      );
    }

    return Response.json({ company, profile });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/recruiter/company
 * Updates editable company fields only (status & validatedAt are
 * admin-controlled). Audits the change.
 */
export async function PUT(req: NextRequest) {
  try {
    const { companyId, userId } = await getRecruiterCompany();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    // Build a clean payload of editable fields only.
    const data: Partial<Record<EditableKey, string | null>> = {};
    for (const key of EDITABLE_KEYS) {
      if (key in body) {
        data[key] = toOptionalString(body[key]);
      }
    }

    // legalName is the only required field on the Company model.
    if ("legalName" in data && !data.legalName) {
      return Response.json(
        { error: "La raison sociale est obligatoire." },
        { status: 400 }
      );
    }

    const updated = await db.company.update({
      where: { id: companyId },
      data,
      include: {
        documents: { orderBy: { createdAt: "desc" } },
        recruiters: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    await audit({
      actorId: userId,
      action: "company.profile.update",
      targetType: "Company",
      targetId: companyId,
      metadata: { fields: Object.keys(data) },
      req,
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
