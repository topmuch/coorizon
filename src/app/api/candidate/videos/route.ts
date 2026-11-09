import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== "Candidate") return Response.json({ error: "Candidat uniquement." }, { status: 403 });

    const candidateId = session.user.id;
    // Get candidate's enrolled courses + italian level
    const profile = await db.candidateProfile.findUnique({ where: { userId: candidateId }, select: { italianLevel: true } });
    const enrollments = await db.enrollment.findMany({ where: { candidateId }, select: { courseId: true } });
    const courseIds = enrollments.map(e => e.courseId);
    const italianLevel = profile?.italianLevel ?? null;

    // Get all published videos that have at least one assignment matching this candidate
    const allVideos = await db.videoResource.findMany({
      where: { isPublished: true },
      include: { assignments: true, views: { where: { candidateId }, select: { watchTime: true, progressPct: true, completed: true, lastWatchedAt: true } } },
    });

    // Filter: video is assigned if ANY assignment matches
    const assignedVideos = allVideos.filter(v => {
      return v.assignments.some(a => {
        if (a.targetType === "all") return true;
        if (a.targetType === "candidate" && a.targetId === candidateId) return true;
        if (a.targetType === "course" && courseIds.includes(a.targetId || "")) return true;
        if (a.targetType === "level" && italianLevel && a.targetId === italianLevel) return true;
        return false;
      });
    }).map(v => ({
      id: v.id, title: v.title, description: v.description, type: v.type, url: v.url,
      embedId: v.embedId, thumbnailUrl: v.thumbnailUrl, duration: v.duration, category: v.category, createdAt: v.createdAt,
      view: v.views[0] ? { watchTime: v.views[0].watchTime, progressPct: v.views[0].progressPct, completed: v.views[0].completed, lastWatchedAt: v.views[0].lastWatchedAt } : null,
    }));

    return Response.json({ videos: assignedVideos });
  } catch (e) { return authErrorResponse(e); }
}
