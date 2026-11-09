import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";
import { ROLES } from "@/lib/permissions";

/**
 * DELETE /api/admin/privacy/delete?userId=...
 *
 * Anonymizes and deletes a user's personal data (GDPR "right to erasure",
 * Article 17). This is irreversible.
 *
 * The approach:
 * 1. Delete all personal data (documents, messages, notifications, etc.)
 * 2. Anonymize the user record (replace PII with "[deleted]")
 * 3. Deactivate the account (isActive=false, status=Deactivated)
 * 4. Keep the user ID for referential integrity (applications, payments, etc.
 *    are kept but the user is anonymized)
 *
 * Admin/SuperAdmin only. SuperAdmin accounts cannot be deleted.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return Response.json({ error: "userId est requis." }, { status: 400 });
    }

    // Prevent self-deletion and SuperAdmin deletion
    if (userId === session.user.id) {
      return Response.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (user.role === ROLES.SuperAdmin) {
      return Response.json({ error: "Les comptes super administrateur ne peuvent pas être supprimés." }, { status: 400 });
    }

    // Delete personal data in a transaction
    await db.$transaction(async (tx) => {
      // Delete candidate documents
      await tx.candidateDocument.deleteMany({ where: { candidateId: userId } });

      // Delete candidate profile
      await tx.candidateProfile.deleteMany({ where: { userId } });

      // Delete trainer profile
      await tx.trainerProfile.deleteMany({ where: { userId } });

      // Delete messages
      await tx.message.deleteMany({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } });

      // Delete notifications
      await tx.notification.deleteMany({ where: { userId } });

      // Delete exam attempts
      await tx.examAttempt.deleteMany({ where: { candidateId: userId } });

      // Delete certificates
      await tx.certificate.deleteMany({ where: { candidateId: userId } });

      // Anonymize the user record (keep ID for referential integrity)
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@coorizon.local`,
          passwordHash: "[deleted]",
          firstName: "[Supprimé]",
          lastName: "[Supprimé]",
          phone: null,
          isActive: false,
          status: "Deactivated",
          lastLoginAt: null,
        },
      });
    });

    await audit({
      actorId: session.user.id,
      action: "admin.privacy.delete",
      targetType: "User",
      targetId: userId,
      metadata: { originalEmail: user.email, originalName: `${user.firstName} ${user.lastName}` },
      req,
    });

    return Response.json({ ok: true, message: "Les données personnelles de cet utilisateur ont été supprimées (anonymisées)." });
  } catch (error) {
    return authErrorResponse(error);
  }
}
