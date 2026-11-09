import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

/**
 * Payments API (LOT 8 — COORIZON).
 *
 * A payment (order) is created in the "Pending" status. It can ONLY be
 * transitioned to "Paid" by the dedicated confirm endpoint, which simulates
 * a server-to-server payment provider webhook. The client NEVER sets "Paid"
 * directly — there is no client-supplied amount or status accepted here.
 *
 * Any authenticated user (candidate or recruiter) can have payments, so the
 * GET endpoint does not restrict by role. POST only requires a session.
 */

// ─── GET: list the authenticated user's own payments ───────────────────────

/**
 * GET /api/candidate/payments
 * Returns the authenticated user's payments, newest first, with the linked
 * service summary (id, name, category) if any.
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const session = await requireSession();

    const payments = await db.payment.findMany({
      where: { userId: session.user.id },
      include: {
        service: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ payments });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// ─── POST: create a new payment (order) for a service ──────────────────────

interface CreatePaymentBody {
  serviceId?: unknown;
}

/**
 * POST /api/candidate/payments
 * Body: { serviceId }
 *
 * Business rules:
 *  - The service must exist and be published (404 otherwise).
 *  - The amount is copied from the service price SERVER-SIDE. The client
 *    never sends an amount — it cannot be trusted.
 *  - The payment is created with status "Pending" and provider "local".
 *  - status "Paid" is NEVER set here. The client must call the confirm
 *    endpoint, which simulates the payment provider webhook.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    let body: CreatePaymentBody;
    try {
      body = (await req.json()) as CreatePaymentBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const serviceId =
      typeof body?.serviceId === "string" ? body.serviceId.trim() : "";

    if (!serviceId) {
      return Response.json(
        { error: "L'identifiant de la prestation est requis." },
        { status: 400 }
      );
    }

    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        isPublished: true,
      },
    });

    if (!service || !service.isPublished) {
      return Response.json(
        { error: "Prestation introuvable ou non disponible." },
        { status: 404 }
      );
    }

    // The amount is taken from the service price (server-side, never client).
    const payment = await db.payment.create({
      data: {
        userId,
        serviceId: service.id,
        amount: service.price,
        currency: service.currency,
        description: service.name,
        status: "Pending",
        provider: "local",
      },
      include: {
        service: { select: { id: true, name: true, category: true } },
      },
    });

    await audit({
      actorId: userId,
      action: "payment.create",
      targetType: "Payment",
      targetId: payment.id,
      metadata: {
        serviceId: service.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
      req,
    });

    return Response.json({ payment }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
