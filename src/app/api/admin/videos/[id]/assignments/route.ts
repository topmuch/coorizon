import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";
import { ROLES } from "@/lib/permissions";

/**
 * Admin vidéothèque — assignations d'une vidéo (COORIZON — Task "videos").
 *
 * Endpoints:
 *  - GET    /api/admin/videos/[id]/assignments    → liste les assignations
 *  - POST   /api/admin/videos/[id]/assignments    → crée une assignation (upsert)
 *  - DELETE /api/admin/videos/[id]/assignments    → supprime une assignation
 */

const VALID_TARGET_TYPES = new Set(["candidate", "course", "level", "all"]);
const VALID_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

/**
 * GET /api/admin/videos/[id]/assignments — liste les assignations d'une vidéo.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }
    const { id } = await params;

    const assignments = await db.videoAssignment.findMany({
      where: { videoId: id },
      include: {
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ assignments });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/admin/videos/[id]/assignments — crée une assignation (upsert).
 * Body: { targetType, targetId? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }
    const { id: videoId } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const targetType: string = String(body.targetType ?? "");
    const targetIdRaw: string | null =
      body.targetId === null || body.targetId === undefined
        ? null
        : String(body.targetId).trim() || null;

    if (!VALID_TARGET_TYPES.has(targetType)) {
      return Response.json(
        { error: "Type de cible invalide." },
        { status: 400 }
      );
    }

    // Validate the video exists.
    const video = await db.videoResource.findUnique({ where: { id: videoId } });
    if (!video) {
      return Response.json(
        { error: "Vidéo introuvable." },
        { status: 404 }
      );
    }

    let targetId: string | null = targetIdRaw;

    if (targetType === "all") {
      targetId = null;
    } else if (targetType === "candidate") {
      if (!targetId) {
        return Response.json(
          { error: "Un candidat doit être sélectionné." },
          { status: 400 }
        );
      }
      const user = await db.user.findUnique({
        where: { id: targetId },
        select: { id: true, role: true },
      });
      if (!user || user.role !== ROLES.Candidate) {
        return Response.json(
          { error: "Candidat introuvable ou utilisateur non candidat." },
          { status: 400 }
        );
      }
    } else if (targetType === "course") {
      if (!targetId) {
        return Response.json(
          { error: "Une formation doit être sélectionnée." },
          { status: 400 }
        );
      }
      const course = await db.trainingCourse.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!course) {
        return Response.json(
          { error: "Formation introuvable." },
          { status: 400 }
        );
      }
    } else if (targetType === "level") {
      if (!targetId || !VALID_LEVELS.has(targetId)) {
        return Response.json(
          { error: "Niveau invalide (A1 à C2)." },
          { status: 400 }
        );
      }
    }

    // Upsert because of @@unique([videoId, targetType, targetId]).
    const assignment = await db.videoAssignment.upsert({
      where: {
        videoId_targetType_targetId: {
          videoId,
          targetType,
          targetId,
        },
      },
      create: {
        videoId,
        targetType,
        targetId,
        assignedById: session.user.id,
      },
      update: {
        assignedById: session.user.id,
      },
    });

    await audit({
      actorId: session.user.id,
      action: "admin.video.assign",
      targetType: "VideoAssignment",
      targetId: assignment.id,
      metadata: { videoId, assignmentType: targetType, targetId },
      req,
    });

    return Response.json({ assignment }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/videos/[id]/assignments — supprime une assignation.
 * Body: { assignmentId }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }
    const { id: videoId } = await params;

    const body = await req.json().catch(() => null);
    if (!body || !body.assignmentId) {
      return Response.json(
        { error: "Identifiant d'assignation requis." },
        { status: 400 }
      );
    }
    const assignmentId = String(body.assignmentId);

    const assignment = await db.videoAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.videoId !== videoId) {
      return Response.json(
        { error: "Assignation introuvable pour cette vidéo." },
        { status: 404 }
      );
    }

    await db.videoAssignment.delete({ where: { id: assignmentId } });
    await audit({
      actorId: session.user.id,
      action: "admin.video.unassign",
      targetType: "VideoAssignment",
      targetId: assignmentId,
      metadata: { videoId, assignmentType: assignment.targetType, targetId: assignment.targetId },
      req,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
