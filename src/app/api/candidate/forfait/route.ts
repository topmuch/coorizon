import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";
import { getOrCreateForfaitService } from "@/lib/forfait";
import { audit } from "@/lib/auth/audit";

/**
 * POST /api/candidate/forfait
 *
 * Candidate requests to buy the formation forfait. Creates a Pending payment
 * linked to the forfait service — the administration validates it in the
 * "Forfait" tab. The candidate CANNOT self-confirm this payment.
 *
 * Response: 201 { payment } | 409 if a request is already pending or access already granted.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json({ error: "Réservé aux candidats." }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hasFormationAccess: true },
    });
    if (user?.hasFormationAccess) {
      return Response.json(
        { error: "Vous avez déjà accès complet à la plateforme." },
        { status: 400 }
      );
    }

    const service = await getOrCreateForfaitService();

    const existingPending = await db.payment.findFirst({
      where: { userId: session.user.id, serviceId: service.id, status: "Pending" },
      select: { id: true },
    });
    if (existingPending) {
      return Response.json(
        { error: "Une demande d'acquisition du forfait est déjà en attente de validation." },
        { status: 409 }
      );
    }

    const payment = await db.payment.create({
      data: {
        userId: session.user.id,
        serviceId: service.id,
        amount: service.price,
        currency: service.currency,
        description: service.name,
        status: "Pending",
        provider: "local",
      },
      select: { id: true, amount: true, currency: true, status: true, createdAt: true },
    });

    await audit({
      actorId: session.user.id,
      action: "forfait.request",
      targetType: "Payment",
      targetId: payment.id,
      metadata: { amount: payment.amount, currency: payment.currency },
      req,
    });

    return Response.json({ payment }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
