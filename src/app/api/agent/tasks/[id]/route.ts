import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/auth/session";
import { getAgentId } from "@/lib/auth/agent";
import { audit } from "@/lib/auth/audit";
import type { ImmigrationTaskStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid task statuses (mirrors the Prisma ImmigrationTaskStatus enum).
 */
const VALID_TASK_STATUSES: readonly ImmigrationTaskStatus[] = [
  "Todo",
  "InProgress",
  "Done",
  "Blocked",
];
const TASK_STATUS_SET = new Set<string>(VALID_TASK_STATUSES);

/**
 * PUT /api/agent/tasks/[id]
 *
 * Updates a task's status, title, description, due date and/or order. The
 * task's parent case must be owned by the requesting agent.
 *
 * Body: { status?, title?, description?, dueDate?, order? }
 *
 * Side effects:
 *  - status === "Done" → `completedAt` is stamped with the current time.
 *  - status moves from "Done" to anything else → `completedAt` is cleared.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await getAgentId();
    const { id } = await params;

    let body: {
      status?: unknown;
      title?: unknown;
      description?: unknown;
      dueDate?: unknown;
      order?: unknown;
    };
    try {
      body = (await req.json()) as typeof body;
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
    const desiredTitle =
      typeof body.title === "string" ? body.title.trim() : undefined;
    const desiredDescription =
      typeof body.description === "string"
        ? body.description.trim() || null
        : undefined;

    let desiredDueDate: Date | null | undefined;
    if (body.dueDate === null) {
      desiredDueDate = null;
    } else if (typeof body.dueDate === "string" && body.dueDate.trim().length > 0) {
      const parsed = new Date(body.dueDate);
      if (Number.isNaN(parsed.getTime())) {
        return Response.json(
          { error: "Date d'échéance invalide." },
          { status: 400 }
        );
      }
      desiredDueDate = parsed;
    }

    let desiredOrder: number | undefined;
    if (typeof body.order === "number" && Number.isFinite(body.order)) {
      desiredOrder = Math.trunc(body.order);
    } else if (body.order === null) {
      desiredOrder = 0;
    }

    if (
      desiredStatus === undefined &&
      desiredTitle === undefined &&
      desiredDescription === undefined &&
      desiredDueDate === undefined &&
      desiredOrder === undefined
    ) {
      return Response.json(
        { error: "Aucun champ à mettre à jour." },
        { status: 400 }
      );
    }

    if (desiredStatus && !TASK_STATUS_SET.has(desiredStatus)) {
      return Response.json(
        { error: `Statut de tâche invalide : ${desiredStatus}.` },
        { status: 400 }
      );
    }

    if (desiredTitle === "") {
      return Response.json(
        { error: "Le titre de la tâche ne peut pas être vide." },
        { status: 400 }
      );
    }

    const task = await db.immigrationTask.findUnique({
      where: { id },
      include: { case: { select: { agentId: true } } },
    });

    if (!task) {
      return Response.json(
        { error: "Tâche introuvable." },
        { status: 404 }
      );
    }

    if (task.case.agentId !== agentId) {
      return Response.json(
        { error: "Cette tâche n'appartient pas à un dossier qui vous est assigné." },
        { status: 403 }
      );
    }

    const updateData: Prisma.ImmigrationTaskUpdateInput = {};
    const auditMeta: Record<string, unknown> = {};

    if (desiredStatus) {
      const next = desiredStatus as ImmigrationTaskStatus;
      const previous = task.status;
      updateData.status = next;
      auditMeta.fromStatus = previous;
      auditMeta.toStatus = next;

      if (next === "Done") {
        // Marking as done: stamp the completion time (overwrite if already set).
        updateData.completedAt = new Date();
      } else if (previous === "Done" && next !== "Done") {
        // Reopening a previously completed task: clear the stamp.
        updateData.completedAt = null;
      }
    }

    if (desiredTitle !== undefined) {
      updateData.title = desiredTitle;
      auditMeta.title = desiredTitle;
    }

    if (desiredDescription !== undefined) {
      updateData.description = desiredDescription;
    }

    if (desiredDueDate !== undefined) {
      updateData.dueDate = desiredDueDate;
    }

    if (desiredOrder !== undefined) {
      updateData.order = desiredOrder;
    }

    const updated = await db.immigrationTask.update({
      where: { id },
      data: updateData,
    });

    await audit({
      actorId: agentId,
      action: "agent.task.update",
      targetType: "ImmigrationTask",
      targetId: id,
      metadata: auditMeta,
      req,
    });

    return Response.json({ task: updated }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/agent/tasks/[id]
 *
 * Removes a task from the case checklist. The parent case must be owned by
 * the requesting agent.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await getAgentId();
    const { id } = await params;

    const task = await db.immigrationTask.findUnique({
      where: { id },
      include: { case: { select: { agentId: true } } },
    });

    if (!task) {
      return Response.json(
        { error: "Tâche introuvable." },
        { status: 404 }
      );
    }

    if (task.case.agentId !== agentId) {
      return Response.json(
        { error: "Cette tâche n'appartient pas à un dossier qui vous est assigné." },
        { status: 403 }
      );
    }

    await db.immigrationTask.delete({ where: { id } });

    await audit({
      actorId: agentId,
      action: "agent.task.delete",
      targetType: "ImmigrationTask",
      targetId: id,
      metadata: { caseId: task.caseId, title: task.title },
      req,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
