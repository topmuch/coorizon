"use client";

import * as React from "react";
import {
  Plane,
  Users,
  Building2,
  Search,
  Eye,
  UserPlus,
  Plus,
  AlertTriangle,
  RefreshCw,
  Inbox,
  Loader2,
  ShieldAlert,
  Briefcase,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────

type ImmigrationCaseStatus =
  | "Open"
  | "InProgress"
  | "DocumentsPending"
  | "VisaPending"
  | "Ready"
  | "Closed"
  | "OnHold";

interface CandidateSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface AgentSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface CompanySummary {
  id: string;
  legalName: string;
}

interface JobOfferSummary {
  id: string;
  title: string;
}

interface ImmigrationCaseListItem {
  id: string;
  status: ImmigrationCaseStatus;
  priority: string;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  candidate: CandidateSummary;
  agent: AgentSummary | null;
  company: CompanySummary | null;
  jobOffer: JobOfferSummary | null;
  _count: { tasks: number };
}

interface ListResponse {
  cases: ImmigrationCaseListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserListItem {
  id: string;
  email: string;
  role: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
}

interface UsersListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: ImmigrationCaseStatus; label: string }[] = [
  { value: "Open", label: "Ouvert" },
  { value: "InProgress", label: "En cours" },
  { value: "DocumentsPending", label: "Documents en attente" },
  { value: "VisaPending", label: "Visa en attente" },
  { value: "Ready", label: "Prêt" },
  { value: "Closed", label: "Clôturé" },
  { value: "OnHold", label: "En pause" },
];

const PRIORITY_OPTIONS = [
  { value: "Normal", label: "Normal" },
  { value: "Haute", label: "Haute" },
  { value: "Urgente", label: "Urgente" },
] as const;

const CONFIRMATION_REQUIRED_STATUSES: ReadonlySet<string> = new Set([
  "Ready",
  "Closed",
]);

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ImmigrationCaseStatus, string> = {
  Open: "Ouvert",
  InProgress: "En cours",
  DocumentsPending: "Documents en attente",
  VisaPending: "Visa en attente",
  Ready: "Prêt",
  Closed: "Clôturé",
  OnHold: "En pause",
};

function caseStatusBadgeClass(status: ImmigrationCaseStatus): string {
  switch (status) {
    case "Open":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "InProgress":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "DocumentsPending":
      return "bg-orange-50 text-orange-800 border border-orange-200";
    case "VisaPending":
      return "bg-purple-50 text-purple-800 border border-purple-200";
    case "Ready":
      return "bg-brand-green/15 text-brand-green border border-brand-green/30";
    case "Closed":
      return "bg-muted text-muted-foreground border border-border";
    case "OnHold":
      return "bg-muted text-muted-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

const PRIORITY_LABELS: Record<string, string> = {
  Normal: "Normal",
  Haute: "Haute",
  Urgente: "Urgente",
};

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "Urgente":
      return "bg-italian-red/10 text-italian-red border border-italian-red/30";
    case "Haute":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "Normal":
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fullName(first: string | null, last: string | null): string {
  return `${first ?? ""} ${last ?? ""}`.trim();
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminImmigration() {
  const { toast } = useToast();
  const [cases, setCases] = React.useState<ImmigrationCaseListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<"all" | ImmigrationCaseStatus>("all");
  const [agentFilter, setAgentFilter] = React.useState<"all" | "unassigned" | string>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");

  // Agents list (for the agent filter + assign dialog)
  const [agents, setAgents] = React.useState<UserListItem[]>([]);

  // Dialogs state
  const [detailCase, setDetailCase] = React.useState<ImmigrationCaseListItem | null>(null);
  const [assignCase, setAssignCase] = React.useState<ImmigrationCaseListItem | null>(null);
  const [statusCase, setStatusCase] = React.useState<ImmigrationCaseListItem | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Fetch agents for the filter dropdown ──────────────────────────────
  React.useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({
          role: "ImmigrationAgent",
          pageSize: "100",
        });
        const res = await fetch(
          `/api/admin/users?${qs.toString()}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as UsersListResponse;
        setAgents(data.users ?? []);
      } catch {
        // best-effort
      }
    })();
  }, []);

  // ── Fetch cases ───────────────────────────────────────────────────────
  const fetchCases = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (agentFilter !== "all") qs.set("agentId", agentFilter);
      if (appliedSearch.trim()) qs.set("q", appliedSearch.trim());
      qs.set("page", String(page));
      qs.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/immigration?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des dossiers.");
      }
      const data = (await res.json()) as ListResponse;
      setCases(data.cases ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, agentFilter, appliedSearch, page]);

  React.useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Reset to page 1 whenever filters change.
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, agentFilter, appliedSearch]);

  const applySearch = () => setAppliedSearch(searchInput.trim());

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch();
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setAgentFilter("all");
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter !== "all" || agentFilter !== "all" || appliedSearch.trim().length > 0;

  // ── After mutations, refresh ──────────────────────────────────────────
  const handleMutationSuccess = async (message: string) => {
    toast({ title: "Succès", description: message });
    await fetchCases();
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Dossiers d'immigration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez l'ensemble des dossiers administratifs et l'assignation des agents.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau dossier
        </Button>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4 text-brand" />
        <AlertDescription>
          Ne passez jamais un dossier en <strong>«&nbsp;Prêt&nbsp;»</strong> ou{" "}
          <strong>«&nbsp;Clôturé&nbsp;»</strong> sans confirmation officielle
          de l'obtention du visa ou de l'autorisation. COORIZON ne garantit
          aucune décision consulaire ou gouvernementale.
        </AlertDescription>
      </Alert>

      {/* Filter bar */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="filter-status" className="text-xs text-muted-foreground">
              Statut
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | ImmigrationCaseStatus)}
            >
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-agent" className="text-xs text-muted-foreground">
              Agent
            </Label>
            <Select
              value={agentFilter}
              onValueChange={(v) => setAgentFilter(v)}
            >
              <SelectTrigger id="filter-agent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les agents</SelectItem>
                <SelectItem value="unassigned">Non assignés</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {fullName(a.firstName, a.lastName) || a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="filter-search" className="text-xs text-muted-foreground">
              Rechercher un candidat
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  placeholder="Nom, prénom ou email…"
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                />
              </div>
              <Button variant="secondary" onClick={applySearch}>
                Filtrer
              </Button>
              {hasActiveFilters ? (
                <Button variant="ghost" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases list */}
      {loading ? (
        <CasesSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : cases.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Ouvert le</TableHead>
                  <TableHead className="text-center">Tâches</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium text-navy">
                        {fullName(c.candidate.firstName, c.candidate.lastName) ||
                          c.candidate.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.candidate.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.agent ? (
                        <span className="text-sm text-navy">
                          {fullName(c.agent.firstName, c.agent.lastName)}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Non assigné
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={caseStatusBadgeClass(c.status)}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityBadgeClass(c.priority)}>
                        {PRIORITY_LABELS[c.priority] ?? c.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.company ? c.company.legalName : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateFr(c.openedAt)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {c._count.tasks}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailCase(c)}
                          aria-label="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssignCase(c)}
                          aria-label="Assigner un agent"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatusCase(c)}
                          aria-label="Changer le statut"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {cases.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-navy">
                        {fullName(c.candidate.firstName, c.candidate.lastName) ||
                          c.candidate.email}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.candidate.email}
                      </div>
                    </div>
                    <Badge className={caseStatusBadgeClass(c.status)}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge className={priorityBadgeClass(c.priority)}>
                      {PRIORITY_LABELS[c.priority] ?? c.priority}
                    </Badge>
                    <span className="text-muted-foreground">
                      Agent&nbsp;:{" "}
                      {c.agent
                        ? fullName(c.agent.firstName, c.agent.lastName)
                        : "Non assigné"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.company ? c.company.legalName : "—"}</span>
                    <span>{formatDateFr(c.openedAt)}</span>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDetailCase(c)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Détails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setAssignCase(c)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Agent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setStatusCase(c)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Statut
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - page) <= 1
                  )
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 ? (
                          <PaginationItem key={`ellipsis-${p}`}>
                            <span className="px-2 text-muted-foreground">…</span>
                          </PaginationItem>
                        ) : null}
                        <PaginationItem>
                          <PaginationLink
                            isActive={p === page}
                            onClick={() => setPage(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    );
                  })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      )}

      {/* Details dialog */}
      {detailCase ? (
        <DetailsDialog
          caseItem={detailCase}
          onClose={() => setDetailCase(null)}
        />
      ) : null}

      {/* Assign agent dialog */}
      {assignCase ? (
        <AssignAgentDialog
          caseItem={assignCase}
          agents={agents}
          onClose={() => setAssignCase(null)}
          onSuccess={(msg) => handleMutationSuccess(msg)}
        />
      ) : null}

      {/* Change status dialog */}
      {statusCase ? (
        <ChangeStatusDialog
          caseItem={statusCase}
          onClose={() => setStatusCase(null)}
          onSuccess={(msg) => handleMutationSuccess(msg)}
        />
      ) : null}

      {/* Create case dialog */}
      <CreateCaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        agents={agents}
        onSuccess={(msg) => handleMutationSuccess(msg)}
      />
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function CasesSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-navy">Aucun dossier</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {hasFilters
            ? "Aucun dossier ne correspond à vos filtres. Essayez de les élargir."
            : "Aucun dossier d'immigration n'a encore été créé. Cliquez sur « Nouveau dossier » pour commencer."}
        </p>
        {hasFilters ? (
          <Button variant="secondary" onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DetailsDialog({
  caseItem,
  onClose,
}: {
  caseItem: ImmigrationCaseListItem;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-brand" />
            Dossier de{" "}
            {fullName(caseItem.candidate.firstName, caseItem.candidate.lastName) ||
              caseItem.candidate.email}
          </DialogTitle>
          <DialogDescription>
            Ouvert le {formatDateFr(caseItem.openedAt)}
            {caseItem.closedAt
              ? ` · Clôturé le ${formatDateFr(caseItem.closedAt)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={caseStatusBadgeClass(caseItem.status)}>
              {STATUS_LABELS[caseItem.status] ?? caseItem.status}
            </Badge>
            <Badge className={priorityBadgeClass(caseItem.priority)}>
              Priorité&nbsp;: {PRIORITY_LABELS[caseItem.priority] ?? caseItem.priority}
            </Badge>
            <Badge variant="outline">
              {caseItem._count.tasks} tâche{caseItem._count.tasks > 1 ? "s" : ""}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow
              icon={Users}
              label="Candidat"
              value={
                <>
                  <div className="font-medium text-navy">
                    {fullName(caseItem.candidate.firstName, caseItem.candidate.lastName) ||
                      "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {caseItem.candidate.email}
                  </div>
                </>
              }
            />
            <DetailRow
              icon={UserPlus}
              label="Agent assigné"
              value={
                caseItem.agent ? (
                  <span className="font-medium text-navy">
                    {fullName(caseItem.agent.firstName, caseItem.agent.lastName)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Non assigné</span>
                )
              }
            />
            <DetailRow
              icon={Building2}
              label="Entreprise"
              value={
                caseItem.company ? (
                  <span className="text-navy">{caseItem.company.legalName}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
            <DetailRow
              icon={Briefcase}
              label="Offre d'emploi"
              value={
                caseItem.jobOffer ? (
                  <span className="text-navy">{caseItem.jobOffer.title}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
          </div>

          {caseItem.notes ? (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {caseItem.notes}
                </p>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function AssignAgentDialog({
  caseItem,
  agents,
  onClose,
  onSuccess,
}: {
  caseItem: ImmigrationCaseListItem;
  agents: UserListItem[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const { toast } = useToast();
  const [agentId, setAgentId] = React.useState<string>(
    caseItem.agent?.id ?? "unassigned"
  );
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (agentId === "unassigned") {
        body.agentId = null;
      } else {
        body.agentId = agentId;
      }
      const res = await fetch(`/api/admin/immigration/${caseItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast({
          title: "Échec",
          description: data.error || "Impossible d'assigner l'agent.",
          variant: "destructive",
        });
        return;
      }
      onSuccess(
        agentId === "unassigned"
          ? "Agent désassigné du dossier."
          : "Agent assigné au dossier."
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-brand" />
            Assigner un agent
          </DialogTitle>
          <DialogDescription>
            Choisissez l'agent en charge du dossier de{" "}
            {fullName(caseItem.candidate.firstName, caseItem.candidate.lastName) ||
              caseItem.candidate.email}
            .
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="assign-agent">Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger id="assign-agent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assigné</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {fullName(a.firstName, a.lastName) || a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {agents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun agent d'immigration n'est enregistré. Vous pouvez créer des
              comptes agents depuis la section Utilisateurs.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeStatusDialog({
  caseItem,
  onClose,
  onSuccess,
}: {
  caseItem: ImmigrationCaseListItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<ImmigrationCaseStatus>(caseItem.status);
  const [priority, setPriority] = React.useState<string>(caseItem.priority);
  const [notes, setNotes] = React.useState<string>(caseItem.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  // Confirmation dialog (when status is Ready/Closed and differs from current)
  const needsConfirmation =
    status !== caseItem.status && CONFIRMATION_REQUIRED_STATUSES.has(status);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleSaveClick = () => {
    if (needsConfirmation) {
      setConfirmOpen(true);
      return;
    }
    void doSave(false);
  };

  const doSave = async (confirmed: boolean) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (status !== caseItem.status) {
        body.status = status;
        if (confirmed) body.confirmation = true;
      }
      if (priority !== caseItem.priority) body.priority = priority;
      if (notes !== (caseItem.notes ?? "")) body.notes = notes;

      const res = await fetch(`/api/admin/immigration/${caseItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          title: "Échec",
          description: data.error || "Impossible de mettre à jour le dossier.",
          variant: "destructive",
        });
        return;
      }
      onSuccess("Dossier mis à jour.");
      onClose();
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-brand" />
              Modifier le dossier
            </DialogTitle>
            <DialogDescription>
              {fullName(caseItem.candidate.firstName, caseItem.candidate.lastName) ||
                caseItem.candidate.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="upd-status">Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ImmigrationCaseStatus)}
              >
                <SelectTrigger id="upd-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upd-priority">Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="upd-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upd-notes">Notes</Label>
              <Textarea
                id="upd-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes internes (visibles par les agents et l'administrateur)…"
              />
            </div>

            {needsConfirmation ? (
              <Alert>
                <AlertTriangle className="h-4 w-4 text-italian-red" />
                <AlertDescription>
                  Passer en «&nbsp;{STATUS_LABELS[status]}&nbsp;» nécessite une
                  confirmation officielle de l'obtention du visa ou de
                  l'autorisation.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSaveClick} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de statut</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de passer ce dossier en{" "}
              <strong>«&nbsp;{STATUS_LABELS[status]}&nbsp;»</strong>. Cela
              signifie que le visa ou l'autorisation a été officiellement obtenu
              auprès des autorités compétentes. Cette action ne doit être
              réalisée qu'après confirmation officielle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void doSave(true);
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmation…
                </>
              ) : (
                "Je confirme l'obtention officielle"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreateCaseDialog({
  open,
  onOpenChange,
  agents,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agents: UserListItem[];
  onSuccess: (msg: string) => void;
}) {
  const { toast } = useToast();
  const [candidateSearch, setCandidateSearch] = React.useState("");
  const [candidateResults, setCandidateResults] = React.useState<UserListItem[]>([]);
  const [candidateId, setCandidateId] = React.useState<string>("");
  const [candidatePicked, setCandidatePicked] = React.useState<UserListItem | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [agentId, setAgentId] = React.useState<string>("unassigned");
  const [priority, setPriority] = React.useState<string>("Normal");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setCandidateSearch("");
      setCandidateResults([]);
      setCandidateId("");
      setCandidatePicked(null);
      setAgentId("unassigned");
      setPriority("Normal");
      setNotes("");
    }
  }, [open]);

  // Debounced candidate search
  React.useEffect(() => {
    if (!open) return;
    const q = candidateSearch.trim();
    if (q.length < 2) {
      setCandidateResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          role: "Candidate",
          q,
          pageSize: "20",
        });
        const res = await fetch(`/api/admin/users?${qs.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as UsersListResponse;
        if (!cancelled) setCandidateResults(data.users ?? []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [candidateSearch, open]);

  const handleSubmit = async () => {
    if (!candidateId) {
      toast({
        title: "Candidat requis",
        description: "Sélectionnez un candidat dans la liste.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        candidateId,
        priority,
        notes: notes.trim() || undefined,
      };
      if (agentId !== "unassigned") body.agentId = agentId;

      const res = await fetch("/api/admin/immigration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          title: "Échec",
          description: data.error || "Impossible de créer le dossier.",
          variant: "destructive",
        });
        return;
      }
      onSuccess("Dossier créé avec succès.");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand" />
            Nouveau dossier administratif
          </DialogTitle>
          <DialogDescription>
            Créez un dossier d'immigration pour un candidat et assignez
            éventuellement un agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate search */}
          <div className="space-y-1.5">
            <Label htmlFor="cand-search">Candidat</Label>
            {candidatePicked ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-card p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-navy">
                    {fullName(candidatePicked.firstName, candidatePicked.lastName) ||
                      candidatePicked.email}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {candidatePicked.email}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCandidatePicked(null);
                    setCandidateId("");
                  }}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cand-search"
                    placeholder="Rechercher par nom, prénom ou email…"
                    className="pl-9"
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                  />
                </div>
                {searching ? (
                  <p className="text-xs text-muted-foreground">Recherche…</p>
                ) : null}
                {candidateResults.length > 0 ? (
                  <ul className="max-h-48 overflow-y-auto rounded-md border border-border bg-card">
                    {candidateResults.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCandidatePicked(u);
                            setCandidateId(u.id);
                            setCandidateResults([]);
                            setCandidateSearch("");
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span className="font-medium text-navy">
                            {fullName(u.firstName, u.lastName) || u.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {u.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {candidateSearch.trim().length >= 2 &&
                !searching &&
                candidateResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aucun candidat trouvé.
                  </p>
                ) : null}
              </>
            )}
          </div>

          {/* Agent */}
          <div className="space-y-1.5">
            <Label htmlFor="create-agent">Agent (optionnel)</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger id="create-agent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assigné (pour plus tard)</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {fullName(a.firstName, a.lastName) || a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label htmlFor="create-priority">Priorité</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="create-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="create-notes">Notes (optionnel)</Label>
            <Textarea
              id="create-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, instructions particulières…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création…
              </>
            ) : (
              "Créer le dossier"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
