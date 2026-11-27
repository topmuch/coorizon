/**
 * Currency formatting shared across the back-office and the candidate space.
 * Supports EUR, USD, GBP and FCFA / XOF (no decimals, suffix).
 */

export function formatAmount(amount: number, currency: string = "EUR"): string {
  const cur = (currency || "EUR").toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  if (cur === "FCFA" || cur === "XOF" || cur === "XAF") {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`;
  }
  if (cur === "USD") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} $`;
  if (cur === "GBP") return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value)} £`;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} €`;
}
