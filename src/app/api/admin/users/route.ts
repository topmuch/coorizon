import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin, isSuperAdmin, ROLES } from "@/lib/permissions";
import { ALL_ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { hashPassword, validateEmail, validatePasswordPolicy } from "@/lib/auth/password";
import { audit } from "@/lib/auth/audit";

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
 *  - department : filter candidates by training centre department (Senegal)
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
    const departmentParam = searchParams.get("department")?.trim() ?? "";
    const qParam = searchParams.get("q")?.trim() ?? "";

    const role = roleParam && isRole(roleParam) ? (roleParam as Role) : undefined;
    const status =
      statusParam && isStatus(statusParam) ? (statusParam as ValidStatus) : undefined;

    const page = parsePage(searchParams.get("page"));
    const pageSize = parsePageSize(searchParams.get("pageSize"));

    const filters: Prisma.UserWhereInput[] = [];
    if (role) filters.push({ role });
    if (status) filters.push({ status });
    if (departmentParam) {
      filters.push({ candidateProfile: { department: departmentParam } });
    }
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
          candidateProfile: { select: { id: true, department: true } },
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

/**
 * POST /api/admin/users
 *
 * Create a user directly from the back-office (active immediately).
 * Creating a SuperAdmin requires the caller to be a SuperAdmin.
 *
 * Body: { firstName, lastName, email, password, role, phone? }
 * Response: 201 { user }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
    }

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const phone = String(body.phone ?? "").trim() || undefined;
    const role = String(body.role ?? "") as Role;

    if (!firstName || !lastName) {
      return Response.json({ error: "Le prénom et le nom sont requis." }, { status: 400 });
    }
    if (!(ALL_ROLES as string[]).includes(role)) {
      return Response.json({ error: "Rôle invalide." }, { status: 400 });
    }
    if (role === ROLES.SuperAdmin && !isSuperAdmin(session.user.role)) {
      return Response.json(
        { error: "Seul un SuperAdmin peut créer un compte SuperAdmin." },
        { status: 403 }
      );
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

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role,
        status: "Active",
        isActive: true,
        firstName,
        lastName,
        phone,
        emailVerified: new Date(),
        ...(role === ROLES.Candidate ? { candidateProfile: { create: {} } } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.user.create",
      targetType: "User",
      targetId: user.id,
      metadata: { role, email: user.email },
      req,
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
