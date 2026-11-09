import { NextResponse, type NextRequest } from "next/server";

/**
 * COORIZON security middleware.
 *
 * Adds security headers to all responses and applies basic rate limiting
 * to auth and AI endpoints.
 */

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const AUTH_RATE_LIMIT = 30; // 30 auth requests per minute per IP (NextAuth makes multiple)
const AI_RATE_LIMIT = 15; // 15 AI requests per minute per IP

const ipCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Rate limiting for auth and AI endpoints
  if (path.startsWith("/api/auth/") || path.startsWith("/api/ai/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") ||
               "unknown";
    const limit = path.startsWith("/api/ai/") ? AI_RATE_LIMIT : AUTH_RATE_LIMIT;
    if (isRateLimited(ip, limit)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans un instant." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
