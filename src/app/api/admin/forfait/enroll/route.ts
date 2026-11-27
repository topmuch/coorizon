import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { hashPassword, validateEmail, validatePasswordPolicy } from "@/lib/auth/password";
import { getOrCreateForfaitService, generateInvoiceNumber } from "@/lib/forfait";
import { audit } from "@/lib/auth/audit";

/**
 * POST /api/admin/forfait/enroll
 *
 * Direct client enrollment by the SuperAdmin: creates an active Candidate
 * account AND a forfait payment already marked as Paid — the client gets full
 * platform access immediately.
 *
 * Body: { firstName, lastName, email, phone?, password }
 * Response: 201 { user, payment }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const firstName = String(body?.firstName ?? "").trim();
    const lastName = String(body?.lastName ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phone = String(body?.phone ?? "").trim() || undefined;
    const password = String(body?.password ?? "");

    if (!firstName || !lastName) {
      return Response.json({ error: "Le prénom et le nom sont requis." }, { status: 400 });
    }
    const emailError = validateEmail(email);
    if (emailError) {
      return Response.json({ error: emailError }, { status: 400 });
    }
    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      return Response.json({ error: policyError }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return Response.json(
        { error: "Un compte existe déjà avec cette adresse email." },
        { status: 409 }
      );
    }

    const service = await getOrCreateForfaitService();
    const passwordHash = await hashPassword(password);

    const { user, payment } = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "Candidate",
          status: "Active",
          isActive: true,
          hasFormationAccess: true,
          firstName,
          lastName,
          phone,
          emailVerified: new Date(),
          candidateProfile: { create: {} },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          hasFormationAccess: true,
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          amount: service.price,
          currency: service.currency,
          description: service.name,
          status: "Paid",
          provider: "admin",
          paidAt: new Date(),
          invoiceNumber: generateInvoiceNumber(),
        },
      });

      return { user, payment };
    });

    await audit({
      actorId: session.user.id,
      action: "admin.forfait.enroll",
      targetType: "User",
      targetId: user.id,
      metadata: { email, paymentId: payment.id },
      req,
    });

    return Response.json({ user, payment }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
