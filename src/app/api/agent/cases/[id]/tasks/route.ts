import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/auth/session";
import { getAgentId } from "@/lib/auth/agent";
import { audit } from "@/lib/auth/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agent/cases/[id]/tasks
 *
 * Returns the ordered task checklist of a case. The case must be owned by the
 * requesting agent. (Tasks are also embedded in the case GET response, but
 * this route allows re-fetching just the checklist after a mutation.)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await getAgentId();
    const { id } = await params;

    const immigrationCase = await db.immigrationCase.findUnique({
      where: { id },
      select: { id: true, agentId: true },
    });

    if (!immigrationCase) {
      return Response.json(
        { error: "Dossier introuvable." },
        { status: 404 }
      );
    }

    if (immigrationCase.agentId !== agentId) {
      return Response.json(
        { error: "Ce dossier ne vous est pas assigné." },
        { status: 403 }
      );
    }

    const tasks = await db.immigrationTask.findMany({
      where: { caseId: id },
      orderBy: { order: "asc" },
    });

    return Response.json({ tasks });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface CreateTaskBody {
  title?: unknown;
  description?: unknown;
  dueDate?: unknown;
  order?: unknown;
}

/**
 * POST /api/agent/cases/[id]/tasks
 *
 * Creates a new task on the case checklist. The new task starts with status
 * `Todo` and is assigned to the current agent.
 *
 * Body: { title, description?, dueDate?, order? }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await getAgentId();
    const { id } = await params;

    let body: CreateTaskBody;
    try {
      body = (await req.json()) as CreateTaskBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    if (title.length === 0) {
      return Response.json(
        { error: "Le titre de la tâche est requis." },
        { status: 400 }
      );
    }

    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;

    let dueDate: Date | null = null;
    if (typeof body.dueDate === "string" && body.dueDate.trim().length > 0) {
      const parsed = new Date(body.dueDate);
      if (Number.isNaN(parsed.getTime())) {
        return Response.json(
          { error: "Date d'échéance invalide." },
          { status: 400 }
        );
      }
      dueDate = parsed;
    }

    let order = 0;
    if (typeof body.order === "number" && Number.isFinite(body.order)) {
      order = Math.trunc(body.order);
    }

    const immigrationCase = await db.immigrationCase.findUnique({
      where: { id },
      select: { id: true, agentId: true },
    });

    if (!immigrationCase) {
      return Response.json(
        { error: "Dossier introuvable." },
        { status: 404 }
      );
    }

    if (immigrationCase.agentId !== agentId) {
      return Response.json(
        { error: "Ce dossier ne vous est pas assigné." },
        { status: 403 }
      );
    }

    const task = await db.immigrationTask.create({
      data: {
        caseId: id,
        title,
        description,
        dueDate,
        order,
        status: "Todo",
        assigneeId: agentId,
      },
    });

    await audit({
      actorId: agentId,
      action: "agent.task.create",
      targetType: "ImmigrationTask",
      targetId: task.id,
      metadata: { caseId: id, title },
      req,
    });

    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
