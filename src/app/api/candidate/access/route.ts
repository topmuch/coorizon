import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";
import { getPlatformSettings } from "@/lib/platform-settings";
import { findForfaitService } from "@/lib/forfait";

/**
 * GET /api/candidate/access
 *
 * Candidate access status: whether the formation forfait has been paid
 * (full platform access) plus the current forfait configuration and any
 * purchase request still pending admin validation.
 *
 * Response: {
 *   hasFormationAccess: boolean,
 *   forfait: { name, description, amount, currency, durationLabel },
 *   pendingRequest: { id, createdAt, amount, currency } | null,
 *   paidRequest: { id, invoiceNumber, paidAt } | null
 * }
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json({ error: "Réservé aux candidats." }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hasFormationAccess: true },
    });

    const [settings, service] = await Promise.all([getPlatformSettings(), findForfaitService()]);

    const [pendingRequest, paidRequest] = service
      ? await Promise.all([
          db.payment.findFirst({
            where: { userId: session.user.id, serviceId: service.id, status: "Pending" },
            select: { id: true, createdAt: true, amount: true, currency: true },
            orderBy: { createdAt: "desc" },
          }),
          db.payment.findFirst({
            where: { userId: session.user.id, serviceId: service.id, status: "Paid" },
            select: { id: true, invoiceNumber: true, paidAt: true },
            orderBy: { paidAt: "desc" },
          }),
        ])
      : [null, null];

    return Response.json({
      hasFormationAccess: user?.hasFormationAccess ?? false,
      forfait: settings.forfait,
      pendingRequest,
      paidRequest,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
