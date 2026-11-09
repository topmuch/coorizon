import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

/**
 * Append an entry to the audit log. Non-blocking: failures are swallowed
 * so they never break the main operation.
 */
export async function audit({
  actorId,
  action,
  targetType,
  targetId,
  metadata,
  req,
}: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: req ? getClientIp(req) : null,
        userAgent: req?.headers.get("user-agent") ?? null,
      },
    });
  } catch {
    // Audit logging must never break the main flow.
  }
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return null;
}
