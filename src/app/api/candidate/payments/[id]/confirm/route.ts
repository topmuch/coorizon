import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { notify } from "@/lib/notifications";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

/**
 * Payment confirmation endpoint (LOT 8 — COORIZON).
 *
 * CRITICAL — This endpoint simulates what a real payment provider webhook
 * (e.g. Stripe) would do. In production this route would be replaced by a
 * Stripe webhook handler that verifies the Stripe signature before doing
 * anything. The client NEVER sets the "Paid" status directly: the only way
 * a payment becomes "Paid" is through this server-side verification step.
 *
 * The client can only REQUEST a confirmation; the server decides whether the
 * payment is eligible (must be "Pending" and belong to the user) and performs
 * the transition atomically.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function random6(): string {
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    out += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return out;
}

async function generateUniqueInvoiceNumber(year: number): Promise<string> {
  // Loop until we find a number that does not exist yet (collision-safe).
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `FAC-${year}-${random6()}`;
    const existing = await db.payment.findFirst({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  // Extremely unlikely fallback — append extra entropy.
  return `FAC-${year}-${random6()}${random6().slice(0, 2)}`;
}

const STATUS_LABELS: Record<string, string> = {
  Pending: "En attente",
  Paid: "Payé",
  Failed: "Échoué",
  Refunded: "Remboursé",
  Cancelled: "Annulé",
};

// ─── POST: confirm a payment (simulated provider webhook) ──────────────────

/**
 * POST /api/candidate/payments/[id]/confirm
 *
 * Verifies the payment exists, belongs to the authenticated user, and is
 * still "Pending". If so, transitions it to "Paid", stamps paidAt, generates
 * a unique invoice number, notifies the user, and audits the action.
 *
 * This is the ONLY code path that can set status "Paid".
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await requireSession();
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        description: true,
        status: true,
      },
    });

    if (!payment) {
      return Response.json(
        { error: "Paiement introuvable." },
        { status: 404 }
      );
    }

    // A user can only confirm their OWN payments.
    if (payment.userId !== session.user.id) {
      return Response.json(
        { error: "Accès refusé. Vous ne pouvez pas confirmer ce paiement." },
        { status: 403 }
      );
    }

    // Only a Pending payment can be confirmed.
    if (payment.status !== "Pending") {
      const label = STATUS_LABELS[payment.status] ?? payment.status;
      return Response.json(
        {
          error: `Ce paiement ne peut pas être confirmé (statut actuel: ${label}).`,
        },
        { status: 400 }
      );
    }

    // Generate a unique invoice number (server-side, never client-supplied).
    const invoiceNumber = await generateUniqueInvoiceNumber(
      new Date().getFullYear()
    );

    const confirmed = await db.payment.update({
      where: { id },
      data: {
        status: "Paid",
        paidAt: new Date(),
        invoiceNumber,
      },
      include: {
        service: { select: { id: true, name: true, category: true } },
      },
    });

    // Notify the user — non-blocking.
    const amountFormatted = confirmed.amount.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    await notify({
      userId: session.user.id,
      type: "Success",
      title: "Paiement confirmé",
      message: `Votre paiement de ${amountFormatted} € pour "${confirmed.description}" a été confirmé. Facture ${invoiceNumber}.`,
      link: "dashboard?section=payments",
    });

    await audit({
      actorId: session.user.id,
      action: "payment.confirm",
      targetType: "Payment",
      targetId: confirmed.id,
      metadata: {
        invoiceNumber,
        amount: confirmed.amount,
        currency: confirmed.currency,
        fromStatus: "Pending",
        toStatus: "Paid",
      },
      req,
    });

    return Response.json({ payment: confirmed }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
