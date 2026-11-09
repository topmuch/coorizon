import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";
import { notify } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true } };
    service: { select: { id: true; name: true; category: true; price: true; currency: true } };
  };
}>;

/**
 * GET /api/admin/payments/[id]
 *
 * Fetch a single payment with full related details (user, service).
 * Admin/SuperAdmin only.
 *
 * Response: { payment }
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const payment = (await db.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        service: {
          select: { id: true, name: true, category: true, price: true, currency: true },
        },
      },
    })) as PaymentWithRelations | null;

    if (!payment) {
      return Response.json(
        { error: "Paiement introuvable." },
        { status: 404 }
      );
    }

    return Response.json({ payment });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface RefundBody {
  refundReason?: unknown;
}

/**
 * PUT /api/admin/payments/[id]
 *
 * Refund a paid payment. Sets status to "Refunded", records the refund reason
 * and timestamp, notifies the user, and writes an audit entry.
 * Admin/SuperAdmin only.
 *
 * Body: { refundReason: string (required) }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { id } = await params;

    let body: RefundBody;
    try {
      body = (await req.json()) as RefundBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const refundReason =
      typeof body.refundReason === "string" ? body.refundReason.trim() : "";

    if (refundReason.length === 0) {
      return Response.json(
        { error: "Le motif du remboursement est obligatoire." },
        { status: 400 }
      );
    }

    const existing = (await db.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        service: { select: { id: true, name: true, category: true } },
      },
    })) as PaymentWithRelations | null;

    if (!existing) {
      return Response.json(
        { error: "Paiement introuvable." },
        { status: 404 }
      );
    }

    if (existing.status !== PaymentStatus.Paid) {
      return Response.json(
        { error: "Seuls les paiements payés peuvent être remboursés." },
        { status: 400 }
      );
    }

    const updated = (await db.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.Refunded,
        refundedAt: new Date(),
        refundReason,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        service: { select: { id: true, name: true, category: true } },
      },
    })) as PaymentWithRelations;

    // Notify the user that their payment has been refunded.
    const formattedAmount = updated.amount.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    await notify({
      userId: updated.userId,
      type: "Warning",
      title: "Paiement remboursé",
      message: `Votre paiement de ${formattedAmount} € pour "${updated.description}" a été remboursé. Motif: ${refundReason}.`,
      link: "dashboard?section=payments",
    });

    await audit({
      actorId: session.user.id,
      action: "admin.payment.refund",
      targetType: "Payment",
      targetId: id,
      metadata: { refundReason },
      req,
    });

    return Response.json({ payment: updated }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
