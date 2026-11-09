import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * Admin vidéothèque — statistiques (COORIZON — Task "videos").
 *
 * GET /api/admin/videos/stats
 *
 * Retourne:
 *  - totals:       { totalVideos, totalViews, totalCompletions, avgCompletionRate }
 *  - topVideos:    Top 5 vidéos les plus vues (id, title, views, completionRate)
 *  - viewsByDay:   Vues par jour (7 derniers jours): [{ date, views }]
 */

function dayKey(d: Date): string {
  // YYYY-MM-DD, en heure locale — adapté à SQLite qui stocke des ISO strings.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    // ─── Totaux ──────────────────────────────────────────────────────
    const [totalVideos, totalViews, totalCompletions] = await Promise.all([
      db.videoResource.count(),
      db.videoView.count(),
      db.videoView.count({ where: { completed: true } }),
    ]);

    const allProgressSum = await db.videoView.aggregate({
      _sum: { progressPct: true },
    });
    const avgCompletionRate =
      totalViews > 0
        ? Math.round((allProgressSum._sum.progressPct ?? 0) / totalViews)
        : 0;

    // ─── Top 5 vidéos les plus vues ──────────────────────────────────
    const topRaw = await db.videoResource.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { views: true } },
        views: {
          select: { progressPct: true, completed: true },
        },
      },
      orderBy: { views: { _count: "desc" } },
      take: 5,
    });

    const topVideos = topRaw
      .filter((v) => v._count.views > 0)
      .map((v) => {
        const views = v._count.views;
        const progressSum = v.views.reduce(
          (sum, vw) => sum + (vw.progressPct ?? 0),
          0
        );
        const completionRate =
          views > 0 ? Math.round(progressSum / views) : 0;
        return {
          id: v.id,
          title: v.title,
          views,
          completionRate,
        };
      });

    // ─── Vues par jour (7 derniers jours) ────────────────────────────
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6); // inclut aujourd'hui → 7 jours
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentViews = await db.videoView.findMany({
      where: { lastWatchedAt: { gte: sevenDaysAgo } },
      select: { lastWatchedAt: true },
    });

    // Build the 7-day bucket map.
    const buckets: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      buckets.push({ date: dayKey(d), views: 0 });
    }
    const bucketMap = new Map(buckets.map((b) => [b.date, b]));
    for (const vw of recentViews) {
      const key = dayKey(vw.lastWatchedAt);
      const bucket = bucketMap.get(key);
      if (bucket) bucket.views += 1;
    }

    return Response.json({
      totals: {
        totalVideos,
        totalViews,
        totalCompletions,
        avgCompletionRate,
      },
      topVideos,
      viewsByDay: buckets,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
