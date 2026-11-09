import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (session.user.role !== "Candidate") return Response.json({ error: "Candidat uniquement." }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const { watchTime, progressPct, completed } = body as { watchTime?: number; progressPct?: number; completed?: boolean };

    const video = await db.videoResource.findUnique({ where: { id } });
    if (!video) return Response.json({ error: "Vidéo introuvable." }, { status: 404 });

    const candidateId = session.user.id;
    const existing = await db.videoView.findUnique({ where: { videoId_candidateId: { videoId: id, candidateId } } });

    const newWatchTime = Math.max(existing?.watchTime ?? 0, watchTime ?? 0);
    const newProgress = Math.max(existing?.progressPct ?? 0, progressPct ?? 0);
    const newCompleted = completed || newProgress >= 80;

    const view = await db.videoView.upsert({
      where: { videoId_candidateId: { videoId: id, candidateId } },
      update: { watchTime: newWatchTime, progressPct: newProgress, completed: newCompleted, lastWatchedAt: new Date() },
      create: { videoId: id, candidateId, watchTime: watchTime ?? 0, progressPct: progressPct ?? 0, completed: newCompleted },
    });

    return Response.json({ view });
  } catch (e) { return authErrorResponse(e); }
}
