import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import {
  getPlatformSettings,
  type NotificationConfig,
  type SmtpConfig,
} from "@/lib/platform-settings";

/**
 * Email notification service for COORIZON.
 *
 * Every email attempt is recorded in the EmailLog table so the SuperAdmin can
 * audit what was sent (see the "Emails & notifications" settings card).
 *
 * Delivery:
 *  - SMTP credentials are configured from the SuperAdmin settings ( Paramètres
 *    > Serveur SMTP ). They take priority over the legacy SMTP_* environment
 *    variables.
 *  - If neither is configured, the email is recorded with provider "log"
 *    (simulated sending) so the flow stays testable without SMTP credentials.
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

function envSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    username: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASS ?? "",
    fromName: "COORIZON",
    fromEmail: process.env.SMTP_FROM_EMAIL ?? "no-reply@coorizon.com",
  };
}

/** Active SMTP config: SuperAdmin settings first, env vars as legacy fallback. */
export async function getActiveSmtpConfig(): Promise<SmtpConfig> {
  try {
    const settings = await getPlatformSettings();
    if (settings.smtp.host) return settings.smtp;
  } catch {
    // Fall through to env config.
  }
  return envSmtpConfig();
}

export function isSmtpConfigured(cfg: SmtpConfig): boolean {
  return Boolean(cfg.host);
}

export async function smtpConfigured(): Promise<boolean> {
  return isSmtpConfigured(await getActiveSmtpConfig());
}

export function buildFromLine(cfg: SmtpConfig): string {
  const name = cfg.fromName || "COORIZON";
  const email = cfg.fromEmail || "no-reply@coorizon.com";
  return `${name} <${email}>`;
}

async function deliver(
  cfg: SmtpConfig,
  input: SendEmailInput
): Promise<{ provider: "smtp" | "log"; error?: string }> {
  if (!isSmtpConfigured(cfg)) {
    // No SMTP credentials: simulated sending (recorded in the journal).
    return { provider: "log" };
  }
  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port || 587,
      secure: cfg.secure,
      auth:
        cfg.username && cfg.password
          ? { user: cfg.username, pass: cfg.password }
          : undefined,
    });
    await transport.sendMail({
      from: buildFromLine(cfg),
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

    const cfg = await getActiveSmtpConfig();
    const { provider, error } = await deliver(cfg, input);
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
