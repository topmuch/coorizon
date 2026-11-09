"use client";

import * as React from "react";
import {
  ScrollText,
  Search,
  User,
  Clock,
  Globe,
  ChevronDown,
  AlertCircle,
  Inbox,
  Code2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActorSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  actorId: string | null;
  actor: ActorSummary | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const TARGET_TYPES: { value: string; label: string }[] = [
  { value: "User", label: "Utilisateur" },
  { value: "Company", label: "Entreprise" },
  { value: "JobOffer", label: "Offre d'emploi" },
  { value: "Application", label: "Candidature" },
  { value: "CandidateDocument", label: "Document candidat" },
  { value: "CompanyDocument", label: "Document entreprise" },
  { value: "CMSPage", label: "Page CMS" },
  { value: "BlogArticle", label: "Article blog" },
  { value: "Interview", label: "Entretien" },
  { value: "Payment", label: "Paiement" },
  { value: "Enrollment", label: "Inscription" },
];

// ─── Action color coding ───────────────────────────────────────────────────

interface ActionColor {
  className: string;
  dotClassName: string;
}

function getActionColor(action: string): ActionColor {
  // Order matters: longest/most-specific prefixes first.
  if (action.startsWith("candidate.")) {
    return {
      className: "bg-blue-50 text-blue-700 border border-blue-200",
      dotClassName: "bg-blue-500",
    };
  }
  if (action.startsWith("recruiter.")) {
    return {
      className: "bg-brand-green/15 text-brand-green border border-brand-green/30",
      dotClassName: "bg-brand-green",
    };
  }
  if (action.startsWith("admin.")) {
    return {
      className: "bg-navy/10 text-navy border border-navy/20",
      dotClassName: "bg-navy",
    };
  }
  if (action.startsWith("company.")) {
    return {
      className: "bg-amber-50 text-amber-800 border border-amber-200",
      dotClassName: "bg-amber-500",
    };
  }
  if (action.startsWith("document.")) {
    return {
      className: "bg-purple-50 text-purple-700 border border-purple-200",
      dotClassName: "bg-purple-500",
    };
  }
  return {
    className: "bg-muted text-muted-foreground border border-border",
    dotClassName: "bg-muted-foreground",
  };
}

// ─── Date helpers ──────────────────────────────────────────────────────────

function formatDateTimeFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminAudit() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [actionInput, setActionInput] = React.useState("");
  const [appliedAction, setAppliedAction] = React.useState("");
  const [targetTypeFilter, setTargetTypeFilter] = React.useState<"all" | string>("all");

  // Metadata dialog
  const [detailLog, setDetailLog] = React.useState<AuditLog | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch list
  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (appliedAction.trim()) qs.set("action", appliedAction.trim());
      if (targetTypeFilter !== "all") qs.set("targetType", targetTypeFilter);
      qs.set("page", String(page));
      qs.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/audit?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des journaux.");
      }
      const data = (await res.json()) as AuditListResponse;
      setLogs(data.logs);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [appliedAction, targetTypeFilter, page]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 on filter change.
  React.useEffect(() => {
    setPage(1);
  }, [appliedAction, targetTypeFilter]);

  const applyFilters = () => {
    setAppliedAction(actionInput.trim());
  };

  const onActionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  };

  const resetFilters = () => {
    setActionInput("");
    setAppliedAction("");
    setTargetTypeFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    appliedAction.trim().length > 0 || targetTypeFilter !== "all";

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-navy">
          <ScrollText className="h-6 w-6 text-brand" />
          Journaux d'audit
        </h1>
        <p className="text-sm text-muted-foreground">
          Historique horodaté des actions sensibles effectuées sur la plateforme.
        </p>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="action-search" className="text-xs font-medium text-muted-foreground">
                Action (recherche)
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="action-search"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  onKeyDown={onActionKeyDown}
                  placeholder="Ex. user.login, company.validate…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-type-filter" className="text-xs font-medium text-muted-foreground">
                Type de cible
              </Label>
              <Select
                value={targetTypeFilter}
                onValueChange={(v) => setTargetTypeFilter(v)}
              >
                <SelectTrigger id="target-type-filter" className="w-full md:w-56">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {TARGET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="bg-brand text-white hover:bg-brand/90">
                <Search className="mr-1.5 h-4 w-4" />
                Filtrer
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Inbox className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-navy">Aucun événement</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Aucun événement ne correspond à vos critères de recherche."
                : "Aucune action n'a encore été enregistrée dans le journal d'audit."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            )}
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
                    <TableHead>Date / Heure</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Adresse IP</TableHead>
                    <TableHead className="text-right">Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <AuditTableRow
                      key={log.id}
                      log={log}
                      onDetails={() => setDetailLog(log)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-3 lg:hidden">
            {logs.map((log) => (
              <li key={log.id}>
                <AuditCardMobile log={log} onDetails={() => setDetailLog(log)} />
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {total} événement{total > 1 ? "s" : ""} · Page {page} sur {totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage((p) => Math.max(1, p - 1));
                      }}
                      aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {buildPageRange(page, totalPages).map((p, idx) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <span className="flex size-9 items-center justify-center text-muted-foreground">
                          …
                        </span>
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      aria-disabled={page >= totalPages}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Metadata dialog */}
      <Dialog
        open={!!detailLog}
        onOpenChange={(open) => !open && setDetailLog(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scrollbar">
          {detailLog ? (
            <AuditDetailContent log={detailLog} onClose={() => setDetailLog(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildPageRange(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const range: Array<number | "ellipsis"> = [];
  range.push(1);
  if (current > 3) range.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) range.push(p);
  if (current < total - 2) range.push("ellipsis");
  range.push(total);
  return range;
}

function formatMetadata(raw: string | null): string {
  if (!raw) return "{}";
  try {
    const parsed = JSON.parse(raw) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function actorLabel(actor: ActorSummary | null): string {
  if (!actor) return "Système";
  const name = `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim();
  return name || actor.email;
}

function roleBadgeLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

// ─── Desktop row ───────────────────────────────────────────────────────────

interface AuditRowProps {
  log: AuditLog;
  onDetails: () => void;
}

function AuditTableRow({ log, onDetails }: AuditRowProps) {
  const color = getActionColor(log.action);
  const actor = log.actor;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-navy">
          <Clock className="h-3.5 w-3.5 text-brand" />
          {formatDateTimeFr(log.createdAt)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-navy">
              {actorLabel(actor)}
            </div>
            {actor && (
              <Badge variant="secondary" className="mt-0.5 text-[10px] font-normal">
                {roleBadgeLabel(actor.role)}
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={`px-2 py-1 text-xs font-mono ${color.className}`}>
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${color.dotClassName}`} />
          {log.action}
        </Badge>
      </TableCell>
      <TableCell>
        {log.targetType ? (
          <div className="text-sm">
            <div className="text-navy">{log.targetType}</div>
            {log.targetId && (
              <div className="font-mono text-[10px] text-muted-foreground">
                {log.targetId}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {log.ipAddress ? (
          <span className="font-mono text-xs text-muted-foreground">
            {log.ipAddress}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" onClick={onDetails}>
          <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
          Détails
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Mobile card ───────────────────────────────────────────────────────────

function AuditCardMobile({ log, onDetails }: AuditRowProps) {
  const color = getActionColor(log.action);
  const actor = log.actor;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge className={`px-2 py-1 text-xs font-mono ${color.className}`}>
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${color.dotClassName}`} />
            {log.action}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDateTimeFr(log.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-navy">
              {actorLabel(actor)}
            </div>
            {actor && (
              <Badge variant="secondary" className="mt-0.5 text-[10px] font-normal">
                {roleBadgeLabel(actor.role)}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="uppercase text-muted-foreground">Cible</div>
            <div className="text-navy">{log.targetType ?? "—"}</div>
            {log.targetId && (
              <div className="font-mono text-[10px] text-muted-foreground">
                {log.targetId}
              </div>
            )}
          </div>
          <div>
            <div className="uppercase text-muted-foreground">Adresse IP</div>
            <div className="font-mono text-navy">{log.ipAddress ?? "—"}</div>
          </div>
        </div>

        <Separator />
        <Button size="sm" variant="outline" className="w-full" onClick={onDetails}>
          <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
          Voir les détails
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Detail dialog ─────────────────────────────────────────────────────────

function AuditDetailContent({
  log,
  onClose,
}: {
  log: AuditLog;
  onClose: () => void;
}) {
  const color = getActionColor(log.action);
  const actor = log.actor;
  const metadata = formatMetadata(log.metadata);

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl text-navy">
          <ScrollText className="h-5 w-5 text-brand" />
          Détail de l'événement
        </DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2">
          <Badge className={`px-2.5 py-1 text-xs font-mono ${color.className}`}>
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${color.dotClassName}`} />
            {log.action}
          </Badge>
          <span className="text-foreground">{formatDateTimeFr(log.createdAt)}</span>
        </DialogDescription>
      </DialogHeader>

      {/* Actor */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <User className="h-4 w-4 text-brand" />
          Acteur
        </h4>
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
          {actor ? (
            <>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Nom</div>
                <div className="text-navy">{actorLabel(actor)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Email</div>
                <div className="break-all text-navy">{actor.email}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Rôle</div>
                <Badge variant="secondary" className="mt-0.5 text-xs">
                  {roleBadgeLabel(actor.role)}
                </Badge>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Identifiant</div>
                <div className="font-mono text-xs text-muted-foreground">{actor.id}</div>
              </div>
            </>
          ) : (
            <div className="col-span-2 text-muted-foreground">
              Aucun acteur authentifié (action système).
            </div>
          )}
        </div>
      </section>

      {/* Target */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Globe className="h-4 w-4 text-brand" />
          Cible
        </h4>
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Type</div>
            <div className="text-navy">{log.targetType ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Identifiant</div>
            <div className="font-mono text-xs text-navy">{log.targetId ?? "—"}</div>
          </div>
        </div>
      </section>

      {/* Request context */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Globe className="h-4 w-4 text-brand" />
          Contexte de la requête
        </h4>
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Adresse IP</div>
            <div className="font-mono text-navy">{log.ipAddress ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">User-Agent</div>
            <div className="break-all font-mono text-xs text-muted-foreground">
              {log.userAgent ?? "—"}
            </div>
          </div>
        </div>
      </section>

      {/* Metadata */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Code2 className="h-4 w-4 text-brand" />
          Métadonnées (JSON)
        </h4>
        <pre className="max-h-64 overflow-auto custom-scrollbar rounded-md border bg-navy p-3 font-mono text-xs text-white whitespace-pre-wrap">
          {metadata}
        </pre>
      </section>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </DialogFooter>
    </div>
  );
}
