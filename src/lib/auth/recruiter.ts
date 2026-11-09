import { db } from "@/lib/db";
import { requireSession } from "./session";

/**
 * Get the recruiter's company ID. Throws a structured error if the user is
 * not a recruiter or has no company association.
 *
 * All recruiter APIs MUST use this to scope their queries to the recruiter's
 * own company — a recruiter never accesses another company's data.
 */
export async function getRecruiterCompany(): Promise<{
  companyId: string;
  userId: string;
}> {
  const session = await requireSession();
  if (session.user.role !== "Recruiter") {
    const err = new Error("FORBIDDEN") as Error & { code: string; status: number };
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }
  const profile = await db.recruiterProfile.findUnique({
    where: { userId: session.user.id },
    select: { companyId: true },
  });
  if (!profile) {
    const err = new Error("NO_COMPANY") as Error & { code: string; status: number };
    err.code = "NO_COMPANY";
    err.status = 400;
    throw err;
  }
  return { companyId: profile.companyId, userId: session.user.id };
}
