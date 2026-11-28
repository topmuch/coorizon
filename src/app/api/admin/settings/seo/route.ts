import { NextRequest } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import {
  getPlatformSettings,
  updatePlatformSettings,
  DEFAULT_SEO,
  type SeoConfig,
} from "@/lib/platform-settings";
import { audit } from "@/lib/auth/audit";

/**
 * GET /api/admin/settings/seo
 *
 * Returns the SEO configuration (title, description, keywords, Open Graph,
 * indexation) stored in the platform settings.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }
    const settings = await getPlatformSettings();
    return Response.json({ seo: settings.seo, defaults: DEFAULT_SEO });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PUT /api/admin/settings/seo
 *
 * Update the SEO configuration. Admin/SuperAdmin only.
 *
 * Body: Partial<SeoConfig>
 * Response: { seo }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<SeoConfig>;
    const current = await getPlatformSettings();

    const strOrUndefined = (v: unknown): string | undefined =>
      typeof v === "string" ? v.trim() : undefined;

    const nextSeo: SeoConfig = {
      metaTitle: strOrUndefined(body.metaTitle) ?? current.seo.metaTitle,
      metaDescription: strOrUndefined(body.metaDescription) ?? current.seo.metaDescription,
      metaKeywords: strOrUndefined(body.metaKeywords) ?? current.seo.metaKeywords,
      ogTitle: strOrUndefined(body.ogTitle) ?? current.seo.ogTitle,
      ogDescription: strOrUndefined(body.ogDescription) ?? current.seo.ogDescription,
      indexable: typeof body.indexable === "boolean" ? body.indexable : current.seo.indexable,
    };

    const next = await updatePlatformSettings({ seo: nextSeo });

    await audit({
      actorId: session.user.id,
      action: "admin.settings.seo",
      targetType: "PlatformSettings",
      metadata: { seo: next.seo },
      req,
    });

    return Response.json({ seo: next.seo, defaults: DEFAULT_SEO });
  } catch (error) {
    return authErrorResponse(error);
  }
}
