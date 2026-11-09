import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/certificates/[id]
 *
 * Returns a single certificate (for viewing / printing). Candidate-only,
 * with a strict ownership check: a candidate can only fetch their own
 * certificates, even revoked ones (so they can see the state).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const certificate = await db.certificate.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, level: true } },
      },
    });

    if (!certificate) {
      return Response.json(
        { error: "Certificat introuvable." },
        { status: 404 }
      );
    }

    if (certificate.candidateId !== session.user.id) {
      return Response.json(
        { error: "Ce certificat ne vous appartient pas." },
        { status: 403 }
      );
    }

    return Response.json({ certificate });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la récupération du certificat." },
      { status: 500 }
    );
  }
}
