import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin, ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid user statuses (mirrors the Prisma UserStatus enum).
 */
const VALID_STATUSES = ["Active", "Pending", "Suspended", "Deactivated"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

const STATUS_SET = new Set<string>(VALID_STATUSES);
const ROLE_SET = new Set<string>([
  ROLES.Candidate,
  ROLES.Recruiter,
  ROLES.Trainer,
  ROLES.RecruitmentAgent,
  ROLES.ImmigrationAgent,
  ROLES.Admin,
  ROLES.SuperAdmin,
]);

/**
 * GET /api/admin/users/[id]
 *
 * Fetch a single user's full details (profile, related counts, recent audit
 * entries targeting this user). Admin/SuperAdmin only.
 *
 * Response: { user, counts, auditTrail }
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        emailVerified: true,
        preferredLang: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        candidateProfile: {
          select: {
            id: true,
            nationality: true,
            residenceCountry: true,
            city: true,
            desiredJob: true,
            sector: true,
            italianLevel: true,
            completionPct: true,
          },
        },
        recruiterProfile: {
          select: {
            id: true,
            jobTitle: true,
            responsibleName: true,
            company: {
              select: {
                id: true,
                legalName: true,
                status: true,
                city: true,
                sector: true,
              },
            },
          },
        },
        trainerProfile: {
          select: { id: true, bio: true, specialties: true, isActive: true },
        },
        _count: {
          select: {
            applications: true,
            candidateDocuments: true,
            enrollments: true,
            examAttempts: true,
            certificates: true,
            jobOffers: true,
            interviewsAsRecruiter: true,
            interviewsAsCandidate: true,
            coursesCreated: true,
            immigrationCasesAsAgent: true,
            immigrationCasesAsCandidate: true,
            payments: true,
            messagesSent: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // Recent audit entries targeting this user (mini audit trail).
    const auditTrail = await db.auditLog.findMany({
      where: {
        OR: [
          { targetType: "User", targetId: id },
          { actorId: id },
        ],
      },
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        ipAddress: true,
        createdAt: true,
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return Response.json({ user, counts: user._count, auditTrail });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface UpdateBody {
  status?: unknown;
  role?: unknown;
}

/**
 * PUT /api/admin/users/[id]
 *
 * Update a user's status or role. Admin/SuperAdmin only, with additional
 * constraints enforced below (SuperAdmin-only for role changes, no suspending
 * SuperAdmins, no demoting the only SuperAdmin).
 *
 * Body: { status?, role? }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { id } = await params;

    let body: UpdateBody;
    try {
      body = (await req.json()) as UpdateBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const desiredStatus =
      typeof body.status === "string" && body.status.length > 0
        ? body.status
        : undefined;
    const desiredRole =
      typeof body.role === "string" && body.role.length > 0
        ? body.role
        : undefined;

    if (!desiredStatus && !desiredRole) {
      return Response.json(
        { error: "Aucun champ à mettre à jour (status ou role)." },
        { status: 400 }
      );
    }

    // Validate the provided values against the enums.
    if (desiredStatus && !STATUS_SET.has(desiredStatus)) {
      return Response.json(
        { error: `Statut invalide : ${desiredStatus}.` },
        { status: 400 }
      );
    }
    if (desiredRole && !ROLE_SET.has(desiredRole)) {
      return Response.json(
        { error: `Rôle invalide : ${desiredRole}.` },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, isActive: true },
    });

    if (!target) {
      return Response.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const actorRole = session.user.role as Role;
    const isActorSuperAdmin = actorRole === ROLES.SuperAdmin;

    const updateData: Prisma.UserUpdateInput = {};
    const auditMeta: Record<string, unknown> = {};

    // ─── Role change ──────────────────────────────────────────────────────
    if (desiredRole && desiredRole !== target.role) {
      // Only SuperAdmin can change roles.
      if (!isActorSuperAdmin) {
        return Response.json(
          {
            error:
              "Seul un super administrateur peut modifier le rôle d'un utilisateur.",
          },
          { status: 403 }
        );
      }

      // Prevent lockout: cannot change the role of the only SuperAdmin.
      if (target.role === ROLES.SuperAdmin) {
        const superAdminCount = await db.user.count({
          where: { role: ROLES.SuperAdmin },
        });
        if (superAdminCount <= 1) {
          return Response.json(
            {
              error:
                "Impossible de modifier le rôle de l'unique super administrateur (risque de verrouillage).",
            },
            { status: 400 }
          );
        }
      }

      // Setting a new SuperAdmin is implicitly allowed here because the actor
      // is already SuperAdmin (the only role permitted to reach this branch).
      updateData.role = desiredRole as Role;
      auditMeta.role = desiredRole;
    }

    // ─── Status change ────────────────────────────────────────────────────
    if (desiredStatus && desiredStatus !== target.status) {
      const next = desiredStatus as ValidStatus;

      // Cannot suspend a SuperAdmin.
      if (
        next === "Suspended" &&
        target.role === ROLES.SuperAdmin
      ) {
        return Response.json(
          {
            error:
              "Impossible de suspendre un super administrateur.",
          },
          { status: 403 }
        );
      }

      updateData.status = next;
      // Mirror isActive: Suspended/Deactivated → false, Active → true.
      if (next === "Suspended" || next === "Deactivated") {
        updateData.isActive = false;
      } else if (next === "Active") {
        updateData.isActive = true;
      }
      auditMeta.status = next;
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
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
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.user.update",
      targetType: "User",
      targetId: id,
      metadata: auditMeta,
      req,
    });

    return Response.json({ user: updated }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
