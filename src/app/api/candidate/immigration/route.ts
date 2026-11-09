import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/immigration
 *
 * Returns the authenticated candidate's OWN immigration case (read-only).
 * A candidate can only see the case linked to their account — never anyone
 * else's. The response is intentionally read-only: the candidate cannot
 * mutate tasks or status from this endpoint.
 *
 * Response shape:
 *   { case: ImmigrationCase | null }
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    const immigrationCase = await db.immigrationCase.findFirst({
      where: { candidateId: session.user.id },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        company: { select: { id: true, legalName: true, city: true } },
        jobOffer: { select: { id: true, title: true, city: true } },
        tasks: { orderBy: { order: "asc" } },
      },
    });

    return Response.json({ case: immigrationCase });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la récupération du dossier." },
      { status: 500 }
    );
  }
}
