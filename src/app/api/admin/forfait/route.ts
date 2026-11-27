import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/platform-settings";
import { findForfaitService } from "@/lib/forfait";
import { audit } from "@/lib/auth/audit";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/forfait
 *
 * Forfait Formation tab data: current forfait configuration
 * (default 380 000 FCFA), purchase requests (payments linked to the forfait
 * service) and aggregated stats. Admin/SuperAdmin only.
 *
 * Query: ?status=Pending|Paid|Cancelled|...
 * Response: { forfait, payments, total, stats }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const settings = await getPlatformSettings();
    const service = await findForfaitService();

    const where: Prisma.PaymentWhereInput = { serviceId: service?.id ?? "__none__" };
    if (statusParam && ["Pending", "Paid", "Failed", "Refunded", "Cancelled"].includes(statusParam)) {
      where.status = statusParam as Prisma.EnumPaymentStatusFilter["equals"];
    }

    const [payments, all] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              hasFormationAccess: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.payment.findMany({
        where: { serviceId: service?.id ?? "__none__" },
        select: { status: true, amount: true, currency: true },
      }),
    ]);

    const stats = {
      pending: all.filter((p) => p.status === "Pending").length,
      paid: all.filter((p) => p.status === "Paid").length,
      cancelled: all.filter((p) => p.status === "Cancelled").length,
      revenue: all
        .filter((p) => p.status === "Paid")
        .reduce((sum, p) => sum + (p.amount ?? 0), 0),
      currency: settings.forfait.currency,
    };

    return Response.json({
      forfait: { ...settings.forfait, serviceId: service?.id ?? null },
      payments,
      total: payments.length,
      stats,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/forfait
 *
 * Update the forfait configuration (name, description, amount, currency,
 * duration label). The linked Service record is synchronized so candidate
 * purchases always use the current price.
 *
 * Body: { name?, description?, amount?, currency?, durationLabel? }
 * Response: { forfait }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
    }

    const amount = Number(body.amount);
    if (body.amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      return Response.json({ error: "Le montant du forfait doit être un nombre positif." }, { status: 400 });
    }

    const settings = await getPlatformSettings();
    const next = await updatePlatformSettings({
      forfait: {
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : settings.forfait.name,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : settings.forfait.description,
        amount: body.amount !== undefined ? amount : settings.forfait.amount,
        currency:
          typeof body.currency === "string" && body.currency.trim()
            ? body.currency.trim().toUpperCase()
            : settings.forfait.currency,
        durationLabel:
          typeof body.durationLabel === "string" && body.durationLabel.trim()
            ? body.durationLabel.trim()
            : settings.forfait.durationLabel,
      },
    });

    // Keep the Service record in sync (candidate purchases copy amount from it).
    const service = await findForfaitService();
    if (service) {
      await db.service.update({
        where: { id: service.id },
        data: {
          name: next.forfait.name,
          description: next.forfait.description,
          price: next.forfait.amount,
          currency: next.forfait.currency,
          durationLabel: next.forfait.durationLabel,
        },
      });
    }

    await audit({
      actorId: session.user.id,
      action: "admin.forfait.update",
      targetType: "PlatformSettings",
      metadata: { forfait: next.forfait },
      req,
    });

    return Response.json({ forfait: next.forfait });
  } catch (error) {
    return authErrorResponse(error);
  }
}
