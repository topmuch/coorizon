import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * Candidat — suivi de visionnage (COORIZON — Task "videos").
 *
 * PUT /api/candidate/videos/[id]/track
 *
 * Body: { watchTime, progressPct, completed? }
 *
 * - Upsert la ligne VideoView (clé unique [videoId, candidateId]).
 * - Si progressPct >= 80, force completed = true.
 * - Met à jour lastWatchedAt = now.
 * - Vérifie que la vidéo est bien assignée au candidat (sinon 403).
 */

function clampInt(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const { id: videoId } = await params;
    const candidateId = session.user.id;

    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const watchTime = clampInt(body.watchTime, 0, 24 * 60 * 60);
    const progressPct = clampInt(body.progressPct, 0, 100);
    if (watchTime === null || progressPct === null) {
      return Response.json(
        { error: "watchTime et progressPct doivent être des entiers valides." },
        { status: 400 }
      );
    }

    // Vérifie que la vidéo existe et est assignée au candidat.
    const video = await db.videoResource.findUnique({
      where: { id: videoId },
      select: { id: true, isPublished: true },
    });
    if (!video || !video.isPublished) {
      return Response.json(
        { error: "Vidéo introuvable." },
        { status: 404 }
      );
    }

    // Calcul des conditions d'assignation (identique au GET /candidate/videos).
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

    const matchingAssignment = await db.videoAssignment.findFirst({
      where: { videoId, OR: assignmentConditions },
      select: { id: true },
    });
    if (!matchingAssignment) {
      return Response.json(
        { error: "Cette vidéo ne vous est pas assignée." },
        { status: 403 }
      );
    }

    // completed : si >= 80% on force true, sinon on respecte la valeur transmise
    // (ou l'état existant via l'upsert).
    const forceCompleted = progressPct >= 80;
    const explicitCompleted =
      body.completed === undefined ? null : Boolean(body.completed);
    const completed = forceCompleted || (explicitCompleted ?? false);

    // Prisma ne supporte pas `max` sur les entiers — on lit d'abord la valeur
    // existante pour ne jamais régresser la progression.
    const existing = await db.videoView.findUnique({
      where: { videoId_candidateId: { videoId, candidateId } },
      select: { watchTime: true, progressPct: true, completed: true },
    });
    const newWatchTime = Math.max(existing?.watchTime ?? 0, watchTime);
    const newProgressPct = Math.max(existing?.progressPct ?? 0, progressPct);
    const finalCompleted = completed || (existing?.completed ?? false);

    const view = await db.videoView.upsert({
      where: {
        videoId_candidateId: { videoId, candidateId },
      },
      create: {
        videoId,
        candidateId,
        watchTime: newWatchTime,
        progressPct: newProgressPct,
        completed: finalCompleted,
        lastWatchedAt: new Date(),
      },
      update: {
        watchTime: newWatchTime,
        progressPct: newProgressPct,
        completed: finalCompleted,
        lastWatchedAt: new Date(),
      },
    });

    return Response.json({ view });
  } catch (error) {
    return authErrorResponse(error);
  }
}
