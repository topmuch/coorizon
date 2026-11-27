import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformSettings, isRoleDisabled, roleLabel } from "@/lib/platform-settings";

/**
 * Public side-channel used by the login pages.
 *
 * NextAuth v4 masks authorize() error messages (the client only sees
 * "CredentialsSignin"), so after a failed sign-in the login page calls this
 * endpoint with the email to check whether the failure is due to the profile
 * being disabled platform-wide. Only that single boolean is revealed —
 * never account existence, status or role details.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ roleDisabled: false });
    }

    const [settings, user] = await Promise.all([
      getPlatformSettings(),
      db.user.findUnique({ where: { email }, select: { role: true } }),
    ]);

    if (user && isRoleDisabled(settings, user.role)) {
      return NextResponse.json({ roleDisabled: true, roleLabel: roleLabel(user.role) });
    }
    return NextResponse.json({ roleDisabled: false });
  } catch {
    return NextResponse.json({ roleDisabled: false });
  }
}
