import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });

    const totalVideos = await db.videoResource.count();
    const totalViews = await db.videoView.count();
    const totalCompletions = await db.videoView.count({ where: { completed: true } });
    const avgCompletionRate = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;

    // Top 5 most watched
    const topWatched = await db.videoResource.findMany({
      include: { _count: { select: { views: true } }, views: { where: { completed: true }, select: { id: true } } },
      orderBy: { views: { _count: "desc" } },
      take: 5,
    });
    const topVideos = topWatched.map(v => ({ id: v.id, title: v.title, views: v._count.views, completions: v.views.length, rate: v._count.views > 0 ? Math.round((v.views.length / v._count.views) * 100) : 0 }));

    // Least watched
    const leastWatched = await db.videoResource.findMany({
      include: { _count: { select: { views: true } } },
      orderBy: { views: { _count: "asc" } },
      take: 5,
    });
    const leastVideos = leastWatched.map(v => ({ id: v.id, title: v.title, views: v._count.views }));

    // Views over last 7 days
    const now = new Date();
    const dailyData: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const count = await db.videoView.count({ where: { createdAt: { gte: start, lt: end } } });
      dailyData.push({ date: start.toISOString().slice(5, 10), count });
    }

    return Response.json({ stats: { totalVideos, totalViews, totalCompletions, avgCompletionRate, topVideos, leastVideos, dailyData } });
  } catch (e) { return authErrorResponse(e); }
}
