import { NextRequest } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import {
  getPlatformSettings,
  updatePlatformSettings,
  type SmtpConfig,
} from "@/lib/platform-settings";
import { audit } from "@/lib/auth/audit";
import {
  getActiveSmtpConfig,
  isSmtpConfigured,
  buildFromLine,
  emailWrap,
} from "@/lib/email";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";

/**
 * GET /api/admin/settings/smtp
 *
 * Returns the SMTP configuration stored in the platform settings.
 * The password is never returned in clear: only `hasPassword` is exposed.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const settings = await getPlatformSettings();
    const { password, ...safe } = settings.smtp;
    return Response.json({
      smtp: { ...safe, hasPassword: Boolean(password) },
      active: isSmtpConfigured(await getActiveSmtpConfig()),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/settings/smtp
 *
 * Save the SMTP configuration edited from the SuperAdmin settings.
 * When `password` is omitted or empty, the stored password is preserved
 * (so the admin can edit other fields without re-typing the secret).
 *
 * Body: Partial<SmtpConfig> (+ optional hasPassword placeholder ignored)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<SmtpConfig> & {
      hasPassword?: boolean;
    };
    const current = await getPlatformSettings();

    const str = (v: unknown): string | undefined =>
      typeof v === "string" ? v.trim() : undefined;

    const port =
      typeof body.port === "number" &&
      Number.isFinite(body.port) &&
      body.port > 0 &&
      body.port <= 65535
        ? Math.round(body.port)
        : undefined;

    const nextSmtp: SmtpConfig = {
      host: str(body.host) ?? current.smtp.host,
      port: port ?? current.smtp.port,
      secure: typeof body.secure === "boolean" ? body.secure : current.smtp.secure,
      username: str(body.username) ?? current.smtp.username,
      // Empty password = keep the existing one.
      password:
        typeof body.password === "string" && body.password.length > 0
          ? body.password
          : current.smtp.password,
      fromName: str(body.fromName) ?? current.smtp.fromName,
      fromEmail: str(body.fromEmail) ?? current.smtp.fromEmail,
    };

    const next = await updatePlatformSettings({ smtp: nextSmtp });

    await audit({
      actorId: session.user.id,
      action: "admin.settings.smtp",
      targetType: "PlatformSettings",
      metadata: {
        host: next.smtp.host,
        port: next.smtp.port,
        secure: next.smtp.secure,
        username: next.smtp.username,
        fromEmail: next.smtp.fromEmail,
      },
      req,
    });

    const { password, ...safe } = next.smtp;
    return Response.json({
      smtp: { ...safe, hasPassword: Boolean(password) },
      active: isSmtpConfigured(next.smtp),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/admin/settings/smtp
 *
 * Send a test email using the saved SMTP configuration (falls back to the
 * legacy env config when no host is stored in the settings). The attempt is
 * recorded in the EmailLog journal either way.
 *
 * Body: { to: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { to?: unknown };
    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return Response.json({ error: "Adresse email de test invalide." }, { status: 400 });
    }

    const cfg = await getActiveSmtpConfig();
    if (!isSmtpConfigured(cfg)) {
      return Response.json(
        {
          error:
            "Aucun serveur SMTP configuré. Renseignez l'hôte, le port et les identifiants, puis enregistrez avant de tester.",
        },
        { status: 400 }
      );
    }

    const subject = "COORIZON — Test de configuration SMTP";
    const text = emailWrap("Test SMTP", [
      "Ceci est un email de test envoyé depuis les paramètres SuperAdmin.",
      `Serveur : ${cfg.host}:${cfg.port} (${cfg.secure ? "TLS implicite" : "STARTTLS"})`,
      `Expéditeur : ${buildFromLine(cfg)}`,
      "Si vous recevez cet email, votre configuration SMTP fonctionne.",
    ]);

    let error: string | undefined;
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
      await transport.sendMail({ from: buildFromLine(cfg), to, subject, text });
    } catch (e) {
      error = e instanceof Error ? e.message : "Échec de l'envoi SMTP.";
    }

    await db.emailLog
      .create({
        data: {
          toEmail: to,
          subject,
          body: text,
          template: "account",
          status: error ? "Failed" : "Sent",
          provider: "smtp",
          error: error ?? null,
          userId: session.user.id,
        },
      })
      .catch(() => {});

    if (error) {
      return Response.json({ ok: false, error }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
