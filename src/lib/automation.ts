import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import type { NotificationType } from "@prisma/client";

/**
 * COORIZON automation event system.
 *
 * fireEvent() is the single entry point for all platform events. It:
 * 1. Logs the event to the AutomationEvent table (for the admin dashboard + audit)
 * 2. Dispatches it to all active webhooks configured for this event type (N8N, etc.)
 * 3. Optionally creates an in-app notification for a user
 *
 * This architecture allows connecting N8N (or any external automation tool) by
 * simply configuring a webhook URL in the admin back-office. The webhook receives
 * a POST with the event payload.
 *
 * Events to automate (from the cahier des charges):
 *   candidate.registered, company.registered, company.validated,
 *   joboffer.published, application.created, application.preselected,
 *   application.interview, application.accepted,
 *   enrollment.created, payment.confirmed,
 *   document.refused, document.validated,
 *   exam.passed, certificate.available,
 *   immigration.deadline
 */

export interface FireEventOptions {
  type: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  payload?: Record<string, unknown>;
  /** If provided, creates an in-app notification for this user. */
  notifyUserId?: string;
  notifyType?: NotificationType;
  notifyTitle?: string;
  notifyMessage?: string;
  notifyLink?: string;
}

/**
 * Fire an automation event. Non-blocking for the main flow: webhook delivery
 * and notification creation happen in the background.
 */
export async function fireEvent(opts: FireEventOptions): Promise<void> {
  const payload = opts.payload ? JSON.stringify(opts.payload) : "{}";

  // 1. Log the event
  let event;
  try {
    event = await db.automationEvent.create({
      data: {
        type: opts.type,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        actorId: opts.actorId ?? null,
        payload,
        webhookStatus: "pending",
      },
    });
  } catch {
    // Logging must never break the main flow.
    return;
  }

  // 2. Create in-app notification (if requested)
  if (opts.notifyUserId && opts.notifyTitle && opts.notifyMessage) {
    await notify({
      userId: opts.notifyUserId,
      type: opts.notifyType ?? "Info",
      title: opts.notifyTitle,
      message: opts.notifyMessage,
      link: opts.notifyLink,
    });
  }

  // 3. Dispatch to webhooks (fire-and-forget, non-blocking)
  deliverToWebhooks(event.id, opts.type, payload).catch(() => {});
}

/**
 * Deliver an event to all active webhooks configured for this event type.
 * Updates the event's webhookStatus.
 */
async function deliverToWebhooks(
  eventId: string,
  eventType: string,
  payload: string
): Promise<void> {
  try {
    const webhooks = await db.webhookConfig.findMany({
      where: { isActive: true },
    });

    // Filter webhooks that listen to this event type
    const matching = webhooks.filter((w) => {
      if (w.eventTypes === "*") return true;
      return w.eventTypes
        .split(",")
        .map((t) => t.trim())
        .includes(eventType);
    });

    if (matching.length === 0) {
      // No webhooks configured — mark as skipped
      await db.automationEvent.update({
        where: { id: eventId },
        data: { webhookStatus: "skipped", deliveredAt: new Date() },
      });
      return;
    }

    // Deliver to each webhook
    const results = await Promise.allSettled(
      matching.map(async (w) => {
        const res = await fetch(w.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-COORIZON-Event": eventType,
            "X-COORIZON-Event-Id": eventId,
            ...(w.secret
              ? { "X-COORIZON-Signature": w.secret }
              : {}),
          },
          body: JSON.stringify({
            eventId,
            type: eventType,
            timestamp: new Date().toISOString(),
            data: JSON.parse(payload),
          }),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });
        if (!res.ok) {
          throw new Error(`Webhook responded ${res.status}`);
        }
      })
    );

    const allOk = results.every((r) => r.status === "fulfilled");
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason instanceof Error ? r.reason.message : String(r.reason))
      .join("; ");

    await db.automationEvent.update({
      where: { id: eventId },
      data: {
        webhookStatus: allOk ? "delivered" : "failed",
        webhookError: allOk ? null : errors.slice(0, 500),
        deliveredAt: new Date(),
      },
    });
  } catch (error) {
    // Mark as failed
    await db.automationEvent.update({
      where: { id: eventId },
      data: {
        webhookStatus: "failed",
        webhookError: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        deliveredAt: new Date(),
      },
    }).catch(() => {});
  }
}

/**
 * Event type constants for type safety.
 */
export const EVENTS = {
  CANDIDATE_REGISTERED: "candidate.registered",
  COMPANY_REGISTERED: "company.registered",
  COMPANY_VALIDATED: "company.validated",
  COMPANY_REJECTED: "company.rejected",
  JOBOFFER_PUBLISHED: "joboffer.published",
  APPLICATION_CREATED: "application.created",
  APPLICATION_PRESELECTED: "application.preselected",
  APPLICATION_INTERVIEW: "application.interview",
  APPLICATION_OFFERED: "application.offered",
  APPLICATION_ACCEPTED: "application.accepted",
  APPLICATION_REJECTED: "application.rejected",
  ENROLLMENT_CREATED: "enrollment.created",
  PAYMENT_CONFIRMED: "payment.confirmed",
  PAYMENT_REFUNDED: "payment.refunded",
  DOCUMENT_UPLOADED: "document.uploaded",
  DOCUMENT_VALIDATED: "document.validated",
  DOCUMENT_REFUSED: "document.refused",
  EXAM_PASSED: "exam.passed",
  EXAM_FAILED: "exam.failed",
  CERTIFICATE_AVAILABLE: "certificate.available",
  IMMIGRATION_DEADLINE: "immigration.deadline",
  IMMIGRATION_STATUS_CHANGED: "immigration.status_changed",
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
