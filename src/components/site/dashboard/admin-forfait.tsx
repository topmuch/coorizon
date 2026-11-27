"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Settings2,
  TrendingUp,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSectionAlerts } from "../dashboard/admin-section-alerts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded" | "Cancelled";

interface ForfaitConfig {
  name: string;
  description: string;
  amount: number;
  currency: string;
  durationLabel: string;
  serviceId?: string | null;
}

interface ForfaitPaymentUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  hasFormationAccess: boolean;
}

interface ForfaitPayment {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: PaymentStatus;
  provider: string | null;
  invoiceNumber: string | null;
  paidAt: string | null;
  createdAt: string;
  user: ForfaitPaymentUser;
}

interface ForfaitStats {
  pending: number;
  paid: number;
  cancelled: number;
  revenue: number;
  currency: string;
}

interface ForfaitResponse {
  forfait: ForfaitConfig;
  payments: ForfaitPayment[];
  total: number;
  stats: ForfaitStats;
}

interface EnrollResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  payment: {
    id: string;
    invoiceNumber: string | null;
    amount: number;
    currency: string;
    status: string;
  };
}

interface EnrollSuccessData {
  name: string;
  email: string;
  password: string;
  invoiceNumber: string | null;
}

type ForfaitTab = "pending" | "paid" | "cancelled" | "all";

const TAB_TO_STATUS: Record<ForfaitTab, string | undefined> = {
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
  all: undefined,
};

const CURRENCIES = ["FCFA", "EUR", "USD"] as const;

// ─── Display helpers ────────────────────────────────────────────────────────

function statusLabel(status: PaymentStatus): string {
  switch (status) {
    case "Pending":
      return "En attente de validation";
    case "Paid":
      return "Payé";
    case "Cancelled":
      return "Annulé";
    case "Refunded":
      return "Remboursé";
    case "Failed":
      return "Échoué";
    default:
      return status;
  }
}

function statusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case "Pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Paid":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Cancelled":
      return "bg-muted text-muted-foreground border-border";
    case "Refunded":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "Failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", statusBadgeClass(status))}
    >
      {statusLabel(status)}
    </Badge>
  );
}

function AccessBadge({ hasAccess }: { hasAccess: boolean }) {
  if (hasAccess) {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-800">
        Accès complet
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-muted text-muted-foreground border-border"
    >
      Accès limité
    </Badge>
  );
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" });

function formatDateTimeFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${dateFmt.format(d)} à ${timeFmt.format(d)}`;
}

function fullName(user: ForfaitPaymentUser): string {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name.length > 0 ? name : user.email;
}

const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(): string {
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += PASSWORD_CHARSET.charAt(
      Math.floor(Math.random() * PASSWORD_CHARSET.length)
    );
  }
  return password;
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AdminForfait() {
  const { toast } = useToast();

  // List state
  const [forfait, setForfait] = React.useState<ForfaitConfig | null>(null);
  const [payments, setPayments] = React.useState<ForfaitPayment[]>([]);
  const [stats, setStats] = React.useState<ForfaitStats>({
    pending: 0,
    paid: 0,
    cancelled: 0,
    revenue: 0,
    currency: "FCFA",
  });
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<ForfaitTab>("pending");

  // Per-row action state
  const [actionPendingId, setActionPendingId] = React.useState<string | null>(
    null
  );

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = React.useState<ForfaitPayment | null>(
    null
  );
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectPending, setRejectPending] = React.useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = React.useState(false);
  const [editPending, setEditPending] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: "",
    amount: "",
    currency: "FCFA",
    durationLabel: "",
    description: "",
  });

  // Enroll dialog state
  const [enrollOpen, setEnrollOpen] = React.useState(false);
  const [enrollPending, setEnrollPending] = React.useState(false);
  const [enrollForm, setEnrollForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  // Enroll success dialog (keeps the typed/generated password until closed)
  const [enrollSuccess, setEnrollSuccess] =
    React.useState<EnrollSuccessData | null>(null);

  // ─── Fetch list ─────────────────────────────────────────────────────────
  const fetchForfait = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = TAB_TO_STATUS[tab];
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      const res = await fetch(`/api/admin/forfait?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement du forfait.");
      }
      const data = (await res.json()) as ForfaitResponse;
      setForfait(data.forfait);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setStats(data.stats);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => {
    fetchForfait();
  }, [fetchForfait]);

  // ─── Edit forfait ───────────────────────────────────────────────────────
  const openEdit = () => {
    if (!forfait) return;
    const currencyUpper = forfait.currency.toUpperCase();
    const currency = (CURRENCIES as readonly string[]).includes(currencyUpper)
      ? currencyUpper
      : "FCFA";
    setEditForm({
      name: forfait.name,
      amount: String(forfait.amount),
      currency,
      durationLabel: forfait.durationLabel ?? "",
      description: forfait.description ?? "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!forfait) return;
    const amount = Number(editForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Montant invalide",
        description: "Veuillez saisir un montant supérieur à zéro.",
      });
      return;
    }
    setEditPending(true);
    try {
      const res = await fetch("/api/admin/forfait", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          amount,
          currency: editForm.currency,
          durationLabel: editForm.durationLabel.trim(),
          description: editForm.description.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la mise à jour du forfait.");
      }
      const data = (await res.json()) as { forfait: ForfaitConfig };
      setForfait(data.forfait);
      toast({
        title: "Forfait mis à jour",
        description: "Les informations du forfait ont été enregistrées.",
      });
      setEditOpen(false);
      await fetchForfait();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setEditPending(false);
    }
  };

  // ─── Enroll a paid client ───────────────────────────────────────────────
  const openEnroll = () => {
    setEnrollForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    });
    setEnrollOpen(true);
  };

  const handleGeneratePassword = () => {
    setEnrollForm((f) => ({ ...f, password: generatePassword() }));
  };

  const handleEnrollSubmit = async () => {
    const firstName = enrollForm.firstName.trim();
    const lastName = enrollForm.lastName.trim();
    const email = enrollForm.email.trim();
    const phone = enrollForm.phone.trim();
    const password = enrollForm.password;
    if (!firstName || !lastName || !email || !password) {
      toast({
        variant: "destructive",
        title: "Champs obligatoires",
        description:
          "Veuillez renseigner le prénom, le nom, l'email et le mot de passe.",
      });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({
        variant: "destructive",
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide.",
      });
      return;
    }
    setEnrollPending(true);
    try {
      const res = await fetch("/api/admin/forfait/enroll", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          ...(phone ? { phone } : {}),
          password,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de l'inscription du client.");
      }
      const data = (await res.json()) as EnrollResponse;
      setEnrollSuccess({
        name: `${data.user.firstName} ${data.user.lastName}`.trim(),
        email: data.user.email,
        password,
        invoiceNumber: data.payment.invoiceNumber,
      });
      setEnrollOpen(false);
      setEnrollForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
      });
      await fetchForfait();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setEnrollPending(false);
    }
  };

  // ─── Validate / reject actions ──────────────────────────────────────────
  const handleValidate = async (payment: ForfaitPayment) => {
    setActionPendingId(payment.id);
    try {
      const res = await fetch("/api/admin/forfait/validate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, action: "validate" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la validation du forfait.");
      }
      toast({
        title: "Forfait validé",
        description:
          "Le client a maintenant accès complet à la plateforme.",
      });
      await fetchForfait();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setActionPendingId(null);
    }
  };

  const openReject = (payment: ForfaitPayment) => {
    setRejectReason("");
    setRejectTarget(payment);
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setRejectPending(true);
    try {
      const res = await fetch("/api/admin/forfait/validate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: rejectTarget.id,
          action: "reject",
          ...(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du rejet de la demande.");
      }
      toast({
        title: "Demande rejetée",
        description: "La demande de paiement du forfait a été rejetée.",
      });
      setRejectTarget(null);
      setRejectReason("");
      await fetchForfait();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setRejectPending(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <GraduationCap className="size-6 text-brand" />
            Forfait Formation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Forfait d&apos;accès complet à la formation — validé par
            l&apos;administration
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={openEdit}
            disabled={!forfait}
          >
            <Settings2 className="mr-1.5 size-4" />
            Modifier le forfait
          </Button>
          <Button
            type="button"
            className="bg-brand hover:bg-brand/90"
            onClick={openEnroll}
          >
            <UserPlus className="mr-1.5 size-4" />
            Inscrire un client (payé)
          </Button>
        </div>
      </header>

      {/* Visual notifications: new forfait requests targeting this tab. */}
      <AdminSectionAlerts section="forfait" />

      {/* Config card */}
      {forfait && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="size-5 text-brand" />
                {forfait.name}
              </CardTitle>
              <CardDescription>
                Configuration actuelle du forfait d&apos;accès à la formation.
              </CardDescription>
            </div>
            {forfait.durationLabel && (
              <Badge
                variant="outline"
                className="border-brand/20 bg-brand/10 text-brand"
              >
                {forfait.durationLabel}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-ink">
                {formatAmount(forfait.amount, forfait.currency)}
              </span>
              <span className="text-xs text-muted-foreground">
                Prix du forfait
              </span>
            </div>
            {forfait.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {forfait.description}
              </p>
            )}
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>
                Les candidats doivent acquérir ce forfait pour accéder à
                l&apos;intégralité de la plateforme.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <section
        aria-label="Statistiques du forfait"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                En attente
              </div>
              <div className="text-2xl font-bold text-ink">{stats.pending}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Validés
              </div>
              <div className="text-2xl font-bold text-ink">{stats.paid}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
              <TrendingUp className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Revenus
              </div>
              <div className="text-2xl font-bold text-ink">
                {formatAmount(stats.revenue, stats.currency)}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Filter tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ForfaitTab)}
        className="w-full"
      >
        <TabsList className="flex w-full flex-wrap sm:w-auto">
          <TabsTrigger value="pending" className="flex-1 sm:flex-initial">
            En attente ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex-1 sm:flex-initial">
            Validées ({stats.paid})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 sm:flex-initial">
            Annulées ({stats.cancelled})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1 sm:flex-initial">
            Toutes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void fetchForfait()}
            >
              <RefreshCw className="mr-1.5 size-4" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="size-8 animate-spin text-brand" />
            <p className="text-sm text-muted-foreground">
              Chargement du forfait et des demandes...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && payments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Wallet className="size-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-ink">
              Aucune demande pour ce filtre
            </p>
            <p className="text-sm text-muted-foreground">
              Les demandes d&apos;acquisition du forfait apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Requests list */}
      {!loading && !error && payments.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {total} demande{total > 1 ? "s" : ""}
            {tab === "all" ? " au total" : " pour ce filtre"}.
          </p>

          {/* Desktop table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <div className="max-h-[28rem] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="min-w-[220px]">Client</TableHead>
                      <TableHead>Date de demande</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Accès</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-ink">
                              {fullName(p.user)}
                            </div>
                            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Mail className="size-3" />
                              {p.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTimeFr(p.createdAt)}
                        </TableCell>
                        <TableCell className="font-semibold text-ink">
                          {formatAmount(p.amount, p.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell>
                          <AccessBadge hasAccess={p.user.hasFormationAccess} />
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "Pending" ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-brand hover:bg-brand/90"
                                disabled={actionPendingId === p.id}
                                onClick={() => void handleValidate(p)}
                              >
                                {actionPendingId === p.id ? (
                                  <Loader2 className="mr-1 size-4 animate-spin" />
                                ) : (
                                  <Check className="mr-1 size-4" />
                                )}
                                Valider
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-italian-red/30 text-italian-red hover:bg-italian-red/5 hover:text-italian-red"
                                disabled={actionPendingId === p.id}
                                onClick={() => openReject(p)}
                              >
                                <X className="mr-1 size-4" />
                                Rejeter
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">
                        {fullName(p.user)}
                      </div>
                      <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        {p.user.email}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Date de demande
                      </div>
                      <div className="mt-0.5 text-sm text-ink">
                        {formatDateTimeFr(p.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Montant
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-ink">
                        {formatAmount(p.amount, p.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Accès
                      </div>
                      <div className="mt-0.5">
                        <AccessBadge hasAccess={p.user.hasFormationAccess} />
                      </div>
                    </div>
                  </div>
                  {p.status === "Pending" && (
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 bg-brand hover:bg-brand/90"
                        disabled={actionPendingId === p.id}
                        onClick={() => void handleValidate(p)}
                      >
                        {actionPendingId === p.id ? (
                          <Loader2 className="mr-1.5 size-4 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 size-4" />
                        )}
                        Valider
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 border-italian-red/30 text-italian-red hover:bg-italian-red/5 hover:text-italian-red"
                        disabled={actionPendingId === p.id}
                        onClick={() => openReject(p)}
                      >
                        <X className="mr-1.5 size-4" />
                        Rejeter
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ─── Edit forfait dialog ────────────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-5 text-brand" />
              Modifier le forfait
            </DialogTitle>
            <DialogDescription>
              Mettez à jour le nom, le prix ou la description du forfait
              affiché aux candidats.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forfait-name">Nom</Label>
              <Input
                id="forfait-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Forfait Formation"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="forfait-amount">Montant</Label>
                <Input
                  id="forfait-amount"
                  type="number"
                  min={0}
                  step={1000}
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="forfait-currency">Devise</Label>
                <Select
                  value={editForm.currency}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, currency: v }))
                  }
                >
                  <SelectTrigger id="forfait-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="forfait-duration">Durée / mention</Label>
              <Input
                id="forfait-duration"
                value={editForm.durationLabel}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, durationLabel: e.target.value }))
                }
                placeholder="Accès permanent"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="forfait-description">Description</Label>
              <Textarea
                id="forfait-description"
                rows={4}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Décrivez le contenu du forfait..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-brand hover:bg-brand/90"
              onClick={() => void handleEditSubmit()}
              disabled={editPending}
            >
              {editPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-4" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Enroll paid client dialog ──────────────────────────────────── */}
      <Dialog
        open={enrollOpen}
        onOpenChange={(open) => {
          if (!open) setEnrollOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-brand" />
              Inscrire un client (payé)
            </DialogTitle>
            <DialogDescription>
              Créez le compte du client et marquez son forfait comme payé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="enroll-firstname">
                  Prénom <span className="text-italian-red">*</span>
                </Label>
                <Input
                  id="enroll-firstname"
                  value={enrollForm.firstName}
                  onChange={(e) =>
                    setEnrollForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  placeholder="Awa"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enroll-lastname">
                  Nom <span className="text-italian-red">*</span>
                </Label>
                <Input
                  id="enroll-lastname"
                  value={enrollForm.lastName}
                  onChange={(e) =>
                    setEnrollForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  placeholder="Diop"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enroll-email">
                Email <span className="text-italian-red">*</span>
              </Label>
              <Input
                id="enroll-email"
                type="email"
                value={enrollForm.email}
                onChange={(e) =>
                  setEnrollForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="client@exemple.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enroll-phone">Téléphone</Label>
              <Input
                id="enroll-phone"
                type="tel"
                value={enrollForm.phone}
                onChange={(e) =>
                  setEnrollForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+221 77 000 00 00 (optionnel)"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enroll-password">
                Mot de passe <span className="text-italian-red">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="enroll-password"
                  type="password"
                  autoComplete="new-password"
                  className="flex-1"
                  value={enrollForm.password}
                  onChange={(e) =>
                    setEnrollForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePassword}
                >
                  <KeyRound className="mr-1.5 size-4" />
                  Générer
                </Button>
              </div>
            </div>

            <p className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              Le compte est créé actif et le forfait est déjà marqué payé —
              l&apos;accès complet est immédiat.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEnrollOpen(false)}
              disabled={enrollPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-brand hover:bg-brand/90"
              onClick={() => void handleEnrollSubmit()}
              disabled={enrollPending}
            >
              {enrollPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 size-4" />
              )}
              Inscrire le client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Enroll success dialog ──────────────────────────────────────── */}
      <Dialog
        open={enrollSuccess !== null}
        onOpenChange={(open) => {
          if (!open) setEnrollSuccess(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Client inscrit
            </DialogTitle>
            <DialogDescription>
              Le compte a été créé et le forfait a été marqué comme payé.
            </DialogDescription>
          </DialogHeader>

          {enrollSuccess && (
            <div className="space-y-4">
              <div className="divide-y divide-border rounded-lg border border-border px-3">
                <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Client
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {enrollSuccess.name}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Email
                  </span>
                  <span className="truncate text-sm text-ink">
                    {enrollSuccess.email}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Mot de passe
                  </span>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm text-ink">
                    {enrollSuccess.password}
                  </code>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    N° de facture
                  </span>
                  <span className="text-sm text-ink">
                    {enrollSuccess.invoiceNumber ?? "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <KeyRound className="mt-0.5 size-4 shrink-0" />
                <span>
                  Transmettez ces identifiants au client de manière sécurisée.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              className="bg-brand hover:bg-brand/90"
              onClick={() => setEnrollSuccess(null)}
            >
              Terminer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject request dialog ──────────────────────────────────────── */}
      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter la demande</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget
                ? `Demande de ${fullName(rejectTarget.user)} — ${formatAmount(
                    rejectTarget.amount,
                    rejectTarget.currency
                  )}. Le client sera informé du rejet de sa demande.`
                : null}
          </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Motif (optionnel)</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex : paiement non reçu, demande dupliquée..."
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectPending}>
              Annuler
            </AlertDialogCancel>
            <Button
              type="button"
              className="bg-italian-red text-white hover:bg-italian-red/90"
              onClick={() => void handleRejectSubmit()}
              disabled={rejectPending}
            >
              {rejectPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <X className="mr-1.5 size-4" />
              )}
              Rejeter la demande
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
