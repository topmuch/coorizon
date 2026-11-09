"use client";

import * as React from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Eye,
  Clock,
  FileText,
  Users,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Briefcase,
  Hash,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

/**
 * AdminCompanies — back-office section for company validation & lifecycle
 * management (LOT 5 — Task 5-c).
 *
 * An admin can:
 *   • browse ALL companies and filter by status;
 *   • validate a Pending company (→ Validated, activates Pending recruiters);
 *   • reject a Pending company with a reason (→ Rejected);
 *   • suspend a Validated company (→ Suspended, suspends its recruiters);
 *   • reactivate a Suspended company (→ Validated);
 *   • re-queue a Rejected company (→ Pending);
 *   • open a detail dialog with documents + recruiters + counts.
 *
 * Every mutation goes through PUT /api/admin/companies/[id] with the proper
 * status payload; the server runs the recruiter cascade inside a transaction.
 */

// ── Local types (avoid importing @prisma/client on the client) ──────────────

type CompanyStatus = "Pending" | "Validated" | "Suspended" | "Rejected";

type DocumentStatus =
  | "Pending"
  | "Validated"
  | "Refused"
  | "Expired"
  | "NotProvided";

type UserStatus = "Active" | "Pending" | "Suspended" | "Deactivated";

interface CompanyDocument {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  createdAt: string;
}

interface RecruiterRow {
  id: string;
  responsibleName: string | null;
  responsiblePhone: string | null;
  responsibleEmail: string | null;
  jobTitle: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    status: UserStatus;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
}

interface Company {
  id: string;
  legalName: string;
  registrationNumber: string | null;
  taxId: string | null;
  vatNumber: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  website: string | null;
  sector: string | null;
  size: string | null;
  status: CompanyStatus;
  validatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  recruiters?: RecruiterRow[];
  documents?: CompanyDocument[];
  _count?: { jobOffers: number };
}

interface CompaniesListResponse {
  companies: Company[];
}

interface CompanyDetailResponse {
  company: Company;
  applicationsCount: number;
}

// ── Status metadata ──────────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

function getStatusMeta(status: CompanyStatus): StatusMeta {
  switch (status) {
    case "Pending":
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-100 text-amber-800",
        icon: Clock,
      };
    case "Validated":
      return {
        label: "Validée",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      };
    case "Suspended":
      return {
        label: "Suspendue",
        className: "border-red-200 bg-red-100 text-red-800",
        icon: Pause,
      };
    case "Rejected":
      return {
        label: "Rejetée",
        className: "border-zinc-200 bg-zinc-200 text-zinc-700",
        icon: XCircle,
      };
    default:
      return {
        label: status,
        className: "border-border bg-muted text-muted-foreground",
        icon: Clock,
      };
  }
}

function getDocStatusBadge(status: DocumentStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "Validated":
      return {
        label: "Validé",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
      };
    case "Pending":
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-100 text-amber-800",
      };
    case "Refused":
    case "Expired":
      return {
        label: status === "Expired" ? "Expiré" : "Refusé",
        className: "border-red-200 bg-red-100 text-red-800",
      };
    default:
      return {
        label: "Fourni",
        className: "border-border bg-muted text-muted-foreground",
      };
  }
}

function getDocTypeLabel(type: string): string {
  switch (type) {
    case "CompanyRegistration":
      return "Extrait de registre / Kbis";
    case "TaxId":
      return "Code fiscal";
    case "IDDocument":
      return "Pièce d'identité du responsable";
    default:
      return type;
  }
}

function getUserStatusMeta(status: UserStatus): { label: string; className: string } {
  switch (status) {
    case "Active":
      return {
        label: "Actif",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
      };
    case "Pending":
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-100 text-amber-800",
      };
    case "Suspended":
      return {
        label: "Suspendu",
        className: "border-red-200 bg-red-100 text-red-800",
      };
    case "Deactivated":
      return {
        label: "Désactivé",
        className: "border-zinc-200 bg-zinc-200 text-zinc-700",
      };
    default:
      return {
        label: status,
        className: "border-border bg-muted text-muted-foreground",
      };
  }
}

// ── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "Pending" | "Validated" | "Suspended" | "Rejected";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "Toutes",
  Pending: "En attente",
  Validated: "Validées",
  Suspended: "Suspendues",
  Rejected: "Rejetées",
};

// ── Date helpers ─────────────────────────────────────────────────────────────

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
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Main component ───────────────────────────────────────────────────────────

export function AdminCompanies() {
  const { toast } = useToast();

  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [changingId, setChangingId] = React.useState<string | null>(null);

  // Detail dialog state
  const [detailCompany, setDetailCompany] = React.useState<CompanyDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Reject dialog state
  const [rejectCompany, setRejectCompany] = React.useState<Company | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejecting, setRejecting] = React.useState(false);

  // Suspend confirm state
  const [suspendCompany, setSuspendCompany] = React.useState<Company | null>(null);
  const [suspending, setSuspending] = React.useState(false);

  // ── Fetch companies list ─────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/companies", window.location.origin);
      if (tab !== "all") url.searchParams.set("status", tab);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Échec du chargement des entreprises."
        );
      }
      const data = (await res.json()) as CompaniesListResponse;
      setCompanies(data.companies);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Update company status (PUT) ──────────────────────────────────────
  const updateStatus = async (
    company: Company,
    status: CompanyStatus,
    reason?: string
  ) => {
    setChangingId(company.id);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, reason: reason ?? null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la mise à jour du statut.");
      }
      toast({
        title: "Statut mis à jour",
        description: `« ${company.legalName} » est maintenant « ${getStatusMeta(
          status
        ).label.toLowerCase()} ».`,
      });
      void load();
      // Refresh detail dialog if it is open on this company
      if (detailCompany?.company.id === company.id) {
        void refreshDetail(company.id);
      }
    } catch (e) {
      toast({
        title: "Action impossible",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setChangingId(null);
    }
  };

  // ── Open detail dialog ───────────────────────────────────────────────
  const refreshDetail = React.useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des détails.");
      }
      const data = (await res.json()) as CompanyDetailResponse;
      setDetailCompany(data);
    } catch (e) {
      toast({
        title: "Détails indisponibles",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  const openDetail = (company: Company) => {
    setDetailOpen(true);
    void refreshDetail(company.id);
  };

  // ── Reject handler ───────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectCompany) return;
    setRejecting(true);
    await updateStatus(rejectCompany, "Rejected", rejectReason);
    setRejecting(false);
    setRejectCompany(null);
    setRejectReason("");
  };

  // ── Suspend handler ──────────────────────────────────────────────────
  const handleSuspend = async () => {
    if (!suspendCompany) return;
    setSuspending(true);
    await updateStatus(suspendCompany, "Suspended");
    setSuspending(false);
    setSuspendCompany(null);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy">Entreprises</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Validez les entreprises inscrites, suspendez ou réactivez les comptes
          et consultez leurs documents justificatifs.
        </p>
      </header>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy">
              Aucune entreprise dans cette catégorie
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Les nouvelles inscriptions d'entreprises apparaîtront ici en
              attente de validation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as FilterTab)}
            className="w-full"
          >
            <TabsList className="flex w-full max-w-2xl flex-wrap">
              {(Object.keys(TAB_LABELS) as FilterTab[]).map((t) => (
                <TabsTrigger key={t} value={t} className="flex-1">
                  {TAB_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Desktop table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Entreprise</TableHead>
                    <TableHead>Secteur</TableHead>
                    <TableHead>Ville / Région</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Recruteurs</TableHead>
                    <TableHead className="text-center">Offres</TableHead>
                    <TableHead>Inscrite le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <CompanyTableRow
                      key={company.id}
                      company={company}
                      changing={changingId === company.id}
                      onValidate={() => updateStatus(company, "Validated")}
                      onReject={() => {
                        setRejectCompany(company);
                        setRejectReason("");
                      }}
                      onSuspend={() => setSuspendCompany(company)}
                      onReactivate={() => updateStatus(company, "Validated")}
                      onRequeue={() => updateStatus(company, "Pending")}
                      onView={() => openDetail(company)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-4 lg:hidden">
            {companies.map((company) => (
              <li key={company.id}>
                <CompanyCardMobile
                  company={company}
                  changing={changingId === company.id}
                  onValidate={() => updateStatus(company, "Validated")}
                  onReject={() => {
                    setRejectCompany(company);
                    setRejectReason("");
                  }}
                  onSuspend={() => setSuspendCompany(company)}
                  onReactivate={() => updateStatus(company, "Validated")}
                  onRequeue={() => updateStatus(company, "Pending")}
                  onView={() => openDetail(company)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Detail dialog */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailCompany(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <Building2 className="h-5 w-5 text-brand" />
              {detailCompany?.company.legalName ?? "Chargement…"}
            </DialogTitle>
            <DialogDescription>
              Détails de l'entreprise, documents et recruteurs associés.
            </DialogDescription>
          </DialogHeader>

          {detailLoading && !detailCompany ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : detailCompany ? (
            <CompanyDetailBody detail={detailCompany} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject dialog with reason */}
      <Dialog
        open={!!rejectCompany}
        onOpenChange={(open) => {
          if (!open && !rejecting) {
            setRejectCompany(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <XCircle className="h-5 w-5 text-italian-red" />
              Rejeter l'entreprise
            </DialogTitle>
            <DialogDescription>
              {rejectCompany && (
                <>
                  Indiquez la raison du rejet de «{" "}
                  <strong>{rejectCompany.legalName}</strong> ». Le recruteur
                  principal en sera informé.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Raison du rejet</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex. documents manquants, activité non conforme…"
              rows={4}
              disabled={rejecting}
            />
            <p className="text-xs text-muted-foreground">
              Une raison claire aide l'entreprise à corriger sa demande.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectCompany(null);
                setRejectReason("");
              }}
              disabled={rejecting}
            >
              Annuler
            </Button>
            <Button
              className="bg-italian-red text-white hover:bg-italian-red/90"
              onClick={() => void handleReject()}
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rejet en cours…
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Confirmer le rejet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend confirm */}
      <AlertDialog
        open={!!suspendCompany}
        onOpenChange={(open) => {
          if (!open && !suspending) {
            setSuspendCompany(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-navy">
              <Pause className="h-5 w-5 text-italian-red" />
              Suspendre cette entreprise ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendCompany && (
                <>
                  « <strong>{suspendCompany.legalName}</strong> » sera
                  suspendue. Tous ses recruteurs seront automatiquement
                  suspendus et ne pourront plus se connecter. L'action est
                  réversible (réactivation possible).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSuspend();
              }}
              disabled={suspending}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {suspending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suspension…
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Suspendre
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CompanyStatus }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <Badge className={`px-2.5 py-1 text-xs font-medium ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

// ── Action buttons (shared between table & card) ─────────────────────────────

interface CompanyActionsProps {
  company: Company;
  changing: boolean;
  onValidate: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onRequeue: () => void;
  onView: () => void;
}

function CompanyActions({
  company,
  changing,
  onValidate,
  onReject,
  onSuspend,
  onReactivate,
  onRequeue,
  onView,
}: CompanyActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onView}
        title="Voir les détails"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="lg:sr-only">Détails</span>
      </Button>

      {company.status === "Pending" && (
        <>
          <Button
            size="sm"
            onClick={onValidate}
            disabled={changing}
            className="bg-brand-green text-white hover:bg-brand-green/90"
            title="Valider l'entreprise"
          >
            {changing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Valider
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={changing}
            className="border-italian-red/30 text-italian-red hover:bg-italian-red/10 hover:text-italian-red"
            title="Rejeter l'entreprise"
          >
            <XCircle className="h-3.5 w-3.5" />
            Rejeter
          </Button>
        </>
      )}

      {company.status === "Validated" && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSuspend}
          disabled={changing}
          title="Suspendre l'entreprise"
        >
          {changing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
          Suspendre
        </Button>
      )}

      {company.status === "Suspended" && (
        <Button
          size="sm"
          onClick={onReactivate}
          disabled={changing}
          className="bg-brand-green text-white hover:bg-brand-green/90"
          title="Réactiver l'entreprise"
        >
          {changing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Réactiver
        </Button>
      )}

      {company.status === "Rejected" && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRequeue}
          disabled={changing}
          title="Repasser en attente"
        >
          {changing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          Repasser en attente
        </Button>
      )}
    </div>
  );
}

// ── Desktop table row ────────────────────────────────────────────────────────

function CompanyTableRow(props: CompanyActionsProps) {
  const { company } = props;
  const location = [company.city, company.region].filter(Boolean).join(", ");
  const recruiterCount = company.recruiters?.length ?? 0;
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-navy">
              {company.legalName}
            </div>
            {company.size && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {company.size}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {company.sector || "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {location || "—"}
      </TableCell>
      <TableCell>
        <StatusBadge status={company.status} />
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex items-center gap-1 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {recruiterCount}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex items-center gap-1 text-sm">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          {company._count?.jobOffers ?? 0}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateFr(company.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <CompanyActions {...props} />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Mobile card ──────────────────────────────────────────────────────────────

function CompanyCardMobile(props: CompanyActionsProps) {
  const { company } = props;
  const location = [company.city, company.region].filter(Boolean).join(", ");
  const recruiterCount = company.recruiters?.length ?? 0;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-navy">
              {company.legalName}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {location || "—"}
            </p>
          </div>
          <StatusBadge status={company.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {company.sector && (
            <span className="rounded bg-muted px-1.5 py-0.5">
              {company.sector}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {recruiterCount} recruteur{recruiterCount > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {company._count?.jobOffers ?? 0} offre
            {(company._count?.jobOffers ?? 0) > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateFr(company.createdAt)}
          </span>
        </div>

        <div className="border-t pt-3">
          <CompanyActions {...props} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Company detail body (dialog content) ─────────────────────────────────────

function CompanyDetailBody({ detail }: { detail: CompanyDetailResponse }) {
  const { company, applicationsCount } = detail;
  const location = [company.address, company.city, company.region]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={company.status} />
        {company.validatedAt && (
          <span className="text-xs text-muted-foreground">
            Validée le {formatDateFr(company.validatedAt)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Inscrite le {formatDateFr(company.createdAt)}
        </span>
      </div>

      {company.status === "Rejected" && company.rejectionReason && (
        <Alert variant="destructive">
          <AlertTitle>Motif du rejet</AlertTitle>
          <AlertDescription>{company.rejectionReason}</AlertDescription>
        </Alert>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DetailStat
          icon={Users}
          label="Recruteurs"
          value={String(company.recruiters?.length ?? 0)}
        />
        <DetailStat
          icon={Briefcase}
          label="Offres"
          value={String(company._count?.jobOffers ?? 0)}
        />
        <DetailStat
          icon={FileText}
          label="Candidatures reçues"
          value={String(applicationsCount)}
        />
      </div>

      <Separator />

      {/* Company info */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy">Informations légales</h4>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <DetailField icon={Building2} label="Raison sociale" value={company.legalName} />
          <DetailField icon={Hash} label="N° d'immatriculation" value={company.registrationNumber} />
          <DetailField icon={Hash} label="Code fiscal" value={company.taxId} />
          <DetailField icon={Hash} label="N° TVA" value={company.vatNumber} />
          <DetailField icon={MapPin} label="Adresse" value={location || "—"} />
          <DetailField icon={Globe} label="Pays" value={company.country} />
          <DetailField icon={Globe} label="Site web" value={company.website} />
          <DetailField icon={Briefcase} label="Secteur" value={company.sector} />
          <DetailField icon={Users} label="Taille" value={company.size} />
        </dl>
      </section>

      {/* Documents */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <FileText className="h-4 w-4" />
          Documents justificatifs
        </h4>
        {company.documents && company.documents.length > 0 ? (
          <ul className="space-y-2">
            {company.documents.map((doc) => {
              const badge = getDocStatusBadge(doc.status);
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-navy">
                      {getDocTypeLabel(doc.type)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {doc.fileName} · {formatFileSize(doc.sizeBytes)}
                    </div>
                  </div>
                  <Badge className={`px-2 py-0.5 text-xs ${badge.className}`}>
                    {badge.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            Aucun document téléversé.
          </p>
        )}
      </section>

      {/* Recruiters */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Users className="h-4 w-4" />
          Recruteurs associés
        </h4>
        {company.recruiters && company.recruiters.length > 0 ? (
          <ul className="space-y-2">
            {company.recruiters.map((r) => {
              const meta = getUserStatusMeta(r.user.status);
              const fullName =
                [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") ||
                r.user.email;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-navy">
                        {fullName}
                        {r.jobTitle && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            · {r.jobTitle}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {r.user.email}
                        </span>
                        {(r.user.phone || r.responsiblePhone) && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {r.user.phone || r.responsiblePhone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Dernière connexion :{" "}
                          {formatDateTimeFr(r.user.lastLoginAt)}
                        </span>
                      </div>
                    </div>
                    <Badge className={`px-2 py-0.5 text-xs ${meta.className}`}>
                      {meta.label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            Aucun recruteur rattaché.
          </p>
        )}
      </section>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-navy">{value}</div>
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm text-navy">{value || "—"}</dd>
      </div>
    </div>
  );
}
