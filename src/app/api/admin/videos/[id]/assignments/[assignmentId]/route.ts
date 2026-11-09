import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const { assignmentId } = await params;
    await db.videoAssignment.delete({ where: { id: assignmentId } });
    await audit({ actorId: session.user.id, action: "admin.video.unassign", targetType: "VideoAssignment", targetId: assignmentId, req });
    return Response.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
