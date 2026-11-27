import { NextRequest } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import {
  getPlatformSettings,
  updatePlatformSettings,
  DEFAULT_NOTIFICATIONS,
  type NotificationConfig,
} from "@/lib/platform-settings";
import { audit } from "@/lib/auth/audit";

/**
 * GET /api/admin/settings/notifications
 *
 * Returns the email & notification switches (SuperAdmin settings).
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }
    const settings = await getPlatformSettings();
    return Response.json({ notifications: settings.notifications, smtpConfigured: Boolean(process.env.SMTP_HOST) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/settings/notifications
 *
 * Update the email & notification switches. Admin/SuperAdmin only.
 *
 * Body: Partial<NotificationConfig>
 * Response: { notifications }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<NotificationConfig>;
    const current = await getPlatformSettings();

    const boolOrUndefined = (v: unknown): boolean | undefined =>
      typeof v === "boolean" ? v : undefined;
    const stringOrUndefined = (v: unknown): string | undefined =>
      typeof v === "string" ? v.trim() : undefined;

    const nextNotifications: NotificationConfig = {
      emailEnabled: boolOrUndefined(body.emailEnabled) ?? current.notifications.emailEnabled,
      emailRegistration:
        boolOrUndefined(body.emailRegistration) ?? current.notifications.emailRegistration,
      emailPayment: boolOrUndefined(body.emailPayment) ?? current.notifications.emailPayment,
      emailMessages: boolOrUndefined(body.emailMessages) ?? current.notifications.emailMessages,
      adminAlerts: boolOrUndefined(body.adminAlerts) ?? current.notifications.adminAlerts,
      alertRecipient:
        stringOrUndefined(body.alertRecipient) ?? current.notifications.alertRecipient,
    };

    const next = await updatePlatformSettings({ notifications: nextNotifications });

    await audit({
      actorId: session.user.id,
      action: "admin.settings.notifications",
      targetType: "PlatformSettings",
      metadata: { notifications: next.notifications },
      req,
    });

    return Response.json({ notifications: next.notifications, defaults: DEFAULT_NOTIFICATIONS });
  } catch (error) {
    return authErrorResponse(error);
  }
}
