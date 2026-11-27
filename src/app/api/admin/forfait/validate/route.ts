import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { findForfaitService, generateInvoiceNumber } from "@/lib/forfait";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/auth/audit";

/**
 * POST /api/admin/forfait/validate
 *
 * Validate or reject a forfait purchase request (a Pending payment linked to
 * the forfait service). Validation marks the payment as Paid and grants the
 * candidate full platform access (hasFormationAccess). Rejection cancels it.
 *
 * Body: { paymentId, action: "validate" | "reject", reason? }
 * Response: { payment }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const paymentId = String(body?.paymentId ?? "");
    const action = String(body?.action ?? "");
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!paymentId) {
      return Response.json({ error: "L'identifiant du paiement est requis." }, { status: 400 });
    }
    if (action !== "validate" && action !== "reject") {
      return Response.json({ error: "Action invalide (validate ou reject)." }, { status: 400 });
    }

    const service = await findForfaitService();
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!payment) {
      return Response.json({ error: "Paiement introuvable." }, { status: 404 });
    }
    if (!service || payment.serviceId !== service.id) {
      return Response.json(
        { error: "Ce paiement n'est pas une demande de forfait formation." },
        { status: 400 }
      );
    }
    if (payment.status !== "Pending") {
      return Response.json(
        { error: "Cette demande a déjà été traitée (statut actuel : " + payment.status + ")." },
        { status: 400 }
      );
    }

    if (action === "validate") {
      const updated = await db.$transaction(async (tx) => {
        const p = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "Paid",
            paidAt: new Date(),
            invoiceNumber: generateInvoiceNumber(),
          },
        });
        await tx.user.update({
          where: { id: payment.userId },
          data: { hasFormationAccess: true },
        });
        return p;
      });

      await notify({
        userId: payment.userId,
        type: "Success",
        title: "Forfait validé",
        message:
          "Votre forfait formation a été validé par l'administration. Vous avez maintenant accès à l'intégralité de la plateforme.",
        link: "/dashboard",
      });

      await audit({
        actorId: session.user.id,
        action: "admin.forfait.validate",
        targetType: "Payment",
        targetId: paymentId,
        metadata: { userId: payment.userId },
        req,
      });

      return Response.json({ payment: updated });
    }

    // reject
    const updated = await db.payment.update({
      where: { id: paymentId },
      data: { status: "Cancelled", refundReason: reason || "Rejeté par l'administration" },
    });

    await notify({
      userId: payment.userId,
      type: "Warning",
      title: "Demande de forfait rejetée",
      message:
        "Votre demande d'acquisition du forfait formation a été rejetée par l'administration." +
        (reason ? ` Motif : ${reason}` : ""),
      link: "/dashboard?section=payments",
    });

    await audit({
      actorId: session.user.id,
      action: "admin.forfait.reject",
      targetType: "Payment",
      targetId: paymentId,
      metadata: { userId: payment.userId, reason },
      req,
    });

    return Response.json({ payment: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}
