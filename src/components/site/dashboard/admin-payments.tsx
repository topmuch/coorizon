"use client";

import * as React from "react";
import {
  CreditCard,
  Euro,
  Receipt,
  RotateCcw,
  Search,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Calendar,
  Building2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AdminServices } from "./admin-services";

// ─── Types ─────────────────────────────────────────────────────────────────

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded" | "Cancelled";

interface PaymentUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface PaymentService {
  id: string;
  name: string;
  category: string;
  price?: number;
  currency?: string;
}

interface PaymentListItem {
  id: string;
  userId: string;
  serviceId: string | null;
  amount: number;
  currency: string;
  description: string;
  status: PaymentStatus;
  provider: string | null;
  providerPaymentId: string | null;
  invoiceNumber: string | null;
  receiptUrl: string | null;
  refundReason: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: PaymentUser;
  service: PaymentService | null;
}

type PaymentDetail = PaymentListItem;

interface PaymentsListStats {
  totalRevenue: number;
  pendingCount: number;
  refundedCount: number;
}

interface PaymentsListResponse {
  payments: PaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: PaymentsListStats;
}

interface PaymentDetailResponse {
  payment: PaymentDetail;
}

// ─── Display metadata ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<PaymentStatus, string> = {
  Pending: "En attente",
  Paid: "Payé",
  Failed: "Échoué",
  Refunded: "Remboursé",
  Cancelled: "Annulé",
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "Tous les statuts",
  Pending: "En attente",
  Paid: "Payé",
  Failed: "Échoué",
  Refunded: "Remboursé",
  Cancelled: "Annulé",
};

function statusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "Paid":
      return "bg-brand-green/10 text-brand-green border border-brand-green/30";
    case "Failed":
      return "bg-italian-red/10 text-italian-red border border-italian-red/30";
    case "Refunded":
      return "bg-muted text-muted-foreground border border-border";
    case "Cancelled":
      return "bg-zinc-100 text-zinc-600 border border-zinc-200";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function statusDotClass(status: PaymentStatus): string {
  switch (status) {
    case "Pending":
      return "bg-amber-500";
    case "Paid":
      return "bg-brand-green";
    case "Failed":
      return "bg-italian-red";
    case "Refunded":
      return "bg-muted-foreground";
    case "Cancelled":
      return "bg-zinc-400";
    default:
      return "bg-muted-foreground";
  }
}

// ─── Date / format helpers ─────────────────────────────────────────────────

function formatDateFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatEuro(amount: number, currency = "EUR"): string {
  return `${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function currencySymbol(currency: string): string {
  if (currency === "EUR") return "€";
  if (currency === "USD") return "$";
  return currency;
}

function fullName(user: PaymentUser): string {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name.length > 0 ? name : user.email;
}

function initials(user: PaymentUser): string {
  const fi = user.firstName?.[0] ?? "";
  const li = user.lastName?.[0] ?? "";
  if (fi || li) return (fi + li).toUpperCase();
  return user.email[0]?.toUpperCase() ?? "?";
}

function providerLabel(provider: string | null): string {
  if (!provider) return "—";
  const p = provider.toLowerCase();
  if (p === "stripe") return "Stripe";
  if (p === "local") return "Local";
  return provider;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", statusBadgeClass(status))}
    >
      <span
        className={cn(
          "mr-1 inline-block size-1.5 rounded-full",
          statusDotClass(status)
        )}
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function AvatarInitials({ user }: { user: PaymentUser }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
      {initials(user)}
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  tone: "revenue" | "pending" | "refunded";
}

function StatCard({ icon: Icon, label, value, hint, tone }: StatCardProps) {
  const toneClass =
    tone === "revenue"
      ? "text-brand-green bg-brand-green/10"
      : tone === "pending"
      ? "text-amber-600 bg-amber-50"
      : "text-muted-foreground bg-muted";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4 sm:p-6">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg",
            toneClass
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 text-2xl font-bold text-ink">{value}</div>
          {hint && (
            <div className="text-[11px] text-muted-foreground">{hint}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-ink sm:text-right">{children}</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function AdminPayments() {
  const { toast } = useToast();

  // List state
  const [payments, setPayments] = React.useState<PaymentListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [stats, setStats] = React.useState<PaymentsListStats>({
    totalRevenue: 0,
    pendingCount: 0,
    refundedCount: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");

  // Action state
  const [pendingRefundId, setPendingRefundId] = React.useState<string | null>(
    null
  );

  // Detail dialog
  const [detailPayment, setDetailPayment] = React.useState<PaymentListItem | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Refund dialog
  const [refundTarget, setRefundTarget] = React.useState<PaymentListItem | null>(null);
  const [refundReason, setRefundReason] = React.useState("");

  // Tab state
  const [tab, setTab] = React.useState<string>("payments");

  // ─── Fetch list ───────────────────────────────────────────────────────
  const fetchPayments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (appliedSearch.trim()) qs.set("q", appliedSearch.trim());
      qs.set("page", String(page));
      qs.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/payments?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des paiements.");
      }
      const data = (await res.json()) as PaymentsListResponse;
      setPayments(data.payments);
      setTotal(data.total);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, appliedSearch, page]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Reset to page 1 when filters change.
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, appliedSearch]);

  // ─── Fetch detail (single payment) ────────────────────────────────────
  const openDetails = React.useCallback(
    async (payment: PaymentListItem) => {
      setDetailPayment(payment);
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/admin/payments/${payment.id}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Paiement introuvable.");
        }
        const data = (await res.json()) as PaymentDetailResponse;
        setDetailPayment(data.payment);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: e instanceof Error ? e.message : "Une erreur est survenue.",
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [toast]
  );

  // ─── Refund action ────────────────────────────────────────────────────
  const handleRefund = async () => {
    if (!refundTarget) return;
    const reason = refundReason.trim();
    if (reason.length === 0) {
      toast({
        variant: "destructive",
        title: "Motif obligatoire",
        description: "Veuillez indiquer le motif du remboursement.",
      });
      return;
    }
    setPendingRefundId(refundTarget.id);
    try {
      const res = await fetch(`/api/admin/payments/${refundTarget.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundReason: reason }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du remboursement.");
      }
      const data = (await res.json()) as PaymentDetailResponse;
      toast({
        title: "Paiement remboursé",
        description: `Le paiement de ${formatEuro(
          data.payment.amount,
          data.payment.currency
        )} a été remboursé. Un email a été envoyé à ${data.payment.user.email}.`,
      });
      setRefundTarget(null);
      setRefundReason("");
      await fetchPayments();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setPendingRefundId(null);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="size-6 text-navy" />
          <h1 className="text-2xl font-bold text-ink">
            Gestion commerciale
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Suivez les paiements, émettez des remboursements et gérez le
          catalogue des prestations de la plateforme COORIZON.
        </p>
      </header>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex w-full max-w-xl flex-wrap">
          <TabsTrigger value="payments" className="flex-1">
            <CreditCard className="mr-1.5 size-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="services" className="flex-1">
            <Receipt className="mr-1.5 size-4" />
            Catalogue des prestations
          </TabsTrigger>
        </TabsList>

        {/* ─── Payments tab ──────────────────────────────────────────── */}
        <TabsContent value="payments" className="mt-6 space-y-6">
          {/* Stats row */}
          <section
            aria-label="Statistiques commerciales"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <StatCard
              icon={TrendingUp}
              label="Revenu total"
              value={formatEuro(stats.totalRevenue)}
              hint="Somme des paiements payés"
              tone="revenue"
            />
            <StatCard
              icon={Clock}
              label="Paiements en attente"
              value={stats.pendingCount}
              hint="En cours de traitement"
              tone="pending"
            />
            <StatCard
              icon={RotateCcw}
              label="Remboursements"
              value={stats.refundedCount}
              hint="Paiements remboursés"
              tone="refunded"
            />
          </section>

          {/* Filter bar */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-6">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="pay-status" className="text-xs">
                  Statut
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v)}
                >
                  <SelectTrigger id="pay-status" className="w-full">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="Pending">En attente</SelectItem>
                    <SelectItem value="Paid">Payé</SelectItem>
                    <SelectItem value="Failed">Échoué</SelectItem>
                    <SelectItem value="Refunded">Remboursé</SelectItem>
                    <SelectItem value="Cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="pay-search" className="text-xs">
                  Recherche (email ou description)
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pay-search"
                    placeholder="Rechercher un paiement..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setAppliedSearch(searchInput.trim());
                      }
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setAppliedSearch(searchInput.trim())}
                >
                  <Search className="mr-1.5 size-4" />
                  Rechercher
                </Button>
                {(statusFilter !== "all" || appliedSearch !== "") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchInput("");
                      setAppliedSearch("");
                    }}
                  >
                    <RefreshCw className="mr-1.5 size-4" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <Card>
              <CardContent className="space-y-3 p-4 sm:p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <CreditCard className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-ink">Aucun paiement trouvé</p>
                  <p className="text-sm text-muted-foreground">
                    Aucun paiement ne correspond à vos critères de recherche.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <Card className="hidden lg:block">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[220px]">
                          Utilisateur
                        </TableHead>
                        <TableHead className="min-w-[200px]">
                          Description
                        </TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Facture</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <AvatarInitials user={p.user} />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-ink">
                                  {fullName(p.user)}
                                </div>
                                <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Mail className="size-3" />
                                  {p.user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[260px]">
                              <div className="truncate text-sm text-ink">
                                {p.description}
                              </div>
                              {p.service && (
                                <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Building2 className="size-3" />
                                  {p.service.name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-ink">
                            {formatEuro(p.amount, p.currency)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {providerLabel(p.provider)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.invoiceNumber ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateFr(p.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetails(p)}
                              >
                                <Eye className="mr-1 size-4" />
                                Détails
                              </Button>
                              {p.status === "Paid" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRefundTarget(p);
                                    setRefundReason("");
                                  }}
                                  className="text-italian-red hover:bg-italian-red/5 hover:text-italian-red"
                                >
                                  <RotateCcw className="mr-1 size-4" />
                                  Rembourser
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 lg:hidden">
                {payments.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <AvatarInitials user={p.user} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-ink">
                              {fullName(p.user)}
                            </div>
                            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Mail className="size-3" />
                              {p.user.email}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <Separator />
                      <div className="space-y-1.5">
                        <div className="text-sm text-ink">{p.description}</div>
                        {p.service && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="size-3" />
                            {p.service.name}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="uppercase tracking-wide text-muted-foreground">
                            Montant
                          </div>
                          <div className="text-sm font-semibold text-ink">
                            {formatEuro(p.amount, p.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wide text-muted-foreground">
                            Fournisseur
                          </div>
                          <div className="text-sm text-ink">
                            {providerLabel(p.provider)}
                          </div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wide text-muted-foreground">
                            Facture
                          </div>
                          <div className="text-sm text-ink">
                            {p.invoiceNumber ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wide text-muted-foreground">
                            Date
                          </div>
                          <div className="text-sm text-ink">
                            {formatDateFr(p.createdAt)}
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(p)}
                          className="flex-1"
                        >
                          <Eye className="mr-1.5 size-4" />
                          Détails
                        </Button>
                        {p.status === "Paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRefundTarget(p);
                              setRefundReason("");
                            }}
                            className="flex-1 text-italian-red hover:bg-italian-red/5 hover:text-italian-red"
                          >
                            <RotateCcw className="mr-1.5 size-4" />
                            Rembourser
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Affichage de {pageStart} à {pageEnd} sur {total} paiement
                  {total > 1 ? "s" : ""}.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Précédent
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Suivant
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Services tab ──────────────────────────────────────────── */}
        <TabsContent value="services" className="mt-6">
          <AdminServices />
        </TabsContent>
      </Tabs>

      {/* ─── Details dialog ────────────────────────────────────────────── */}
      <Dialog
        open={detailPayment !== null}
        onOpenChange={(open) => {
          if (!open) setDetailPayment(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-navy" />
              Détails du paiement
            </DialogTitle>
            <DialogDescription>
              Informations complètes du paiement et de son statut.
            </DialogDescription>
          </DialogHeader>

          {detailLoading && !detailPayment ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : detailPayment ? (
            <div className="space-y-4">
              {/* Status + amount banner */}
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-navy/10 text-navy">
                    <Euro className="size-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-ink">
                      {formatEuro(
                        detailPayment.amount,
                        detailPayment.currency
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currencySymbol(detailPayment.currency)} ·{" "}
                      {detailPayment.description}
                    </div>
                  </div>
                </div>
                <StatusBadge status={detailPayment.status} />
              </div>

              <Separator />

              {/* User */}
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  <CreditCard className="size-4 text-navy" />
                  Utilisateur
                </h3>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <AvatarInitials user={detailPayment.user} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">
                      {fullName(detailPayment.user)}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      {detailPayment.user.email}
                    </div>
                  </div>
                </div>
              </section>

              {/* Payment info */}
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  <Receipt className="size-4 text-navy" />
                  Informations du paiement
                </h3>
                <div className="divide-y divide-border rounded-lg border border-border px-3">
                  <InfoRow label="Description">
                    {detailPayment.description}
                  </InfoRow>
                  {detailPayment.service && (
                    <InfoRow label="Prestation">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {detailPayment.service.name}
                        <span className="text-xs text-muted-foreground">
                          ({detailPayment.service.category})
                        </span>
                      </span>
                    </InfoRow>
                  )}
                  <InfoRow label="Montant">
                    {formatEuro(
                      detailPayment.amount,
                      detailPayment.currency
                    )}
                  </InfoRow>
                  <InfoRow label="Statut">
                    <StatusBadge status={detailPayment.status} />
                  </InfoRow>
                  <InfoRow label="Fournisseur">
                    {providerLabel(detailPayment.provider)}
                  </InfoRow>
                  {detailPayment.providerPaymentId && (
                    <InfoRow label="Référence fournisseur">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {detailPayment.providerPaymentId}
                      </code>
                    </InfoRow>
                  )}
                  <InfoRow label="N° de facture">
                    {detailPayment.invoiceNumber ?? "—"}
                  </InfoRow>
                  {detailPayment.receiptUrl && (
                    <InfoRow label="Reçu">
                      <a
                        href={detailPayment.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-navy underline underline-offset-4"
                      >
                        Télécharger le reçu
                      </a>
                    </InfoRow>
                  )}
                </div>
              </section>

              {/* Dates */}
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  <Calendar className="size-4 text-navy" />
                  Dates
                </h3>
                <div className="divide-y divide-border rounded-lg border border-border px-3">
                  <InfoRow label="Créé le">
                    {formatDateTimeFr(detailPayment.createdAt)}
                  </InfoRow>
                  {detailPayment.paidAt && (
                    <InfoRow label="Payé le">
                      {formatDateTimeFr(detailPayment.paidAt)}
                    </InfoRow>
                  )}
                  {detailPayment.refundedAt && (
                    <InfoRow label="Remboursé le">
                      {formatDateTimeFr(detailPayment.refundedAt)}
                    </InfoRow>
                  )}
                </div>
              </section>

              {/* Refund reason (if any) */}
              {detailPayment.refundReason && (
                <Alert>
                  <RotateCcw className="size-4" />
                  <AlertTitle>Motif du remboursement</AlertTitle>
                  <AlertDescription>
                    {detailPayment.refundReason}
                  </AlertDescription>
                </Alert>
              )}

              {/* Footer actions */}
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setDetailPayment(null)}
                >
                  Fermer
                </Button>
                {detailPayment.status === "Paid" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRefundTarget(detailPayment);
                      setRefundReason("");
                      setDetailPayment(null);
                    }}
                    className="text-italian-red hover:bg-italian-red/5 hover:text-italian-red"
                  >
                    <RotateCcw className="mr-1.5 size-4" />
                    Rembourser ce paiement
                  </Button>
                )}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ─── Refund dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={refundTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRefundTarget(null);
            setRefundReason("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-italian-red" />
              Rembourser le paiement
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L&apos;utilisateur recevra une
              notification l&apos;informant du remboursement.
            </DialogDescription>
          </DialogHeader>

          {refundTarget && (
            <div className="space-y-4">
              {/* Payment summary */}
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">
                      {refundTarget.description}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      {refundTarget.user.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-ink">
                      {formatEuro(
                        refundTarget.amount,
                        refundTarget.currency
                      )}
                    </div>
                    <StatusBadge status={refundTarget.status} />
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="size-4" />
                <AlertTitle>Confirmation requise</AlertTitle>
                <AlertDescription>
                  Le statut passera à « Remboursé » et ne pourra plus être
                  modifié. Un email sera envoyé à l&apos;utilisateur.
                </AlertDescription>
              </Alert>

              <div className="space-y-1.5">
                <Label htmlFor="refund-reason">
                  Motif du remboursement <span className="text-italian-red">*</span>
                </Label>
                <Textarea
                  id="refund-reason"
                  placeholder="Expliquez la raison du remboursement (ex: demande client, erreur de facturation, doublon...)"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ce motif sera inclus dans la notification envoyée à
                  l&apos;utilisateur.
                </p>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefundTarget(null);
                    setRefundReason("");
                  }}
                  disabled={pendingRefundId !== null}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleRefund}
                  disabled={
                    pendingRefundId !== null || refundReason.trim().length === 0
                  }
                  className="bg-italian-red text-white hover:bg-italian-red/90"
                >
                  {pendingRefundId !== null ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Remboursement...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-1.5 size-4" />
                      Confirmer le remboursement
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
