"use client";

import * as React from "react";
import {
  Users,
  Search,
  ArrowRight,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  FolderOpen,
  Inbox,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";

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

interface CandidateSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  candidateProfile: CandidateProfileSummary | null;
}

interface AgentCaseListItem {
  id: string;
  status: ImmigrationCaseStatus;
  priority: string;
  openedAt: string;
  candidate: CandidateSummary;
  taskProgress: { done: number; total: number };
}

interface AgentCasesResponse {
  cases: AgentCaseListItem[];
  total: number;
  page: number;
  pageSize: number;
}

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

export function AgentCandidates() {
  const { navigate } = useSiteRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cases, setCases] = React.useState<AgentCaseListItem[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/agent/cases?pageSize=100", {
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Échec du chargement des candidats.");
        }
        const data = (await res.json()) as AgentCasesResponse;
        if (!cancelled) setCases(data.cases ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deduplicate candidates: one candidate may have multiple cases — we show
  // the most recently opened one as the "active" case.
  const deduped = React.useMemo(() => {
    const byCandidate = new Map<string, AgentCaseListItem>();
    for (const c of cases) {
      const existing = byCandidate.get(c.candidate.id);
      if (!existing) {
        byCandidate.set(c.candidate.id, c);
        continue;
      }
      // Keep the most recently opened.
      if (new Date(c.openedAt).getTime() > new Date(existing.openedAt).getTime()) {
        byCandidate.set(c.candidate.id, c);
      }
    }
    return Array.from(byCandidate.values());
  }, [cases]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deduped;
    return deduped.filter((c) => {
      const name = fullName(c.candidate.firstName, c.candidate.lastName).toLowerCase();
      const email = c.candidate.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [deduped, search]);

  const goToCase = (caseId: string) => {
    navigate("dashboard", { section: "cases", case: caseId });
  };

  if (loading) {
    return <CandidatesSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un candidat par nom ou email…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasSearch={search.trim().length > 0} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <CandidateCard
              key={c.candidate.id}
              caseItem={c}
              onOpen={() => goToCase(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Candidats</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Les candidats dont vous suivez le dossier d'immigration.
      </p>
    </div>
  );
}

function CandidateCard({
  caseItem,
  onOpen,
}: {
  caseItem: AgentCaseListItem;
  onOpen: () => void;
}) {
  const candidate = caseItem.candidate;
  const profile = candidate.candidateProfile;
  const progress = caseItem.taskProgress;
  const progressPct =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-brand" />
              {fullName(candidate.firstName, candidate.lastName) || candidate.email}
            </CardTitle>
            <CardDescription className="mt-1">
              Dossier ouvert le {formatDateFr(caseItem.openedAt)}
            </CardDescription>
          </div>
          <Badge className={caseStatusBadgeClass(caseItem.status)}>
            {STATUS_LABELS[caseItem.status] ?? caseItem.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${candidate.email}`}
              className="truncate text-brand hover:underline"
            >
              {candidate.email}
            </a>
          </div>
          {profile?.nationality ? (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-navy">{profile.nationality}</span>
            </div>
          ) : null}
          {profile?.city ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-navy">{profile.city}</span>
            </div>
          ) : null}
          {profile?.desiredJob ? (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-navy">{profile.desiredJob}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Dossier&nbsp;: {formatDateFr(caseItem.openedAt)}
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Avancement&nbsp;: {progress.done}/{progress.total} étapes
            {progress.total > 0 ? ` (${progressPct}%)` : ""}
          </span>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </div>

        <Button variant="secondary" className="w-full" onClick={onOpen}>
          Voir le dossier
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-navy">Aucun candidat</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {hasSearch
            ? "Aucun candidat ne correspond à votre recherche."
            : "Aucun dossier ne vous est actuellement assigné. Les nouveaux dossiers apparaîtront ici une fois assignés par l'administrateur."}
        </p>
      </CardContent>
    </Card>
  );
}

function CandidatesSkeleton() {
  return (
    <div className="space-y-6">
      <Header />
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
