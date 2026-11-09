import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * Candidat — vidéothèque (COORIZON — Task "videos").
 *
 * GET /api/candidate/videos
 *
 * Liste les vidéos assignées au candidat connecté. Une vidéo est visible si
 * elle possède au moins une assignation qui correspond à l'un de ces critères:
 *  - targetType = "all"
 *  - targetType = "candidate" AND targetId = session.user.id
 *  - targetType = "level"     AND targetId = niveau italien du candidat
 *  - targetType = "course"    AND targetId ∈ formations auxquelles le candidat est inscrit
 *
 * Chaque vidéo retournée embarque la `VideoView` du candidat (ou null).
 */

type VideoType = "youtube" | "mp4" | "vimeo";
type VideoCategory =
  | "formation"
  | "tutoriel"
  | "accueil"
  | "personnalise"
  | "autre";

interface CandidateVideoView {
  id: string;
  watchTime: number;
  progressPct: number;
  completed: boolean;
  lastWatchedAt: string;
}

interface CandidateVideo {
  id: string;
  title: string;
  description: string | null;
  type: VideoType;
  url: string;
  embedId: string | null;
  category: VideoCategory;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string;
  view: CandidateVideoView | null;
}

export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;

    // Récupère le profil candidat (niveau italien) + inscriptions actives.
    const [profile, enrollments] = await Promise.all([
      db.candidateProfile.findUnique({
        where: { userId: candidateId },
        select: { italianLevel: true },
      }),
      db.enrollment.findMany({
        where: {
          candidateId,
          status: { in: ["Active", "Completed", "Paused"] },
        },
        select: { courseId: true },
      }),
    ]);

    const italianLevel = profile?.italianLevel ?? null;
    const courseIds = enrollments.map((e) => e.courseId);

    // Construit les conditions d'assignation applicables à ce candidat.
    const assignmentConditions: {
      targetType: string;
      targetId?: string | null;
    }[] = [{ targetType: "all" }, { targetType: "candidate", targetId: candidateId }];

    if (italianLevel) {
      assignmentConditions.push({ targetType: "level", targetId: italianLevel });
    }
    for (const courseId of courseIds) {
      assignmentConditions.push({ targetType: "course", targetId: courseId });
    }

    // Trouve les assignations correspondantes.
    const assignments = await db.videoAssignment.findMany({
      where: {
        OR: assignmentConditions,
      },
      select: { videoId: true },
    });
    const videoIds = Array.from(new Set(assignments.map((a) => a.videoId)));

    if (videoIds.length === 0) {
      return Response.json({ videos: [] });
    }

    // Récupère les vidéos publiées correspondantes + la vue du candidat.
    const videos = await db.videoResource.findMany({
      where: {
        id: { in: videoIds },
        isPublished: true,
      },
      include: {
        views: {
          where: { candidateId },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result: CandidateVideo[] = videos.map((v) => {
      const viewRow = v.views[0];
      const view: CandidateVideoView | null = viewRow
        ? {
            id: viewRow.id,
            watchTime: viewRow.watchTime,
            progressPct: viewRow.progressPct,
            completed: viewRow.completed,
            lastWatchedAt: viewRow.lastWatchedAt.toISOString(),
          }
        : null;
      return {
        id: v.id,
        title: v.title,
        description: v.description,
        type: v.type as VideoType,
        url: v.url,
        embedId: v.embedId,
        category: v.category as VideoCategory,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        createdAt: v.createdAt.toISOString(),
        view,
      };
    });

    return Response.json({ videos: result });
  } catch (error) {
    return authErrorResponse(error);
  }
}
