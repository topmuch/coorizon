import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import {
  getPlatformSettings,
  type NotificationConfig,
} from "@/lib/platform-settings";

/**
 * Email notification service for COORIZON.
 *
 * Every email attempt is recorded in the EmailLog table so the SuperAdmin can
 * audit what was sent (see the "Emails & notifications" settings card).
 *
 * Delivery:
 *  - If SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS environment variables
 *    are configured, emails are actually delivered through nodemailer.
 *  - Otherwise the email is recorded with provider "log" (simulated sending)
 *    so the flow stays testable without SMTP credentials.
 *
 * Sending is non-blocking and never throws: notification failures must not
 * break the main operation (registration, payment, messaging…).
 */

export type EmailTemplate =
  | "registration"
  | "payment"
  | "message"
  | "account"
  | "forfait";

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  template: EmailTemplate;
  userId?: string | null;
}

interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  provider?: "smtp" | "log";
}

/** Template → notification switch that controls it. */
const TEMPLATE_SWITCH: Record<EmailTemplate, keyof NotificationConfig> = {
  registration: "emailRegistration",
  payment: "emailPayment",
  message: "emailMessages",
  account: "emailEnabled",
  forfait: "emailPayment",
};

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

async function deliver(input: SendEmailInput): Promise<{ provider: "smtp" | "log"; error?: string }> {
  if (!smtpConfigured()) {
    // No SMTP credentials: simulated sending (recorded in the journal).
    return { provider: "log" };
  }
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "COORIZON <no-reply@coorizon.com>",
      to: input.to,
      subject: input.subject,
      text: input.body,
    });
    return { provider: "smtp" };
  } catch (e) {
    return {
      provider: "smtp",
      error: e instanceof Error ? e.message : "Échec de l'envoi SMTP.",
    };
  }
}

/**
 * Send a notification email (if the corresponding switch is enabled in the
 * platform settings) and record it in the EmailLog journal.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const settings = await getPlatformSettings();
    const notif = settings.notifications;

    const templateSwitch = TEMPLATE_SWITCH[input.template];
    const enabled =
      notif.emailEnabled && Boolean(notif[templateSwitch] as boolean);
    if (!enabled) {
      await db.emailLog
        .create({
          data: {
            toEmail: input.to,
            subject: input.subject,
            body: input.body,
            template: input.template,
            status: "Skipped",
            provider: "log",
            userId: input.userId ?? null,
          },
        })
        .catch(() => {});
      return { ok: false, skipped: true };
    }

    const { provider, error } = await deliver(input);
    await db.emailLog
      .create({
        data: {
          toEmail: input.to,
          subject: input.subject,
          body: input.body,
          template: input.template,
          status: error ? "Failed" : "Sent",
          provider,
          error: error ?? null,
          userId: input.userId ?? null,
        },
      })
      .catch(() => {});
    return { ok: !error, provider };
  } catch {
    // Email notifications must never break the main flow.
    return { ok: false };
  }
}

/** Simple HTML-stripped text wrapper so emails stay readable. */
export function emailWrap(title: string, lines: string[]): string {
  return [
    `COORIZON — ${title}`,
    "",
    ...lines,
    "",
    "— L'équipe COORIZON",
    "Plateforme de recrutement international, formation en italien & accompagnement à l'immigration.",
  ].join("\n");
}

/**
 * Send an administrative alert email to the configured alert recipient (if
 * any) plus every Admin / SuperAdmin account email.
 */
export async function sendAdminAlert(
  subject: string,
  body: string,
  template: EmailTemplate
): Promise<void> {
  try {
    const settings = await getPlatformSettings();
    if (!settings.notifications.adminAlerts) return;

    const admins = await db.user.findMany({
      where: { role: { in: ["Admin", "SuperAdmin"] }, isActive: true },
      select: { email: true },
    });

    const recipients = new Set<string>();
    if (settings.notifications.alertRecipient) {
      recipients.add(settings.notifications.alertRecipient);
    }
    for (const a of admins) recipients.add(a.email);

    await Promise.all(
      Array.from(recipients).map((to) =>
        sendEmail({ to, subject, body, template })
      )
    );
  } catch {
    // Never break the main flow.
  }
}
