import { NextRequest } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { ALL_ROLES, ROLE_LABELS, type Role } from "@/lib/permissions";
import {
  getPlatformSettings,
  updatePlatformSettings,
  isRoleLockable,
} from "@/lib/platform-settings";
import { audit } from "@/lib/auth/audit";

/**
 * GET /api/admin/settings/roles
 *
 * Returns the connection profiles with their activation state
 * (enabled / disabled / locked). Admin/SuperAdmin only.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const settings = await getPlatformSettings();
    const roles = ALL_ROLES.map((role: Role) => ({
      role,
      label: ROLE_LABELS[role],
      enabled: !settings.disabledRoles.includes(role),
      locked: !isRoleLockable(role),
    }));

    return Response.json({ roles });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/settings/roles
 *
 * Enable or disable a connection profile platform-wide. Disabled profiles
 * cannot sign in from any login page (checked in the NextAuth authorize()).
 * Admin-tier profiles (Admin, SuperAdmin) are locked and always enabled.
 *
 * Body: { role, enabled }
 * Response: { roles }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const role = String(body?.role ?? "");
    const enabled = Boolean(body?.enabled);

    if (!(ALL_ROLES as string[]).includes(role)) {
      return Response.json({ error: "Rôle invalide." }, { status: 400 });
    }
    if (!isRoleLockable(role)) {
      return Response.json(
        { error: "Les profils administrateurs restent toujours actifs." },
        { status: 400 }
      );
    }

    const settings = await getPlatformSettings();
    const disabledRoles = new Set(settings.disabledRoles);
    if (enabled) disabledRoles.delete(role);
    else disabledRoles.add(role);

    const next = await updatePlatformSettings({
      disabledRoles: Array.from(disabledRoles),
    });

    await audit({
      actorId: session.user.id,
      action: "admin.settings.roles",
      targetType: "PlatformSettings",
      metadata: { role, enabled, disabledRoles: next.disabledRoles },
      req,
    });

    const roles = ALL_ROLES.map((r: Role) => ({
      role: r,
      label: ROLE_LABELS[r],
      enabled: !next.disabledRoles.includes(r),
      locked: !isRoleLockable(r),
    }));

    return Response.json({ roles });
  } catch (error) {
    return authErrorResponse(error);
  }
}
