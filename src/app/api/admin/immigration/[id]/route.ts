import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { ImmigrationCaseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Admin immigration case detail API (LOT 7 — Task 7-c).
 *
 * PUT /api/admin/immigration/[id]
 *
 * Updates an immigration case: assign / reassign an agent, change status,
 * change priority, or update notes. Admin-only.
 *
 * Body: { agentId?, status?, priority?, notes?, confirmation? }
 *
 * CRITICAL RULE — when transitioning to "Ready" or "Closed", the caller MUST
 * send `confirmation: true` to assert that the visa / authorization has been
 * officially obtained. Mirrors the same rule enforced on the agent endpoint.
 * COORIZON never declares a visa/authorization obtained without official
 * confirmation.
 *
 * Setting status to "Closed" also stamps `closedAt` with the current time.
 * Reopening from Closed clears `closedAt`.
 */

const VALID_CASE_STATUSES: readonly ImmigrationCaseStatus[] = [
  "Open",
  "InProgress",
  "DocumentsPending",
  "VisaPending",
  "Ready",
  "Closed",
  "OnHold",
];
const CASE_STATUS_SET = new Set<string>(VALID_CASE_STATUSES);

const VALID_PRIORITIES = ["Normal", "Haute", "Urgente"] as const;
const PRIORITY_SET = new Set<string>(VALID_PRIORITIES);

const AGENT_ROLES_SET = new Set<string>(["RecruitmentAgent", "ImmigrationAgent"]);

const CONFIRMATION_REQUIRED_STATUSES: ReadonlySet<string> = new Set([
  "Ready",
  "Closed",
]);

interface UpdateCaseBody {
  agentId?: unknown;
  status?: unknown;
  priority?: unknown;
  notes?: unknown;
  confirmation?: unknown;
}

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

    let body: UpdateCaseBody;
    try {
      body = (await req.json()) as UpdateCaseBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    // Parse optional fields.
    const desiredStatus =
      typeof body.status === "string" && body.status.length > 0
        ? body.status
        : undefined;
    const desiredPriority =
      typeof body.priority === "string" && body.priority.length > 0
        ? body.priority
        : undefined;
    const desiredNotes = typeof body.notes === "string" ? body.notes : undefined;

    // agentId may be:
    //   - undefined → not changed
    //   - null / "unassigned" / "" → unassign
    //   - a non-empty string → assign to that agent
    let desiredAgentId: string | null | undefined = undefined;
    if (body.agentId === null) {
      desiredAgentId = null;
    } else if (typeof body.agentId === "string") {
      const trimmed = body.agentId.trim();
      if (trimmed.length === 0 || trimmed === "unassigned") {
        desiredAgentId = null;
      } else {
        desiredAgentId = trimmed;
      }
    }

    if (
      desiredStatus === undefined &&
      desiredPriority === undefined &&
      desiredNotes === undefined &&
      desiredAgentId === undefined
    ) {
      return Response.json(
        { error: "Aucun champ à mettre à jour (agentId, status, priority ou notes)." },
        { status: 400 }
      );
    }

    // Validate status enum value if provided.
    if (desiredStatus && !CASE_STATUS_SET.has(desiredStatus)) {
      return Response.json(
        { error: `Statut de dossier invalide : ${desiredStatus}.` },
        { status: 400 }
      );
    }

    // Validate priority enum value if provided.
    if (desiredPriority && !PRIORITY_SET.has(desiredPriority)) {
      return Response.json(
        { error: `Priorité invalide : ${desiredPriority}.` },
        { status: 400 }
      );
    }

    // Validate agent role if a new agent id is provided.
    if (typeof desiredAgentId === "string") {
      const agent = await db.user.findUnique({
        where: { id: desiredAgentId },
        select: { id: true, role: true },
      });
      if (!agent || !AGENT_ROLES_SET.has(agent.role)) {
        return Response.json(
          { error: "Agent introuvable ou rôle invalide." },
          { status: 400 }
        );
      }
    }

    const existing = await db.immigrationCase.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        priority: true,
        closedAt: true,
        agentId: true,
      },
    });

    if (!existing) {
      return Response.json({ error: "Dossier introuvable." }, { status: 404 });
    }

    const fromStatus = existing.status;
    const toStatus =
      (desiredStatus as ImmigrationCaseStatus | undefined) ?? fromStatus;

    // CRITICAL: enforce the "no false positive" rule on Ready / Closed.
    if (
      desiredStatus &&
      CONFIRMATION_REQUIRED_STATUSES.has(desiredStatus) &&
      body.confirmation !== true
    ) {
      return Response.json(
        {
          error:
            "Vous devez confirmer officiellement que l'autorisation/visa a été obtenue avant de passer ce statut.",
        },
        { status: 400 }
      );
    }

    const updateData: Prisma.ImmigrationCaseUpdateInput = {};
    const auditMeta: Record<string, unknown> = { fromStatus, toStatus };

    if (desiredStatus) {
      updateData.status = desiredStatus as ImmigrationCaseStatus;
      // Stamp closure time when moving to Closed; clear it if reopened.
      if (desiredStatus === "Closed") {
        updateData.closedAt = new Date();
      } else if (existing.closedAt !== null) {
        updateData.closedAt = null;
      }
    }

    if (desiredPriority) {
      updateData.priority = desiredPriority;
      auditMeta.priority = desiredPriority;
    }

    if (desiredNotes !== undefined) {
      updateData.notes = desiredNotes.trim() || null;
      auditMeta.notesUpdated = true;
    }

    if (desiredAgentId !== undefined) {
      if (desiredAgentId === null) {
        updateData.agent = { disconnect: true };
        auditMeta.agentUnassigned = true;
        auditMeta.previousAgentId = existing.agentId;
      } else {
        updateData.agent = { connect: { id: desiredAgentId } };
        auditMeta.agentId = desiredAgentId;
        auditMeta.previousAgentId = existing.agentId;
      }
    }

    const updated = await db.immigrationCase.update({
      where: { id },
      data: updateData,
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        agent: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, legalName: true } },
        jobOffer: { select: { id: true, title: true } },
        _count: { select: { tasks: true } },
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.case.update",
      targetType: "ImmigrationCase",
      targetId: id,
      metadata: auditMeta,
      req,
    });

    return Response.json({ case: updated }, { status: 200 });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la mise à jour du dossier." },
      { status: 500 }
    );
  }
}
