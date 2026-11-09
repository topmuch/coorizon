import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin company detail API (LOT 5 — Task 5-c).
 *
 * GET /api/admin/companies/[id]  — fetch a single company with its documents,
 *                                  recruiters (with user info), and aggregated
 *                                  counts of job offers and applications.
 * PUT /api/admin/companies/[id]  — update the company's status (validate,
 *                                  suspend, reject, or send back to pending).
 *                                  Cascading recruiter updates run inside a
 *                                  transaction so they always stay consistent
 *                                  with the company status.
 *
 * Admin / SuperAdmin only. Every change is audit-logged as
 * `admin.company.status`.
 */

type AdminCompanyStatus = "Pending" | "Validated" | "Suspended" | "Rejected";

const ALLOWED_STATUSES: ReadonlySet<AdminCompanyStatus> = new Set([
  "Pending",
  "Validated",
  "Suspended",
  "Rejected",
]);

/** Trim a string. Empty / whitespace / non-string → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET /api/admin/companies/[id]
 * Full company detail (documents, recruiters, counts).
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

    const [company, applicationsCount] = await Promise.all([
      db.company.findUnique({
        where: { id },
        include: {
          documents: {
            orderBy: { createdAt: "desc" },
          },
          recruiters: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  status: true,
                  isActive: true,
                  lastLoginAt: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { jobOffers: true } },
        },
      }),
      db.application.count({
        where: { jobOffer: { companyId: id } },
      }),
    ]);

    if (!company) {
      return Response.json(
        { error: "Entreprise introuvable." },
        { status: 404 }
      );
    }

    return Response.json({ company, applicationsCount });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/companies/[id]
 * Update the company's status. Cascading recruiter updates run inside a
 * transaction so the company record and its recruiters always stay consistent.
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
      !ALLOWED_STATUSES.has(requestedStatus as AdminCompanyStatus)
    ) {
      return Response.json(
        {
          error:
            "Statut invalide. Statuts autorisés : Pending, Validated, Suspended, Rejected.",
        },
        { status: 400 }
      );
    }

    const newStatus = requestedStatus as AdminCompanyStatus;
    const reason = toOptionalString(body.reason);

    const existing = await db.company.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Entreprise introuvable." },
        { status: 404 }
      );
    }

    const now = new Date();

    const updated = await db.$transaction(async (tx) => {
      // Build the company update payload according to the target status.
      const companyData: {
        status: AdminCompanyStatus;
        validatedAt?: Date | null;
        validatedById?: string | null;
        rejectionReason?: string | null;
      } = { status: newStatus };

      if (newStatus === "Validated") {
        companyData.validatedAt = now;
        companyData.validatedById = session.user.id;
        companyData.rejectionReason = null;
      } else if (newStatus === "Rejected") {
        companyData.rejectionReason = reason;
      } else if (newStatus === "Pending") {
        // Sending back to pending clears any rejection reason. The previous
        // validation stamp is intentionally left untouched: the admin is
        // re-queuing the company for review, not resetting its history.
        companyData.rejectionReason = null;
      }

      const company = await tx.company.update({
        where: { id },
        data: companyData,
      });

      // Cascade recruiter updates per business rules.
      if (newStatus === "Validated") {
        // Activate all Pending recruiters of this company.
        await tx.user.updateMany({
          where: {
            recruiterProfile: { companyId: id },
            status: "Pending",
          },
          data: { status: "Active", isActive: true },
        });
      } else if (newStatus === "Suspended") {
        // Suspend all recruiters of this company.
        await tx.user.updateMany({
          where: {
            recruiterProfile: { companyId: id },
          },
          data: { status: "Suspended", isActive: false },
        });
      }
      // For "Rejected" and "Pending", recruiters are left untouched — their
      // existing statuses already reflect their own lifecycle and the admin
      // can manage them individually from the users back-office.

      return company;
    });

    await audit({
      actorId: session.user.id,
      action: "admin.company.status",
      targetType: "Company",
      targetId: id,
      metadata: {
        fromStatus: existing.status,
        toStatus: newStatus,
        reason,
      },
      req,
    });

    // Re-fetch the full record (with relations) so the client can refresh
    // its detail view without a second round-trip.
    const refreshed = await db.company.findUnique({
      where: { id },
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
                status: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { jobOffers: true } },
      },
    });

    return Response.json({ company: refreshed ?? updated }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
