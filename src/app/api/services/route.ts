import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

/**
 * Service catalog API (LOT 8 — Paiements).
 *
 * GET /api/services  — list published services in the public catalog. Any
 *                      authenticated user can browse (used by the checkout
 *                      & payment entrypoints). Unpublished services are
 *                      hidden; admins manage them via /api/admin/services.
 */
export async function GET(_req: NextRequest) {
  try {
    await requireSession();

    const services = await db.service.findMany({
      where: { isPublished: true },
      orderBy: [{ category: "asc" }, { price: "asc" }],
    });

    return Response.json({ services });
  } catch (error) {
    return authErrorResponse(error);
  }
}
