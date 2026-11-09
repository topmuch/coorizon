import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin, ROLES } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const role = session.user.role;

    let contacts: { id: string; firstName: string | null; lastName: string | null; email: string; role: string }[] = [];

    if (isAdmin(role)) {
      contacts = await db.user.findMany({
        where: { id: { not: userId }, isActive: true, status: "Active" },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
        take: 200, orderBy: { firstName: "asc" },
      });
    } else if (role === ROLES.Candidate) {
      const agents = await db.user.findMany({ where: { immigrationCasesAsAgent: { some: { candidateId: userId } }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      const admins = await db.user.findMany({ where: { role: { in: ["Admin", "SuperAdmin"] }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      const recruiters = await db.user.findMany({ where: { jobOffers: { some: { applications: { some: { candidateId: userId } } } }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      const trainers = await db.user.findMany({ where: { coursesCreated: { some: { enrollments: { some: { candidateId: userId } } } }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      contacts = [...admins, ...agents, ...recruiters, ...trainers];
    } else if (role === ROLES.Recruiter) {
      const candidates = await db.user.findMany({ where: { applications: { some: { jobOffer: { company: { recruiters: { some: { userId } } } } } }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      const admins = await db.user.findMany({ where: { role: { in: ["Admin", "SuperAdmin"] }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      contacts = [...candidates, ...admins];
    } else if (role === ROLES.Trainer) {
      const learners = await db.user.findMany({ where: { enrollments: { some: { course: { trainerId: userId } } }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      const admins = await db.user.findMany({ where: { role: { in: ["Admin", "SuperAdmin"] }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      contacts = [...learners, ...admins];
    } else if (role === ROLES.RecruitmentAgent || role === ROLES.ImmigrationAgent) {
      const candidates = await db.user.findMany({ where: { immigrationCasesAsCandidate: { some: { agentId: userId } }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      const admins = await db.user.findMany({ where: { role: { in: ["Admin", "SuperAdmin"] }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
      contacts = [...candidates, ...admins];
    }

    const seen = new Set<string>();
    contacts = contacts.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    return Response.json({ contacts });
  } catch (e) { return authErrorResponse(e); }
}
