"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  FolderOpen,
  ListTodo,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSiteRouter } from "@/lib/site-router";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type ImmigrationCaseStatus =
  | "Open"
  | "InProgress"
  | "DocumentsPending"
  | "VisaPending"
  | "Ready"
  | "Closed"
  | "OnHold";

interface CandidateProfileSummary {
  nationality: string | null;
  city: string | null;
  desiredJob: string | null;
}

interface CaseCandidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  candidateProfile: CandidateProfileSummary | null;
}

interface CaseListItem {
  id: string;
  status: ImmigrationCaseStatus;
  priority: string;
  notes: string | null;
  openedAt: string;
  candidateId: string;
  companyId: string | null;
  jobOfferId: string | null;
  candidate: CaseCandidate;
  company: { legalName: string | null; city: string | null } | null;
  jobOffer: { title: string | null; city: string | null } | null;
  taskProgress: { done: number; total: number };
}

interface CasesListResponse {
  cases: CaseListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Status / priority presentation ────────────────────────────────────────

const STATUS_META: Record<
  ImmigrationCaseStatus,
  { label: string; className: string; dotClass: string }
> = {
  Open: {
    label: "Ouvert",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  InProgress: {
    label: "En cours",
    className: "bg-brand/10 text-brand border-brand/20",
    dotClass: "bg-brand",
  },
  DocumentsPending: {
    label: "Documents en attente",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  VisaPending: {
    label: "Visa en attente",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  Ready: {
    label: "Prêt",
    className: "bg-brand-green/10 text-brand-green border-brand-green/20",
    dotClass: "bg-brand-green",
  },
  Closed: {
    label: "Clôturé",
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground/40",
  },
  OnHold: {
    label: "En pause",
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground/40",
  },
};

const STATUS_OPTIONS: { value: ImmigrationCaseStatus; label: string }[] = [
  { value: "Open", label: "Ouvert" },
  { value: "InProgress", label: "En cours" },
  { value: "DocumentsPending", label: "Documents en attente" },
  { value: "VisaPending", label: "Visa en attente" },
  { value: "Ready", label: "Prêt" },
  { value: "Closed", label: "Clôturé" },
  { value: "OnHold", label: "En pause" },
];

const PRIORITY_META: Record<
  string,
  { label: string; className: string }
> = {
  Normal: { label: "Normal", className: "bg-muted text-muted-foreground" },
  Haute: { label: "Haute", className: "bg-amber-100 text-amber-700" },
  Urgente: {
    label: "Urgente",
    className: "bg-italian-red/10 text-italian-red",
  },
};

function priorityMeta(priority: string): {
  label: string;
  className: string;
} {
  return (
    PRIORITY_META[priority] ?? {
      label: priority || "Normal",
      className: "bg-muted text-muted-foreground",
    }
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function candidateFullName(c: CaseCandidate): string {
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : c.email;
}

function candidateInitials(c: CaseCandidate): string {
  const f = (c.firstName?.[0] ?? "").toUpperCase();
  const l = (c.lastName?.[0] ?? "").toUpperCase();
  const initials = (f + l).trim();
  return initials || c.email[0]?.toUpperCase() || "?";
}

// ─── Filter bar ────────────────────────────────────────────────────────────

interface FilterBarProps {
  status: "all" | ImmigrationCaseStatus;
  onStatusChange: (v: "all" | ImmigrationCaseStatus) => void;
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

function FilterBar({
  status,
  onStatusChange,
  query,
  onQueryChange,
  onSubmit,
  loading,
}: FilterBarProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="agent-cases-search" className="text-xs">
            Rechercher un candidat
          </Label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="agent-cases-search"
              type="search"
              placeholder="Nom, prénom ou email"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              className="pl-9"
              aria-label="Rechercher un candidat par nom, prénom ou email"
            />
          </div>
        </div>

        <div className="space-y-1.5 lg:w-56">
          <Label htmlFor="agent-cases-status" className="text-xs">
            Statut du dossier
          </Label>
          <Select
            value={status}
            onValueChange={(v) =>
              onStatusChange(v as "all" | ImmigrationCaseStatus)
            }
          >
            <SelectTrigger
              id="agent-cases-status"
              className="w-full"
              aria-label="Filtrer par statut de dossier"
            >
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="lg:w-auto"
        >
          <Search className="h-4 w-4" />
          Rechercher
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Case card ─────────────────────────────────────────────────────────────

interface CaseCardProps {
  item: CaseListItem;
  onOpen: (caseId: string) => void;
}

function CaseCard({ item, onOpen }: CaseCardProps) {
  const statusMeta = STATUS_META[item.status];
  const prio = priorityMeta(item.priority);
  const profile = item.candidate.candidateProfile;
  const progressPct =
    item.taskProgress.total > 0
      ? Math.round((item.taskProgress.done / item.taskProgress.total) * 100)
      : 0;

  const profileBadges: { label: string | null; icon: LucideIcon }[] = [
    { label: profile?.nationality ?? null, icon: Briefcase },
    { label: profile?.city ?? null, icon: Building2 },
    { label: profile?.desiredJob ?? null, icon: ListTodo },
  ];
  const visibleBadges = profileBadges.filter(
    (b): b is { label: string; icon: LucideIcon } => Boolean(b.label)
  );

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Candidate block */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand"
              >
                {candidateInitials(item.candidate)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-navy">
                    {candidateFullName(item.candidate)}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn("gap-1.5", statusMeta.className)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex h-2 w-2 rounded-full",
                        statusMeta.dotClass
                      )}
                    />
                    {statusMeta.label}
                  </Badge>
                  <Badge variant="secondary" className={prio.className}>
                    {prio.label}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {item.candidate.email}
                </p>
              </div>
            </div>

            {/* Candidate profile summary */}
            {visibleBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {visibleBadges.map((b, i) => (
                  <Badge
                    key={`${b.label}-${i}`}
                    variant="outline"
                    className="gap-1.5 font-normal text-muted-foreground"
                  >
                    <b.icon aria-hidden className="h-3 w-3" />
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Job offer / company */}
            {(item.jobOffer || item.company) && (
              <div className="space-y-1 text-sm">
                {item.jobOffer?.title && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Briefcase
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    />
                    <span className="font-medium">{item.jobOffer.title}</span>
                    {item.jobOffer.city ? (
                      <span className="text-muted-foreground">
                        · {item.jobOffer.city}
                      </span>
                    ) : null}
                  </div>
                )}
                {item.company?.legalName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 aria-hidden className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.company.legalName}</span>
                    {item.company.city ? (
                      <span>· {item.company.city}</span>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <Separator className="my-1" />

            {/* Footer: date + task progress */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar aria-hidden className="h-3.5 w-3.5" />
                Ouvert le {formatDateFr(item.openedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
                {item.taskProgress.done}/{item.taskProgress.total} tâche
                {item.taskProgress.total > 1 ? "s" : ""}
              </span>
            </div>

            {item.taskProgress.total > 0 && (
              <Progress
                value={progressPct}
                className="h-1.5"
                aria-label={`Progression des tâches : ${item.taskProgress.done} sur ${item.taskProgress.total}`}
              />
            )}
          </div>

          {/* Action */}
          <div className="flex shrink-0 items-center lg:self-center">
            <Button
              variant="default"
              size="sm"
              className="w-full lg:w-auto"
              onClick={() => onOpen(item.id)}
              aria-label={`Voir le dossier de ${candidateFullName(item.candidate)}`}
            >
              Voir le dossier
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}

function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  loading,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination des dossiers"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-muted-foreground">
        Affichage de <span className="font-medium text-foreground">{from}</span>
        {" "}
        à <span className="font-medium text-foreground">{to}</span> sur{" "}
        <span className="font-medium text-foreground">{total}</span> dossier
        {total > 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          aria-label="Page précédente"
        >
          Précédent
        </Button>
        <span className="px-2 text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          aria-label="Page suivante"
        >
          Suivant
        </Button>
      </div>
    </nav>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function AgentCases() {
  const { navigate } = useSiteRouter();

  const [status, setStatus] = React.useState<"all" | ImmigrationCaseStatus>(
    "all"
  );
  const [query, setQuery] = React.useState("");
  // Applied filters — only updated when the user clicks "Rechercher" or
  // changes the status select.
  const [appliedStatus, setAppliedStatus] = React.useState<
    "all" | ImmigrationCaseStatus
  >("all");
  const [appliedQuery, setAppliedQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [data, setData] = React.useState<CasesListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (appliedStatus !== "all") qs.set("status", appliedStatus);
      if (appliedQuery.trim()) qs.set("q", appliedQuery.trim());
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      const res = await fetch(`/api/agent/cases?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          body?.error ?? "Impossible de charger vos dossiers."
        );
      }
      const json = (await res.json()) as CasesListResponse;
      setData(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [appliedStatus, appliedQuery, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setAppliedStatus(status);
    setAppliedQuery(query);
    setPage(1);
  };

  const handleStatusChange = (v: "all" | ImmigrationCaseStatus) => {
    setStatus(v);
    setAppliedStatus(v);
    setPage(1);
  };

  const openCase = (caseId: string) => {
    navigate("dashboard", { section: "cases", case: caseId });
  };

  // ---- Loading skeleton -------------------------------------------------
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  // ---- Error state ------------------------------------------------------
  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Impossible de charger vos dossiers</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-fit"
            onClick={() => void load()}
            aria-label="Réessayer le chargement des dossiers"
          >
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const cases = data?.cases ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Dossiers assignés
        </h1>
        <p className="text-sm text-muted-foreground">
          Suivez et traitez les dossiers d&apos;immigration qui vous ont été
          confiés.
        </p>
      </header>

      <FilterBar
        status={status}
        onStatusChange={handleStatusChange}
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSearch}
        loading={loading}
      />

      {/* Results */}
      {loading && data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center justify-center gap-3 text-center">
            <div
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <FolderOpen className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-navy">
              Aucun dossier assigné
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {appliedStatus !== "all" || appliedQuery.trim()
                ? "Aucun dossier ne correspond à vos critères de recherche. Modifiez vos filtres pour élargir la recherche."
                : "Aucun dossier d'immigration ne vous est actuellement assigné. Les nouveaux dossiers apparaîtront ici dès qu'ils vous seront confiés."}
            </p>
            {(appliedStatus !== "all" || appliedQuery.trim()) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => {
                  setStatus("all");
                  setQuery("");
                  setAppliedStatus("all");
                  setAppliedQuery("");
                  setPage(1);
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => (
            <CaseCard key={item.id} item={item} onOpen={openCase} />
          ))}
        </div>
      )}

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />
    </div>
  );
}
