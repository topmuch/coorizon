import { db } from "@/lib/db";
import { requireSession } from "./session";

/**
 * Get the agent's id. Verifies the user is a RecruitmentAgent or ImmigrationAgent.
 * Used to scope all agent queries to their assigned cases.
 */
export async function getAgentId(): Promise<{ agentId: string }> {
  const session = await requireSession();
  if (session.user.role !== "RecruitmentAgent" && session.user.role !== "ImmigrationAgent") {
    const err = new Error("FORBIDDEN") as Error & { code: string; status: number };
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }
  return { agentId: session.user.id };
}
