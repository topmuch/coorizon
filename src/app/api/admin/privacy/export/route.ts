import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * GET /api/admin/privacy/export?userId=...
 *
 * Exports ALL personal data for a given user as a JSON download.
 * This implements the GDPR "right to data portability" (Article 20).
 *
 * Admin/SuperAdmin only.
 */
export async function GET(req: NextRequest) {
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

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, status: true,
        firstName: true, lastName: true, phone: true,
        preferredLang: true, isActive: true, emailVerified: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
        candidateProfile: true,
        recruiterProfile: { include: { company: true } },
        trainerProfile: true,
        candidateDocuments: true,
        applications: { include: { jobOffer: { select: { title: true } } } },
        enrollments: { include: { course: { select: { title: true, level: true } } } },
        examAttempts: true,
        certificates: true,
        immigrationCasesAsCandidate: { include: { agent: { select: { firstName: true, lastName: true, email: true } } } },
        messagesSent: { select: { id: true, subject: true, body: true, createdAt: true } },
        messagesReceived: { select: { id: true, subject: true, body: true, createdAt: true } },
        notifications: { select: { id: true, type: true, title: true, message: true, createdAt: true } },
        payments: { include: { service: { select: { name: true } } } },
        interviewsAsCandidate: true,
      },
    });

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    await audit({
      actorId: session.user.id,
      action: "admin.privacy.export",
      targetType: "User",
      targetId: userId,
      metadata: { email: user.email },
      req,
    });

    // Return as a downloadable JSON file
    return new Response(JSON.stringify(user, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="coorizon-data-${user.email}.json"`,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
