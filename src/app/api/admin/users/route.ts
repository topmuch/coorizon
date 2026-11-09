import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { ALL_ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

/**
 * Valid user statuses for filtering.
 */
const VALID_STATUSES = ["Active", "Pending", "Suspended", "Deactivated"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function isStringArray(values: readonly string[]): (v: string) => boolean {
  const set = new Set(values);
  return (v: string) => set.has(v);
}

const isRole = isStringArray(ALL_ROLES as readonly string[]);
const isStatus = isStringArray(VALID_STATUSES as readonly string[]);

function parsePage(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function parsePageSize(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 100);
}

/**
 * GET /api/admin/users
 *
 * Paginated, filterable list of all users. Admin/SuperAdmin only.
 *
 * Query params:
 *  - role     : filter by Role (Candidate|Recruiter|Trainer|RecruitmentAgent|ImmigrationAgent|Admin|SuperAdmin)
 *  - status   : filter by UserStatus (Active|Pending|Suspended|Deactivated)
 *  - q        : search across firstName, lastName, email (contains, case-insensitive)
 *  - page     : 1-based page index (default 1)
 *  - pageSize : items per page (default 20, max 100)
 *
 * Response: { users, total, page, pageSize }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");
    const statusParam = searchParams.get("status");
    const qParam = searchParams.get("q")?.trim() ?? "";

    const role = roleParam && isRole(roleParam) ? (roleParam as Role) : undefined;
    const status =
      statusParam && isStatus(statusParam) ? (statusParam as ValidStatus) : undefined;

    const page = parsePage(searchParams.get("page"));
    const pageSize = parsePageSize(searchParams.get("pageSize"));

    const filters: Prisma.UserWhereInput[] = [];
    if (role) filters.push({ role });
    if (status) filters.push({ status });
    if (qParam.length > 0) {
      filters.push({
        OR: [
          { firstName: { contains: qParam } },
          { lastName: { contains: qParam } },
          { email: { contains: qParam } },
        ],
      });
    }

    const where: Prisma.UserWhereInput = { AND: filters };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          candidateProfile: { select: { id: true } },
          recruiterProfile: {
            select: {
              id: true,
              company: { select: { legalName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    return Response.json({ users, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
