import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

const SETTING_KEY = "whatsapp_numbers";
const DEFAULT_NUMBERS = [
  { service: "Service Client", number: "221710907070", label: "Service Client" },
  { service: "Facturation", number: "221710907071", label: "Facturation" },
  { service: "Formation", number: "221710907072", label: "Formation" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminOnly = searchParams.get("admin") === "true";
    if (adminOnly) {
      const session = await requireSession();
      if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    }
    const page = await db.cMSPage.findUnique({ where: { slug: SETTING_KEY } });
    if (page) return Response.json({ numbers: JSON.parse(page.content) });
    return Response.json({ numbers: DEFAULT_NUMBERS });
  } catch {
    return Response.json({ numbers: DEFAULT_NUMBERS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isAdmin(session.user.role)) return Response.json({ error: "Admin uniquement." }, { status: 403 });
    const body = await req.json();
    const { numbers } = body as { numbers?: { service: string; number: string; label: string }[] };
    if (!numbers || !Array.isArray(numbers)) return Response.json({ error: "Format invalide." }, { status: 400 });
    const content = JSON.stringify(numbers);
    const existing = await db.cMSPage.findUnique({ where: { slug: SETTING_KEY } });
    if (existing) await db.cMSPage.update({ where: { slug: SETTING_KEY }, data: { content } });
    else await db.cMSPage.create({ data: { slug: SETTING_KEY, title: "WhatsApp Numbers", content, isPublished: true } });
    return Response.json({ ok: true, numbers });
  } catch (e) { return authErrorResponse(e); }
}
