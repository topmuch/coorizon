import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/auth/session";
import { getAgentId } from "@/lib/auth/agent";
import { audit } from "@/lib/auth/audit";
import type { ImmigrationCaseStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid immigration case statuses (mirrors the Prisma enum).
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

/**
 * Valid priority levels for an immigration case.
 */
const VALID_PRIORITIES = ["Normal", "Haute", "Urgente"] as const;
const PRIORITY_SET = new Set<string>(VALID_PRIORITIES);

/**
 * Statuses that require explicit confirmation that the visa / authorization
 * has been officially obtained. Mirrors the LOT 7 critical rule:
 * "ne jamais déclarer visa/autorisation obtenu sans confirmation officielle".
 */
const CONFIRMATION_REQUIRED_STATUSES: ReadonlySet<string> = new Set([
  "Ready",
  "Closed",
]);

/**
 * Prisma include shape reused for both GET and PUT responses.
 */
const caseInclude = {
  candidate: {
    include: {
      candidateProfile: true,
      candidateDocuments: {
        select: {
          id: true,
          type: true,
          fileName: true,
          status: true,
          createdAt: true,
        },
      },
    },
  },
  agent: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  company: {
    select: { id: true, legalName: true, city: true, sector: true },
  },
  jobOffer: {
    select: { id: true, title: true, city: true, contractType: true },
  },
  tasks: {
    orderBy: { order: "asc" as const },
  },
} satisfies Prisma.ImmigrationCaseInclude;

/**
 * GET /api/agent/cases/[id]
 *
 * Returns the full details of an immigration case assigned to the current
 * agent: candidate (with profile + documents list), company, job offer and
 * the ordered task checklist.
 *
 * Auth: agent (RecruitmentAgent | ImmigrationAgent). The case must be
 * assigned to the requesting agent (case.agentId === agentId), otherwise 403.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await getAgentId();
    const { id } = await params;

    const immigrationCase = await db.immigrationCase.findUnique({
      where: { id },
      include: caseInclude,
    });

    if (!immigrationCase) {
      return Response.json({ error: "Dossier introuvable." }, { status: 404 });
    }

    if (immigrationCase.agentId !== agentId) {
      return Response.json(
        { error: "Ce dossier ne vous est pas assigné." },
        { status: 403 }
      );
    }

    return Response.json({ case: immigrationCase });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface UpdateCaseBody {
  status?: unknown;
  priority?: unknown;
  notes?: unknown;
  confirmation?: unknown;
}

/**
 * PUT /api/agent/cases/[id]
 *
 * Updates an immigration case's status, priority and/or notes. The case must
 * be owned by the requesting agent.
 *
 * Body: { status?, priority?, notes?, confirmation? }
 *
 * CRITICAL RULE — when transitioning to "Ready" or "Closed", the caller MUST
 * send `confirmation: true` to assert that the visa / authorization has been
 * officially obtained. Missing or false confirmation → 400.
 *
 * Setting status to "Closed" also stamps `closedAt` with the current time.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await getAgentId();
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

    const desiredStatus =
      typeof body.status === "string" && body.status.length > 0
        ? body.status
        : undefined;
    const desiredPriority =
      typeof body.priority === "string" && body.priority.length > 0
        ? body.priority
        : undefined;
    const desiredNotes = typeof body.notes === "string" ? body.notes : undefined;

    if (!desiredStatus && !desiredPriority && desiredNotes === undefined) {
      return Response.json(
        { error: "Aucun champ à mettre à jour (status, priority ou notes)." },
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

    // Fetch the existing case (and verify ownership).
    const existing = await db.immigrationCase.findUnique({
      where: { id },
      select: {
        id: true,
        agentId: true,
        status: true,
        priority: true,
        closedAt: true,
      },
    });

    if (!existing) {
      return Response.json({ error: "Dossier introuvable." }, { status: 404 });
    }

    if (existing.agentId !== agentId) {
      return Response.json(
        { error: "Ce dossier ne vous est pas assigné." },
        { status: 403 }
      );
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
            "Vous devez confirmer officiellement que l'autorisation/visa a été obtenu avant de passer ce statut.",
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

    await db.immigrationCase.update({
      where: { id },
      data: updateData,
    });

    await audit({
      actorId: agentId,
      action: "agent.case.update",
      targetType: "ImmigrationCase",
      targetId: id,
      metadata: auditMeta,
      req,
    });

    // Re-fetch with the full include shape for the response payload.
    const refreshed = await db.immigrationCase.findUnique({
      where: { id },
      include: caseInclude,
    });

    return Response.json({ case: refreshed }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
