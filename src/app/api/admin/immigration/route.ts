import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { ImmigrationCaseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * Admin immigration API (LOT 7 — Task 7-c).
 *
 * All endpoints here are admin-only. They let the back-office:
 *   - list ALL immigration cases (with filters)
 *   - create a new case (assign to a candidate, optionally to an agent)
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
 * GET /api/admin/immigration
 *
 * Lists all immigration cases across the platform (admin back-office).
 *
 * Query params:
 *  - status:   filter by ImmigrationCaseStatus
 *  - agentId:  filter by assigned agent id (use "unassigned" for null agentId)
 *  - q:        search on candidate firstName / lastName / email (substring)
 *  - page:     1-based page number (default 1)
 *  - pageSize: items per page (default 20, max 100)
 *
 * Response: { cases, total, page, pageSize }
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
    const statusParam = searchParams.get("status");
    const agentIdParam = searchParams.get("agentId");
    const qParam = searchParams.get("q")?.trim() ?? "";

    const page = parsePage(searchParams.get("page"));
    const pageSize = parsePageSize(searchParams.get("pageSize"));

    const status =
      statusParam && CASE_STATUS_SET.has(statusParam)
        ? (statusParam as ImmigrationCaseStatus)
        : undefined;

    const filters: Prisma.ImmigrationCaseWhereInput[] = [];
    if (status) filters.push({ status });
    if (agentIdParam) {
      if (agentIdParam === "unassigned") {
        filters.push({ agentId: null });
      } else {
        filters.push({ agentId: agentIdParam });
      }
    }
    if (qParam.length > 0) {
      filters.push({
        OR: [
          { candidate: { firstName: { contains: qParam } } },
          { candidate: { lastName: { contains: qParam } } },
          { candidate: { email: { contains: qParam } } },
        ],
      });
    }

    const where: Prisma.ImmigrationCaseWhereInput = { AND: filters };

    const [cases, total] = await Promise.all([
      db.immigrationCase.findMany({
        where,
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          agent: {
            select: { id: true, firstName: true, lastName: true },
          },
          company: { select: { id: true, legalName: true } },
          jobOffer: { select: { id: true, title: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { openedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.immigrationCase.count({ where }),
    ]);

    return Response.json({ cases, total, page, pageSize });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la récupération des dossiers." },
      { status: 500 }
    );
  }
}

interface CreateCaseBody {
  candidateId?: unknown;
  agentId?: unknown;
  companyId?: unknown;
  jobOfferId?: unknown;
  priority?: unknown;
  notes?: unknown;
}

/**
 * POST /api/admin/immigration
 *
 * Creates a new immigration case. Admin assigns a candidate (required) and
 * may optionally attach an agent, company, job offer, priority and notes.
 *
 * Body: { candidateId, agentId?, companyId?, jobOfferId?, priority?, notes? }
 *
 * Validation:
 *  - candidateId is required and must point to an existing User with role Candidate.
 *  - If agentId is provided, it must point to an existing User with role
 *    RecruitmentAgent or ImmigrationAgent.
 *  - priority (if provided) must be one of Normal|Haute|Urgente.
 *
 * The case is created with status "Open" and openedAt = now.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    let body: CreateCaseBody;
    try {
      body = (await req.json()) as CreateCaseBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const candidateId =
      typeof body.candidateId === "string" && body.candidateId.trim().length > 0
        ? body.candidateId.trim()
        : "";
    if (!candidateId) {
      return Response.json(
        { error: "Le candidat est requis." },
        { status: 400 }
      );
    }

    const candidate = await db.user.findUnique({
      where: { id: candidateId },
      select: { id: true, role: true },
    });
    if (!candidate || candidate.role !== "Candidate") {
      return Response.json(
        { error: "Candidat introuvable ou rôle invalide." },
        { status: 400 }
      );
    }

    // Optional agent assignment — validate role if provided.
    let agentId: string | null = null;
    if (typeof body.agentId === "string" && body.agentId.trim().length > 0) {
      const aid = body.agentId.trim();
      const agent = await db.user.findUnique({
        where: { id: aid },
        select: { id: true, role: true },
      });
      if (!agent || !AGENT_ROLES_SET.has(agent.role)) {
        return Response.json(
          { error: "Agent introuvable ou rôle invalide." },
          { status: 400 }
        );
      }
      agentId = aid;
    }

    // Optional company / job offer references.
    let companyId: string | null = null;
    if (typeof body.companyId === "string" && body.companyId.trim().length > 0) {
      companyId = body.companyId.trim();
    }
    let jobOfferId: string | null = null;
    if (typeof body.jobOfferId === "string" && body.jobOfferId.trim().length > 0) {
      jobOfferId = body.jobOfferId.trim();
    }

    // Priority (default Normal).
    const priority =
      typeof body.priority === "string" && PRIORITY_SET.has(body.priority)
        ? body.priority
        : "Normal";

    const notes =
      typeof body.notes === "string" && body.notes.trim().length > 0
        ? body.notes.trim()
        : null;

    const created = await db.immigrationCase.create({
      data: {
        candidateId,
        agentId,
        companyId,
        jobOfferId,
        priority,
        notes,
        status: ImmigrationCaseStatus.Open,
        openedAt: new Date(),
      },
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
      action: "admin.case.create",
      targetType: "ImmigrationCase",
      targetId: created.id,
      metadata: {
        candidateId,
        agentId,
        companyId,
        jobOfferId,
        priority,
      },
      req,
    });

    return Response.json({ case: created }, { status: 201 });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la création du dossier." },
      { status: 500 }
    );
  }
}
