import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * GET /api/admin/companies
 *
 * Lists companies (optionally filtered by status). Admin/SuperAdmin only.
 * Used by the minimal company-validation flow in LOT 4 (full admin back-office
 * arrives in LOT 5).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "Pending" | "Validated" | etc.

    const companies = await db.company.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        recruiters: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
          },
        },
        _count: { select: { jobOffers: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ companies });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/companies/[id]/validate  → handled in [id]/route.ts
 * This route also supports POST to validate a company by id in the body,
 * for convenience.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.companyId) {
      return Response.json({ error: "companyId requis." }, { status: 400 });
    }

    const { action } = body as { action?: "validate" | "reject" };
    const { reason } = body as { reason?: string };

    const company = await db.company.findUnique({
      where: { id: body.companyId },
      select: { id: true, status: true },
    });
    if (!company) {
      return Response.json({ error: "Entreprise introuvable." }, { status: 404 });
    }

    if (action === "reject") {
      const updated = await db.company.update({
        where: { id: company.id },
        data: { status: "Rejected", rejectionReason: reason ?? null },
      });
      await audit({
        actorId: session.user.id,
        action: "company.reject",
        targetType: "Company",
        targetId: company.id,
        metadata: { reason },
        req,
      });
      return Response.json({ company: updated });
    }

    // Default: validate
    const updated = await db.$transaction(async (tx) => {
      const c = await tx.company.update({
        where: { id: company.id },
        data: { status: "Validated", validatedAt: new Date(), validatedById: session.user.id, rejectionReason: null },
      });
      // Activate all pending recruiters of this company.
      await tx.user.updateMany({
        where: {
          recruiterProfile: { companyId: company.id },
          status: "Pending",
        },
        data: { status: "Active" },
      });
      return c;
    });

    await audit({
      actorId: session.user.id,
      action: "company.validate",
      targetType: "Company",
      targetId: company.id,
      req,
    });

    return Response.json({ company: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}
