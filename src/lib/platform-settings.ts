import { db } from "@/lib/db";
import { ALL_ROLES, ROLE_LABELS, type Role } from "@/lib/permissions";

/**
 * Platform-level settings stored in the CMSPage table (JSON content),
 * following the same pattern as the WhatsApp numbers settings.
 */

const SETTINGS_SLUG = "platform_settings";

export interface ForfaitConfig {
  name: string;
  description: string;
  amount: number;
  currency: string;
  durationLabel: string;
}

/**
 * Email & notification switches controlled from the SuperAdmin settings.
 * Every switch disables BOTH the email sending and (for adminAlerts) the
 * in-app visual notification for the corresponding event.
 */
export interface NotificationConfig {
  /** Global kill-switch for all notification emails. */
  emailEnabled: boolean;
  /** Emails on new registrations (candidate / recruiter). */
  emailRegistration: boolean;
  /** Emails on payment events (forfait purchase, validation). */
  emailPayment: boolean;
  /** Emails when a new internal message is received. */
  emailMessages: boolean;
  /** Visual notifications for admins on registrations & payments. */
  adminAlerts: boolean;
  /** Optional recipient that receives all administrative alert emails. */
  alertRecipient: string;
}

export interface PlatformSettings {
  /** Roles whose login is disabled platform-wide (login pages reject them). */
  disabledRoles: string[];
  /** The formation forfait (default 380 000 FCFA). */
  forfait: ForfaitConfig;
  /** Email & notification switches. */
  notifications: NotificationConfig;
}

export const DEFAULT_FORFAIT: ForfaitConfig = {
  name: "Forfait Formation COORIZON",
  description:
    "Accès complet à la plateforme : formations en italien, examens, médiathèque, offres d'emploi et candidatures. Paiement unique, validé par l'administration COORIZON.",
  amount: 380000,
  currency: "FCFA",
  durationLabel: "Accès permanent",
};

export const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  emailEnabled: true,
  emailRegistration: true,
  emailPayment: true,
  emailMessages: true,
  adminAlerts: true,
  alertRecipient: "",
};

const DEFAULTS: PlatformSettings = {
  disabledRoles: [],
  forfait: DEFAULT_FORFAIT,
  notifications: DEFAULT_NOTIFICATIONS,
};

function sanitize(raw: unknown): PlatformSettings {
  const base: PlatformSettings = {
    ...DEFAULTS,
    forfait: { ...DEFAULT_FORFAIT },
    notifications: { ...DEFAULT_NOTIFICATIONS },
  };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<PlatformSettings>;
  if (Array.isArray(obj.disabledRoles)) {
    base.disabledRoles = obj.disabledRoles.filter(
      (r) => typeof r === "string" && (ALL_ROLES as string[]).includes(r)
    );
  }
  if (obj.forfait && typeof obj.forfait === "object") {
    const f = obj.forfait as Partial<ForfaitConfig>;
    base.forfait = {
      name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : DEFAULT_FORFAIT.name,
      description:
        typeof f.description === "string" && f.description.trim()
          ? f.description.trim()
          : DEFAULT_FORFAIT.description,
      amount: typeof f.amount === "number" && f.amount > 0 ? f.amount : DEFAULT_FORFAIT.amount,
      currency:
        typeof f.currency === "string" && f.currency.trim() ? f.currency.trim().toUpperCase() : DEFAULT_FORFAIT.currency,
      durationLabel:
        typeof f.durationLabel === "string" && f.durationLabel.trim()
          ? f.durationLabel.trim()
          : DEFAULT_FORFAIT.durationLabel,
    };
  }
  if (obj.notifications && typeof obj.notifications === "object") {
    const n = obj.notifications as Partial<NotificationConfig>;
    const bool = (v: unknown, fallback: boolean) =>
      typeof v === "boolean" ? v : fallback;
    base.notifications = {
      emailEnabled: bool(n.emailEnabled, DEFAULT_NOTIFICATIONS.emailEnabled),
      emailRegistration: bool(n.emailRegistration, DEFAULT_NOTIFICATIONS.emailRegistration),
      emailPayment: bool(n.emailPayment, DEFAULT_NOTIFICATIONS.emailPayment),
      emailMessages: bool(n.emailMessages, DEFAULT_NOTIFICATIONS.emailMessages),
      adminAlerts: bool(n.adminAlerts, DEFAULT_NOTIFICATIONS.adminAlerts),
      alertRecipient:
        typeof n.alertRecipient === "string" && n.alertRecipient.trim()
          ? n.alertRecipient.trim()
          : DEFAULT_NOTIFICATIONS.alertRecipient,
    };
  }
  return base;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const page = await db.cMSPage.findUnique({ where: { slug: SETTINGS_SLUG } });
    if (page?.content) {
      return sanitize(JSON.parse(page.content));
    }
  } catch {
    // Fall through to defaults.
  }
  return {
    ...DEFAULTS,
    forfait: { ...DEFAULT_FORFAIT },
    notifications: { ...DEFAULT_NOTIFICATIONS },
  };
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  const next = sanitize({
    disabledRoles: patch.disabledRoles ?? current.disabledRoles,
    forfait: { ...current.forfait, ...(patch.forfait ?? {}) },
    notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
  });
  const content = JSON.stringify(next);
  const existing = await db.cMSPage.findUnique({ where: { slug: SETTINGS_SLUG } });
  if (existing) {
    await db.cMSPage.update({ where: { slug: SETTINGS_SLUG }, data: { content } });
  } else {
    await db.cMSPage.create({
      data: { slug: SETTINGS_SLUG, title: "Paramètres plateforme", content, isPublished: true },
    });
  }
  return next;
}

/** Roles that can never be disabled (admin tier) to prevent platform lockout. */
const PROTECTED_ROLES: string[] = ["Admin", "SuperAdmin"];

export function isRoleLockable(role: string): boolean {
  return !PROTECTED_ROLES.includes(role);
}

export function isRoleDisabled(settings: PlatformSettings, role: string): boolean {
  return settings.disabledRoles.includes(role);
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}
