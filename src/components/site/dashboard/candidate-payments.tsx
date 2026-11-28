"use client";

import * as React from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Euro,
  Download,
  Lock,
  Receipt,
  Loader2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format-currency";
import { useCandidateAccess } from "@/lib/candidate-access";

// ─── Types ─────────────────────────────────────────────────────────────────
// Local client-side types. The server returns Date fields as ISO strings.

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded" | "Cancelled";

interface PaymentService {
  id: string;
  name: string;
  category: string;
}

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: PaymentStatus;
  provider: string | null;
  invoiceNumber: string | null;
  paidAt: string | null;
  createdAt: string;
  service: PaymentService | null;
}

interface PaymentsResponse {
  payments: PaymentItem[];
}

// ─── Display helpers ───────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

interface CategoryMeta {
  label: string;
  className: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  formation: {
    label: "Formation",
    className: "border-transparent bg-brand-green/10 text-brand-green",
  },
  accompagnement: {
    label: "Accompagnement",
    className: "border-transparent bg-amber-100 text-amber-800",
  },
  abonnement: {
    label: "Abonnement",
    className: "border-transparent bg-teal-100 text-teal-800",
  },
  autre: {
    label: "Autre",
    className: "border-transparent bg-muted text-muted-foreground",
  },
};

function categoryMeta(category: string): CategoryMeta {
  return (
    CATEGORY_META[category] ?? {
      label: category || "Prestation",
      className: "border-transparent bg-muted text-muted-foreground",
    }
  );
}

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  className: string;
}

const STATUS_META: Record<PaymentStatus, StatusMeta> = {
  Pending: {
    label: "En attente",
    icon: Clock,
    className: "border-transparent bg-amber-100 text-amber-800",
  },
  Paid: {
    label: "Payé",
    icon: CheckCircle2,
    className: "border-transparent bg-emerald-100 text-emerald-800",
  },
  Failed: {
    label: "Échoué",
    icon: XCircle,
    className: "border-transparent bg-red-100 text-red-800",
  },
  Refunded: {
    label: "Remboursé",
    icon: RotateCcw,
    className: "border-transparent bg-slate-200 text-slate-700",
  },
  Cancelled: {
    label: "Annulé",
    icon: XCircle,
    className: "border-transparent bg-zinc-200 text-zinc-600",
  },
};

// ─── Component ─────────────────────────────────────────────────────────────

export function CandidatePayments() {
  const { toast } = useToast();
  // Rendered inside CandidateAccessProvider — used to identify forfait
  // payments, which can ONLY be validated by the administration.
  const { access } = useCandidateAccess();
  const forfaitName = access?.forfait?.name ?? null;

  const isForfaitPayment = (payment: PaymentItem): boolean =>
    forfaitName !== null && payment.service?.name === forfaitName;

  const [payments, setPayments] = React.useState<PaymentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [confirming, setConfirming] = React.useState(false);

  // Invoice print state.
  const [printingInvoice, setPrintingInvoice] =
    React.useState<PaymentItem | null>(null);

  // ── Load history ────────────────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const paymentsRes = await fetch("/api/candidate/payments", {
        credentials: "same-origin",
      });

      if (!paymentsRes.ok) {
        const data = (await paymentsRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Impossible de charger vos paiements.");
      }

      const paymentsData = (await paymentsRes.json()) as PaymentsResponse;
      setPayments(paymentsData.payments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Print handling (invoice download) ───────────────────────────────────
  React.useEffect(() => {
    if (!printingInvoice) return;
    const onAfterPrint = () => setPrintingInvoice(null);
    window.addEventListener("afterprint", onAfterPrint);
    const timer = window.setTimeout(() => {
      window.print();
    }, 100);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [printingInvoice]);

  // ── Confirm a payment (server-side) ─────────────────────────────────────
  const handleConfirm = async (paymentId: string) => {
    setConfirming(true);
    try {
      const res = await fetch(
        `/api/candidate/payments/${paymentId}/confirm`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        payment?: PaymentItem;
        error?: string;
      };
      if (!res.ok || !data.payment) {
        throw new Error(
          data.error ?? "La confirmation du paiement a échoué."
        );
      }
      toast({
        title: "Paiement confirmé",
        description: `Votre paiement a été confirmé. Facture ${data.payment.invoiceNumber}.`,
      });
      await load();
    } catch (e) {
      toast({
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handlePrintInvoice = (payment: PaymentItem) => {
    setPrintingInvoice(payment);
  };

  // ── Stats ───────────────────────────────────────────────────────────────
  const totalPaid = payments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === "Pending").length;
  const paidCurrency =
    payments.find((p) => p.status === "Paid")?.currency ?? "EUR";

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Print stylesheet — only the active invoice is visible on paper */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          [data-print-root="true"], [data-print-root="true"] * {
            visibility: visible !important;
          }
          [data-print-root="true"] {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            padding: 24px !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          [data-no-print] { display: none !important; }
        }
        @media screen {
          [data-print-invoice] {
            position: fixed;
            left: -99999px;
            top: 0;
            width: 800px;
          }
        }
      `}</style>

      {/* Header */}
      <header className="space-y-1.5" data-no-print>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-navy">
          <CreditCard className="h-6 w-6 text-brand" aria-hidden />
          Mes paiements
        </h1>
        <p className="text-sm text-muted-foreground">
          Consultez l&rsquo;historique de vos paiements et téléchargez vos
          factures. La confirmation est systématiquement vérifiée côté serveur.
        </p>
      </header>

      {/* Stats row */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        data-no-print
        aria-label="Récapitulatif des paiements"
      >
        <StatCard
          label="Total payé"
          value={formatAmount(totalPaid, paidCurrency)}
          icon={Euro}
          iconBoxClass="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="En attente"
          value={`${pendingCount} paiement${pendingCount > 1 ? "s" : ""}`}
          icon={Clock}
          iconBoxClass="bg-amber-100 text-amber-700"
        />
      </section>

      {/* Payment history */}
      <section className="space-y-4" data-no-print>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-navy" aria-hidden />
          <h2 className="text-lg font-semibold text-navy">
            Historique des paiements
          </h2>
        </div>

        {payments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base text-navy">
                Aucun paiement pour le moment
              </CardTitle>
              <CardDescription>
                Vos commandes et paiements apparaîtront ici.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                isForfait={isForfaitPayment(payment)}
                onConfirm={() => void handleConfirm(payment.id)}
                confirming={confirming}
                onPrintInvoice={() => handlePrintInvoice(payment)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Printable invoice (off-screen, visible only when printing) */}
      {printingInvoice && (
        <div data-print-root="true" data-print-invoice>
          <PrintableInvoice payment={printingInvoice} />
        </div>
      )}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBoxClass: string;
}

function StatCard({ label, value, icon: Icon, iconBoxClass }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
            iconBoxClass
          )}
          aria-hidden
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-xl font-bold text-navy">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Payment row (history) ─────────────────────────────────────────────────

interface PaymentRowProps {
  payment: PaymentItem;
  isForfait: boolean;
  onConfirm: () => void;
  confirming: boolean;
  onPrintInvoice: () => void;
}

function PaymentRow({
  payment,
  isForfait,
  onConfirm,
  confirming,
  onPrintInvoice,
}: PaymentRowProps) {
  const meta = STATUS_META[payment.status] ?? STATUS_META.Pending;
  const StatusIcon = meta.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: description + meta */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-navy">{payment.description}</p>
              <Badge className={cn("gap-1", meta.className)}>
                <StatusIcon className="h-3 w-3" aria-hidden />
                {meta.label}
              </Badge>
              {payment.service?.category ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {categoryMeta(payment.service.category).label}
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Créé le {formatDate(payment.createdAt)}</span>
              {payment.status === "Paid" && payment.paidAt ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
                  Payé le {formatDate(payment.paidAt)}
                </span>
              ) : null}
              {payment.invoiceNumber ? (
                <span className="flex items-center gap-1 font-mono">
                  <Receipt className="h-3 w-3" aria-hidden />
                  {payment.invoiceNumber}
                </span>
              ) : null}
              {payment.provider ? (
                <span className="uppercase tracking-wide">
                  via {payment.provider}
                </span>
              ) : null}
            </div>
          </div>

          {/* Right: amount + actions */}
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <span className="text-lg font-bold text-navy">
              {formatAmount(payment.amount, payment.currency)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {payment.status === "Pending" && isForfait && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  <Clock className="h-3 w-3" aria-hidden />
                  Validation admin en cours
                </span>
              )}
              {payment.status === "Pending" && !isForfait && (
                <>
                  <Button
                    size="sm"
                    onClick={onConfirm}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    Confirmer le paiement
                  </Button>
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <Clock className="h-3 w-3" aria-hidden />
                    En attente de confirmation
                  </span>
                </>
              )}
              {payment.status === "Paid" && (
                <Button size="sm" variant="outline" onClick={onPrintInvoice}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger la facture
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Printable invoice ─────────────────────────────────────────────────────

function PrintableInvoice({ payment }: { payment: PaymentItem }) {
  const cat = payment.service?.category
    ? categoryMeta(payment.service.category).label
    : "Prestation";
  return (
    <div className="bg-white p-8 text-black">
      <div className="mb-6 flex items-center justify-between border-b-2 border-navy pb-4">
        <div>
          <p className="text-xl font-bold uppercase tracking-widest text-navy">
            COORIZON
          </p>
          <p className="text-xs text-gray-600">Facture</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-navy">
            {payment.invoiceNumber ?? "—"}
          </p>
          <p className="text-xs text-gray-600">
            {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
            Prestation
          </p>
          <p className="font-semibold">{payment.description}</p>
          <p className="text-gray-600">{cat}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
            Statut
          </p>
          <p className="font-semibold uppercase text-emerald-700">Payée</p>
        </div>
      </div>

      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-3 pr-4">{payment.description}</td>
            <td className="py-3 pr-4">
              {payment.paidAt
                ? formatDate(payment.paidAt)
                : formatDate(payment.createdAt)}
            </td>
            <td className="py-3 text-right font-semibold">
              {formatAmount(payment.amount, payment.currency)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="py-3 text-right font-bold">
              Total payé
            </td>
            <td className="py-3 text-right text-lg font-bold">
              {formatAmount(payment.amount, payment.currency)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-8 border-t border-gray-200 pt-4 text-xs text-gray-500">
        Cette facture est éditée par COORIZON après confirmation du paiement
        côté serveur. Elle atteste du règlement de la prestation ci-dessus.
      </p>
    </div>
  );
}
