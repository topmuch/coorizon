import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

/**
 * Single-notification API (LOT 8 — Task 8-c).
 *
 * PUT    /api/notifications/[id]  — mark a single notification as read
 *                                   (ownership enforced: 403 if not owned).
 * DELETE /api/notifications/[id]  — delete a notification (ownership enforced).
 *
 * Next.js 16: `params: Promise<{ id: string }>`.
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/notifications/[id]
 * Mark the notification as read. Returns the updated notification.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const { id } = await params;

    const notification = await db.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, isRead: true },
    });

    if (!notification) {
      return Response.json(
        { error: "Notification introuvable." },
        { status: 404 }
      );
    }

    if (notification.userId !== userId) {
      return Response.json(
        { error: "Accès refusé. Vous n'avez pas la permission d'effectuer cette action." },
        { status: 403 }
      );
    }

    // Already read — return as-is without an extra write.
    if (notification.isRead) {
      const fresh = await db.notification.findUnique({ where: { id } });
      return Response.json({ notification: fresh }, { status: 200 });
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return Response.json({ notification: updated }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification (hard delete). Ownership enforced.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const { id } = await params;

    const notification = await db.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!notification) {
      return Response.json(
        { error: "Notification introuvable." },
        { status: 404 }
      );
    }

    if (notification.userId !== userId) {
      return Response.json(
        { error: "Accès refusé. Vous n'avez pas la permission d'effectuer cette action." },
        { status: 403 }
      );
    }

    await db.notification.delete({ where: { id } });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
