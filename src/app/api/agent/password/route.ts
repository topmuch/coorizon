import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import {
  verifyPassword,
  hashPassword,
  validatePasswordPolicy,
} from "@/lib/auth/password";
import { audit } from "@/lib/auth/audit";

/**
 * PUT /api/agent/password
 *
 * Allows an agent (RecruitmentAgent or ImmigrationAgent) to change their own
 * password by providing the current password and a new one. The current
 * password is verified (bcrypt) before updating.
 *
 * Same pattern as candidate/recruiter/trainer password APIs.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (
      session.user.role !== "RecruitmentAgent" &&
      session.user.role !== "ImmigrationAgent"
    ) {
      return Response.json(
        { error: "Réservé aux agents." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Données invalides." }, { status: 400 });

    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: "Veuillez renseigner tous les champs." },
        { status: 400 }
      );
    }

    const policyErr = validatePasswordPolicy(newPassword);
    if (policyErr) return Response.json({ error: policyErr }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return Response.json(
        { error: "Le mot de passe actuel est incorrect." },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });

    await audit({
      actorId: session.user.id,
      action: "agent.password.change",
      targetType: "User",
      targetId: session.user.id,
      req,
    });

    return Response.json({ ok: true });
  } catch (error) {
    const e = error as Error & { code?: string; status?: number };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
