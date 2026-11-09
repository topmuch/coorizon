import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/jobs
 * List published job offers for candidates to browse.
 *
 * Query params:
 *   - q        : keyword (matches title OR description, case-insensitive)
 *   - sector   : exact sector match
 *   - city     : matches offer.city OR offer.region (contains, case-insensitive)
 *   - level    : italian level (CourseLevel A1–C2)
 *   - page     : page number (default 1)
 *   - pageSize : page size (default 9)
 *
 * Only candidates may browse offers. Only "Published" offers are returned.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    const url = req.nextUrl;
    const q = url.searchParams.get("q")?.trim() || "";
    const sector = url.searchParams.get("sector")?.trim() || "";
    const city = url.searchParams.get("city")?.trim() || "";
    const level = url.searchParams.get("level")?.trim() || "";
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") || "1", 10) || 1
    );
    const pageSize = Math.max(
      1,
      Math.min(
        50,
        parseInt(url.searchParams.get("pageSize") || "9", 10) || 9
      )
    );

    // SQLite's LIKE (used by Prisma `contains`) is case-insensitive for ASCII
    // by default, so we don't need `mode: "insensitive"` (which SQLite doesn't
    // support anyway).
    type StringFilter = { contains: string };
    interface WhereClause {
      status: "Published";
      AND: Array<Record<string, unknown>>;
    }

    const andClauses: Array<Record<string, unknown>> = [];

    if (q) {
      const kw: StringFilter = { contains: q };
      andClauses.push({ OR: [{ title: kw }, { description: kw }] });
    }
    if (sector) {
      andClauses.push({ sector });
    }
    if (city) {
      const loc: StringFilter = { contains: city };
      andClauses.push({ OR: [{ city: loc }, { region: loc }] });
    }
    if (level) {
      andClauses.push({ italianLevel: level });
    }

    const where: WhereClause = {
      status: "Published",
      AND: andClauses,
    };

    const [offers, total] = await Promise.all([
      db.jobOffer.findMany({
        where,
        include: {
          company: {
            select: { legalName: true, city: true, region: true, sector: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.jobOffer.count({ where }),
    ]);

    return Response.json({ offers, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
