import { NextRequest } from "next/server";
import { ImmigrationCaseStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/auth/session";
import { getAgentId } from "@/lib/auth/agent";

/**
 * GET /api/agent/cases
 *
 * Lists the immigration cases assigned to the authenticated agent.
 * An agent only ever sees cases where `agentId === session.user.id`.
 *
 * Query params:
 *  - status: filter by ImmigrationCaseStatus
 *  - q: search on candidate firstName / lastName / email (substring)
 *  - page: 1-based page number (default 1)
 *  - pageSize: items per page (default 20, capped at 100)
 *
 * Response shape:
 * {
 *   cases: Array<{
 *     id, status, priority, notes, openedAt, closedAt, createdAt, updatedAt,
 *     candidateId, companyId, jobOfferId,
 *     candidate: { id, firstName, lastName, email,
 *                  candidateProfile: { nationality, city, desiredJob } | null },
 *     company: { legalName, city } | null,
 *     jobOffer: { title, city } | null,
 *     taskProgress: { done: number, total: number }
 *   }>,
 *   total: number,
 *   page: number,
 *   pageSize: number
 * }
 */
export async function GET(req: NextRequest): Promise<Response> {
  let agentId: string;
  try {
    const ctx = await getAgentId();
    agentId = ctx.agentId;
  } catch (error) {
    return authErrorResponse(error);
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const qParam = searchParams.get("q");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");

  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(pageSizeParam) || 20));

  // Validate status filter if provided.
  const ALLOWED_STATUSES: ImmigrationCaseStatus[] = [
    ImmigrationCaseStatus.Open,
    ImmigrationCaseStatus.InProgress,
    ImmigrationCaseStatus.DocumentsPending,
    ImmigrationCaseStatus.VisaPending,
    ImmigrationCaseStatus.Ready,
    ImmigrationCaseStatus.Closed,
    ImmigrationCaseStatus.OnHold,
  ];
  const status =
    statusParam && ALLOWED_STATUSES.includes(statusParam as ImmigrationCaseStatus)
      ? (statusParam as ImmigrationCaseStatus)
      : undefined;

  const q =
    typeof qParam === "string" && qParam.trim().length > 0
      ? qParam.trim()
      : undefined;

  // Build the where clause, always scoped to the agent's own cases.
  const where: Prisma.ImmigrationCaseWhereInput = { agentId };
  if (status) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { candidate: { firstName: { contains: q } } },
      { candidate: { lastName: { contains: q } } },
      { candidate: { email: { contains: q } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.immigrationCase.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            candidateProfile: {
              select: { nationality: true, city: true, desiredJob: true },
            },
          },
        },
        company: { select: { legalName: true, city: true } },
        jobOffer: { select: { title: true, city: true } },
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.immigrationCase.count({ where }),
  ]);

  // Compute task progress per case in JS from the included tasks.
  const cases = rows.map(({ tasks, ...rest }) => {
    const done = tasks.filter((t) => t.status === "Done").length;
    return {
      ...rest,
      taskProgress: { done, total: tasks.length },
    };
  });

  return Response.json({ cases, total, page, pageSize });
}
