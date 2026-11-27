import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

/**
 * Create an in-app notification for a user. Non-blocking: failures are
 * swallowed so they never break the main operation.
 *
 * In LOT 8, this is the single entry point for all notifications. Later
 * lots can extend it to also send emails / WhatsApp when those services
 * are configured (N8N webhooks, etc.).
 */
export async function notify({
  userId,
  type = "Info",
  title,
  message,
  link,
}: {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link ?? null,
      },
    });
  } catch {
    // Notification creation must never break the main flow.
  }
}

/**
 * Notify multiple users at once (e.g. all admins when a new company
 * registration needs validation).
 */
export async function notifyMany({
  userIds,
  type = "Info",
  title,
  message,
  link,
}: {
  userIds: string[];
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  await Promise.all(
    userIds.map((userId) => notify({ userId, type, title, message, link }))
  );
}

/**
 * Create an in-app visual notification for every active Admin / SuperAdmin.
 * Respects the platform "adminAlerts" switch. Used for registration and
 * payment events so the back-office tabs (Utilisateurs, Entreprises,
 * Forfait…) display a badge until the admin opens the section.
 */
export async function notifyAdmins({
  type = "Info",
  title,
  message,
  link,
}: {
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const { getPlatformSettings } = await import("@/lib/platform-settings");
    const settings = await getPlatformSettings();
    if (!settings.notifications.adminAlerts) return;

    const admins = await db.user.findMany({
      where: { role: { in: ["Admin", "SuperAdmin"] }, isActive: true },
      select: { id: true },
    });
    await notifyMany({ userIds: admins.map((a) => a.id), type, title, message, link });
  } catch {
    // Notification creation must never break the main flow.
  }
}
