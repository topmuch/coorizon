import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";
import { getOrCreateForfaitService } from "@/lib/forfait";
import { audit } from "@/lib/auth/audit";
import { notifyAdmins } from "@/lib/notifications";
import { sendEmail, sendAdminAlert, emailWrap } from "@/lib/email";
import { formatAmount } from "@/lib/format-currency";

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

    const amountLabel = formatAmount(payment.amount, payment.currency);
    const clientName = `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim() || session.user.email;

    // Visual notification for the administration: the Forfait tab will
    // display a badge until the admin opens it.
    await notifyAdmins({
      type: "Info",
      title: "Nouvelle demande de forfait",
      message: `${clientName} a demandé l'acquisition du forfait (${amountLabel}). Validation requise dans l'onglet Forfait Formation.`,
      link: "dashboard?section=forfait",
    });

    // Confirmation email to the candidate.
    await sendEmail({
      to: session.user.email,
      subject: "COORIZON — Votre demande de forfait est en attente de validation",
      body: emailWrap("Demande de forfait enregistrée", [
        `Bonjour ${clientName},`,
        "",
        `Votre demande d'acquisition du Forfait Formation (${amountLabel}) a été enregistrée.`,
        "Elle est en attente de validation par l'administration COORIZON.",
        "Votre accès complet sera activé dès la validation de votre paiement.",
      ]),
      template: "payment",
      userId: session.user.id,
    });

    // Alert email to the administration.
    await sendAdminAlert(
      "COORIZON — Nouvelle demande de forfait",
      emailWrap("Nouvelle demande de forfait", [
        `Client : ${clientName} (${session.user.email})`,
        `Montant : ${amountLabel}`,
        "",
        "Un badge « Nouveautés » est visible dans l'onglet Forfait Formation du back-office.",
      ]),
      "payment"
    );

    return Response.json({ payment }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
