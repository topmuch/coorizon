import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/jobs/[id]
 * Fetch a single published job offer (candidate-facing details).
 *
 * Returns 404 if the offer does not exist or is not "Published".
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const offer = await db.jobOffer.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            legalName: true,
            city: true,
            region: true,
            sector: true,
            website: true,
          },
        },
      },
    });

    if (!offer || offer.status !== "Published") {
      return Response.json(
        { error: "Offre introuvable ou non publiée." },
        { status: 404 }
      );
    }

    return Response.json({ offer });
  } catch (error) {
    return authErrorResponse(error);
  }
}
