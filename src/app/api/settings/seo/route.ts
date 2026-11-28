import { getPlatformSettings, DEFAULT_SEO } from "@/lib/platform-settings";

/**
 * GET /api/settings/seo (public)
 *
 * Returns the SEO metadata configured by the administration so the public
 * site can apply it client-side (document title, meta description, meta
 * keywords, Open Graph tags, robots).
 *
 * No authentication required — this data is public by nature (it is what
 * search engines and social networks see).
 */
export async function GET() {
  try {
    const settings = await getPlatformSettings();
    // No sensitive data in SeoConfig — safe to expose publicly.
    return Response.json({ seo: settings.seo });
  } catch {
    // On any failure, fall back to the defaults so the site keeps proper metadata.
    return Response.json({ seo: DEFAULT_SEO });
  }
}
