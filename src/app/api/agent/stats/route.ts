import { NextRequest } from "next/server";
import { ImmigrationCaseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/auth/session";
import { getAgentId } from "@/lib/auth/agent";

/**
 * GET /api/agent/stats
 *
 * Aggregated dashboard metrics for the authenticated agent
 * (RecruitmentAgent or ImmigrationAgent).
 *
 * Every query is scoped to the agent's own assigned immigration cases —
 * an agent never sees another agent's cases or tasks.
 *
 * Response shape:
 * {
 *   totalCases: number,
 *   activeCases: number,         // Open + InProgress + DocumentsPending + VisaPending
 *   casesByStatus: Record<ImmigrationCaseStatus, number>,
 *   tasksTodo: number,
 *   tasksInProgress: number,
 *   tasksBlocked: number,
 *   upcomingDeadlines: number,   // Todo/InProgress tasks due within 7 days
 *   overdueTasks: number,        // non-Done tasks past their due date
 *   closedCases: number
 * }
 */
export async function GET(_req: NextRequest): Promise<Response> {
  let agentId: string;
  try {
    const ctx = await getAgentId();
    agentId = ctx.agentId;
  } catch (error) {
    return authErrorResponse(error);
  }

  // Statuts considérés comme "actifs" pour un dossier.
  const activeStatuses: ImmigrationCaseStatus[] = [
    ImmigrationCaseStatus.Open,
    ImmigrationCaseStatus.InProgress,
    ImmigrationCaseStatus.DocumentsPending,
    ImmigrationCaseStatus.VisaPending,
  ];

  // Tous les statuts de dossier, pour garantir une map complète
  // (même les statuts à zéro dossier sont présents).
  const allCaseStatuses: ImmigrationCaseStatus[] = [
    ImmigrationCaseStatus.Open,
    ImmigrationCaseStatus.InProgress,
    ImmigrationCaseStatus.DocumentsPending,
    ImmigrationCaseStatus.VisaPending,
    ImmigrationCaseStatus.Ready,
    ImmigrationCaseStatus.Closed,
    ImmigrationCaseStatus.OnHold,
  ];

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalCases,
    activeCases,
    casesByStatusRaw,
    tasksTodo,
    tasksInProgress,
    tasksBlocked,
    upcomingDeadlines,
    overdueTasks,
    closedCases,
  ] = await Promise.all([
    db.immigrationCase.count({ where: { agentId } }),
    db.immigrationCase.count({
      where: { agentId, status: { in: activeStatuses } },
    }),
    db.immigrationCase.groupBy({
      by: ["status"],
      where: { agentId },
      _count: true,
    }),
    db.immigrationTask.count({
      where: { case: { agentId }, status: "Todo" },
    }),
    db.immigrationTask.count({
      where: { case: { agentId }, status: "InProgress" },
    }),
    db.immigrationTask.count({
      where: { case: { agentId }, status: "Blocked" },
    }),
    db.immigrationTask.count({
      where: {
        case: { agentId },
        status: { in: ["Todo", "InProgress"] },
        dueDate: { gte: now, lte: sevenDaysFromNow },
      },
    }),
    db.immigrationTask.count({
      where: {
        case: { agentId },
        status: { not: "Done" },
        dueDate: { lt: now },
      },
    }),
    db.immigrationCase.count({
      where: { agentId, status: ImmigrationCaseStatus.Closed },
    }),
  ]);

  // Transforme le résultat de groupBy en map complète { Open: N, ... }.
  const casesByStatus = allCaseStatuses.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<ImmigrationCaseStatus, number>
  );
  for (const row of casesByStatusRaw) {
    casesByStatus[row.status] = row._count;
  }

  return Response.json({
    totalCases,
    activeCases,
    casesByStatus,
    tasksTodo,
    tasksInProgress,
    tasksBlocked,
    upcomingDeadlines,
    overdueTasks,
    closedCases,
  });
}
