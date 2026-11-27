import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/platform-settings";

/**
 * The "Forfait Formation" is a dedicated Service row (category "formation")
 * that gates full candidate access. Payments linked to this service are the
 * candidates' purchase requests, validated by the administration in the
 * "Forfait" tab of the back-office.
 */

/** Find the forfait service without creating it (read-only paths). */
export async function findForfaitService() {
  const settings = await getPlatformSettings();
  return db.service.findFirst({
    where: { name: settings.forfait.name, category: "formation" },
  });
}

/** Find or lazily create the forfait service from the platform settings. */
export async function getOrCreateForfaitService() {
  const settings = await getPlatformSettings();
  const existing = await db.service.findFirst({
    where: { name: settings.forfait.name, category: "formation" },
  });
  if (existing) return existing;
  return db.service.create({
    data: {
      name: settings.forfait.name,
      description: settings.forfait.description,
      category: "formation",
      price: settings.forfait.amount,
      currency: settings.forfait.currency,
      durationLabel: settings.forfait.durationLabel,
      isPublished: true,
    },
  });
}

export function isForfaitPayment(
  payment: { serviceId: string | null },
  forfaitServiceId: string
): boolean {
  return payment.serviceId === forfaitServiceId;
}

/** Invoice number generator: FAC-<year>-<6 alphanum> */
export function generateInvoiceNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `FAC-${new Date().getFullYear()}-${rand}`;
}
