"use client";

import * as React from "react";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Webhook,
  Send,
  RefreshCw,
  Code2,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────

interface EventRow {
  id: string;
  type: string;
  targetType: string | null;
  targetId: string | null;
  actorId: string | null;
  payload: string;
  webhookStatus: string | null;
  webhookError: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

interface EventStats {
  totalEvents: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  skippedCount: number;
}

interface EventsListResponse {
  events: EventRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: EventStats;
}

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  eventTypes: string;
  secret: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebhooksListResponse {
  webhooks: WebhookRow[];
}

interface WebhookSingleResponse {
  webhook: WebhookRow;
}

interface WebhookFormState {
  name: string;
  url: string;
  eventTypes: string;
  secret: string;
  isActive: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const EMPTY_FORM: WebhookFormState = {
  name: "",
  url: "",
  eventTypes: "*",
  secret: "",
  isActive: true,
};

/**
 * Reference list of all automation events fired by the platform. Kept in sync
 * with `EVENTS` in `@/lib/automation` (server-side). We don't import that
 * module here because it pulls in Prisma and other server-only code.
 */
const SUPPORTED_EVENTS: { value: string; label: string; category: string }[] = [
  { value: "candidate.registered", label: "Inscription candidat", category: "Comptes" },
  { value: "company.registered", label: "Inscription entreprise", category: "Comptes" },
  { value: "company.validated", label: "Entreprise validée", category: "Comptes" },
  { value: "company.rejected", label: "Entreprise refusée", category: "Comptes" },
  { value: "joboffer.published", label: "Offre publiée", category: "Recrutement" },
  { value: "application.created", label: "Candidature créée", category: "Recrutement" },
  { value: "application.preselected", label: "Candidature pré-sélectionnée", category: "Recrutement" },
  { value: "application.interview", label: "Entretien programmé", category: "Recrutement" },
  { value: "application.offered", label: "Offre envoyée", category: "Recrutement" },
  { value: "application.accepted", label: "Candidature acceptée", category: "Recrutement" },
  { value: "application.rejected", label: "Candidature refusée", category: "Recrutement" },
  { value: "enrollment.created", label: "Inscription formation", category: "Formation" },
  { value: "payment.confirmed", label: "Paiement confirmé", category: "Paiements" },
  { value: "payment.refunded", label: "Paiement remboursé", category: "Paiements" },
  { value: "document.uploaded", label: "Document téléversé", category: "Documents" },
  { value: "document.validated", label: "Document validé", category: "Documents" },
  { value: "document.refused", label: "Document refusé", category: "Documents" },
  { value: "exam.passed", label: "Examen réussi", category: "Formation" },
  { value: "exam.failed", label: "Examen échoué", category: "Formation" },
  { value: "certificate.available", label: "Attestation disponible", category: "Formation" },
  { value: "immigration.deadline", label: "Échéance immigration", category: "Immigration" },
  { value: "immigration.status_changed", label: "Statut immigration modifié", category: "Immigration" },
];

const EVENT_CATEGORIES = Array.from(
  new Set(SUPPORTED_EVENTS.map((e) => e.category))
);

// ─── Helpers ───────────────────────────────────────────────────────────────

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

interface StatusStyle {
  className: string;
  iconClassName: string;
  label: string;
  Icon: typeof CheckCircle2;
}

function getStatusStyle(status: string | null): StatusStyle {
  switch (status) {
    case "delivered":
      return {
        className:
          "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
        iconClassName: "bg-emerald-500",
        label: "Livré",
        Icon: CheckCircle2,
      };
    case "failed":
      return {
        className:
          "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
        iconClassName: "bg-red-500",
        label: "Échec",
        Icon: XCircle,
      };
    case "pending":
      return {
        className:
          "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
        iconClassName: "bg-amber-500",
        label: "En attente",
        Icon: Clock,
      };
    case "skipped":
      return {
        className:
          "bg-muted text-muted-foreground border border-border",
        iconClassName: "bg-muted-foreground",
        label: "Ignoré",
        Icon: AlertCircle,
      };
    default:
      return {
        className:
          "bg-muted text-muted-foreground border border-border",
        iconClassName: "bg-muted-foreground",
        label: "—",
        Icon: AlertCircle,
      };
  }
}

function getTypeStyle(type: string): string {
  // Group events by domain prefix to keep the journal readable.
  if (type.startsWith("candidate.") || type.startsWith("company."))
    return "bg-brand-green/15 text-brand-green border border-brand-green/30";
  if (type.startsWith("application.") || type.startsWith("joboffer."))
    return "bg-navy/10 text-navy border border-navy/20";
  if (
    type.startsWith("enrollment.") ||
    type.startsWith("exam.") ||
    type.startsWith("certificate.")
  )
    return "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
  if (type.startsWith("payment.") || type.startsWith("document."))
    return "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
  if (type.startsWith("immigration."))
    return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
  return "bg-muted text-muted-foreground border border-border";
}

function prettyPrintJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminAutomation() {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"events" | "webhooks">("events");

  // ── Events state ──────────────────────────────────────────────────────
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [stats, setStats] = React.useState<EventStats>({
    totalEvents: 0,
    deliveredCount: 0,
    failedCount: 0,
    pendingCount: 0,
    skippedCount: 0,
  });
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | string>("all");
  const [detailEvent, setDetailEvent] = React.useState<EventRow | null>(null);

  // ── Webhooks state ────────────────────────────────────────────────────
  const [webhooks, setWebhooks] = React.useState<WebhookRow[]>([]);
  const [webhooksLoading, setWebhooksLoading] = React.useState(true);
  const [webhooksError, setWebhooksError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingWebhook, setEditingWebhook] = React.useState<WebhookRow | null>(null);
  const [form, setForm] = React.useState<WebhookFormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = React.useState(false);
  const [deletingWebhook, setDeletingWebhook] = React.useState<WebhookRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Fetch events ──────────────────────────────────────────────────────
  const fetchEvents = React.useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const qs = new URLSearchParams();
      if (typeFilter !== "all") qs.set("type", typeFilter);
      if (statusFilter !== "all") qs.set("webhookStatus", statusFilter);
      qs.set("page", String(page));
      qs.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/automation/events?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement du journal.");
      }
      const data = (await res.json()) as EventsListResponse;
      setEvents(data.events);
      setTotal(data.total);
      setStats(data.stats);
    } catch (e) {
      setEventsError(
        e instanceof Error ? e.message : "Une erreur est survenue."
      );
    } finally {
      setEventsLoading(false);
    }
  }, [typeFilter, statusFilter, page]);

  React.useEffect(() => {
    if (tab === "events") fetchEvents();
  }, [fetchEvents, tab]);

  // Reset to page 1 when filters change.
  React.useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter]);

  // ── Fetch webhooks ────────────────────────────────────────────────────
  const fetchWebhooks = React.useCallback(async () => {
    setWebhooksLoading(true);
    setWebhooksError(null);
    try {
      const res = await fetch("/api/admin/automation/webhooks", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des webhooks.");
      }
      const data = (await res.json()) as WebhooksListResponse;
      setWebhooks(data.webhooks);
    } catch (e) {
      setWebhooksError(
        e instanceof Error ? e.message : "Une erreur est survenue."
      );
    } finally {
      setWebhooksLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === "webhooks") fetchWebhooks();
  }, [fetchWebhooks, tab]);

  // ── Webhook form handlers ─────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingWebhook(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (w: WebhookRow) => {
    setEditingWebhook(w);
    setForm({
      name: w.name,
      url: w.url,
      eventTypes: w.eventTypes,
      secret: w.secret ?? "",
      isActive: w.isActive,
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.name.trim()) {
      toast({
        variant: "destructive",
        title: "Nom requis",
        description: "Veuillez renseigner un nom pour ce webhook.",
      });
      return;
    }
    if (!form.url.trim() || !/^https?:\/\//i.test(form.url.trim())) {
      toast({
        variant: "destructive",
        title: "URL invalide",
        description: "L'URL doit commencer par http:// ou https://.",
      });
      return;
    }
    if (!form.eventTypes.trim()) {
      toast({
        variant: "destructive",
        title: "Événements requis",
        description: "Indiquez au moins un type d'événement (ou * pour tous).",
      });
      return;
    }

    setFormSaving(true);
    try {
      const isEdit = !!editingWebhook;
      const url = isEdit
        ? `/api/admin/automation/webhooks/${editingWebhook.id}`
        : "/api/admin/automation/webhooks";
      const method = isEdit ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        url: form.url.trim(),
        eventTypes: form.eventTypes.trim(),
        isActive: form.isActive,
      };
      if (form.secret.trim()) body.secret = form.secret.trim();

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de l'enregistrement.");
      }
      const data = (await res.json()) as WebhookSingleResponse;

      toast({
        title: isEdit ? "Webhook mis à jour" : "Webhook créé",
        description: `« ${data.webhook.name} » a été ${
          isEdit ? "mis à jour" : "créé"
        } avec succès.`,
      });
      setFormOpen(false);
      setEditingWebhook(null);
      await fetchWebhooks();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setFormSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingWebhook) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/automation/webhooks/${deletingWebhook.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la suppression.");
      }
      toast({
        title: "Webhook supprimé",
        description: `« ${deletingWebhook.name} » a été supprimé.`,
      });
      setDeletingWebhook(null);
      await fetchWebhooks();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-navy">
          <Zap className="h-6 w-6 text-brand" />
          Automatisations
        </h1>
        <p className="text-sm text-muted-foreground">
          Journal des événements de la plateforme et configuration des webhooks
          (N8N et autres outils d&apos;automatisation).
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "events" | "webhooks")}>
        <TabsList>
          <TabsTrigger value="events">
            <Code2 className="h-4 w-4" />
            Journal des événements
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4" />
            Webhooks (N8N)
          </TabsTrigger>
        </TabsList>

        {/* ───── Events tab ───── */}
        <TabsContent value="events" className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total (24h)"
              value={stats.totalEvents}
              icon={<Zap className="h-4 w-4" />}
              tone="navy"
              loading={eventsLoading}
            />
            <StatCard
              label="Livrés"
              value={stats.deliveredCount}
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="green"
              loading={eventsLoading}
            />
            <StatCard
              label="Échoués"
              value={stats.failedCount}
              icon={<XCircle className="h-4 w-4" />}
              tone="red"
              loading={eventsLoading}
            />
            <StatCard
              label="En attente"
              value={stats.pendingCount}
              icon={<Clock className="h-4 w-4" />}
              tone="amber"
              loading={eventsLoading}
            />
            <StatCard
              label="Ignorés"
              value={stats.skippedCount}
              icon={<AlertCircle className="h-4 w-4" />}
              tone="gray"
              loading={eventsLoading}
            />
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:flex-1">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="event-type-filter"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Type d&apos;événement
                    </Label>
                    <Select
                      value={typeFilter}
                      onValueChange={(v) => setTypeFilter(v)}
                    >
                      <SelectTrigger id="event-type-filter" className="w-full">
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="all">Tous les types</SelectItem>
                        {SUPPORTED_EVENTS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>
                            <span className="font-mono text-xs">{e.value}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              — {e.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="event-status-filter"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Statut webhook
                    </Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v)}
                    >
                      <SelectTrigger id="event-status-filter" className="w-full">
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="delivered">Livré</SelectItem>
                        <SelectItem value="failed">Échec</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="skipped">Ignoré</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchEvents()}
                  disabled={eventsLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`}
                  />
                  Actualiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events table */}
          <Card>
            <CardContent className="p-0">
              {eventsError ? (
                <div className="p-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{eventsError}</AlertDescription>
                  </Alert>
                </div>
              ) : eventsLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                  <InboxIcon />
                  <p className="text-sm text-muted-foreground">
                    Aucun événement à afficher.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Date / Heure</TableHead>
                        <TableHead className="min-w-[200px]">Type</TableHead>
                        <TableHead className="min-w-[200px]">Cible</TableHead>
                        <TableHead className="min-w-[140px]">Statut webhook</TableHead>
                        <TableHead className="text-right">Détails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((e) => {
                        const status = getStatusStyle(e.webhookStatus);
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {formatDateTimeFr(e.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`font-mono text-xs ${getTypeStyle(e.type)}`}
                              >
                                {e.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {e.targetType ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {e.targetType}
                                  </span>
                                  {e.targetId && (
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {e.targetId}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`gap-1 ${status.className}`}>
                                <status.Icon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailEvent(e)}
                              >
                                <Code2 className="h-4 w-4" />
                                Détails
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {!eventsLoading && total > PAGE_SIZE && (
            <div className="flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage((p) => p - 1);
                      }}
                      aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages })
                    .slice(0, 7)
                    .map((_, i) => {
                      const p = i + 1;
                      return (
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
                      );
                    })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage((p) => p + 1);
                      }}
                      aria-disabled={page >= totalPages}
                      className={
                        page >= totalPages ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        {/* ───── Webhooks tab ───── */}
        <TabsContent value="webhooks" className="space-y-4">
          {/* Info alert */}
          <Alert>
            <Webhook className="h-4 w-4" />
            <AlertTitle>Webhooks d&apos;automatisation</AlertTitle>
            <AlertDescription>
              Configurez vos webhooks pour connecter N8N ou tout autre outil
              d&apos;automatisation. Chaque événement de la plateforme
              (inscription, candidature, paiement…) sera envoyé en POST à
              l&apos;URL configurée.
            </AlertDescription>
          </Alert>

          {/* Header row with create button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy">
                Endpoints configurés
              </h2>
              <p className="text-sm text-muted-foreground">
                {webhooks.length} webhook{webhooks.length > 1 ? "s" : ""} actif
                {webhooks.length > 1 ? "s" : ""}.
              </p>
            </div>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Nouveau webhook
            </Button>
          </div>

          {/* Webhooks table */}
          <Card>
            <CardContent className="p-0">
              {webhooksError ? (
                <div className="p-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{webhooksError}</AlertDescription>
                  </Alert>
                </div>
              ) : webhooksLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : webhooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                  <Webhook className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucun webhook configuré pour le moment.
                  </p>
                  <Button variant="outline" size="sm" onClick={openCreateForm}>
                    <Plus className="h-4 w-4" />
                    Créer mon premier webhook
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Nom</TableHead>
                        <TableHead className="min-w-[220px]">URL</TableHead>
                        <TableHead className="min-w-[200px]">
                          Types d&apos;événements
                        </TableHead>
                        <TableHead className="min-w-[100px]">Actif</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhooks.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">{w.name}</TableCell>
                          <TableCell className="max-w-[320px]">
                            <div className="flex items-center gap-2 truncate">
                              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span
                                className="truncate font-mono text-xs"
                                title={w.url}
                              >
                                {w.url}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {w.eventTypes === "*" ? (
                              <Badge className="bg-navy/10 text-navy border border-navy/20">
                                Tous (*)
                              </Badge>
                            ) : (
                              <div className="flex max-w-[260px] flex-wrap gap-1">
                                {w.eventTypes
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                                  .slice(0, 3)
                                  .map((t) => (
                                    <Badge
                                      key={t}
                                      variant="outline"
                                      className="font-mono text-[10px]"
                                    >
                                      {t}
                                    </Badge>
                                  ))}
                                {w.eventTypes.split(",").filter((t) => t.trim()).length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    +{w.eventTypes.split(",").filter((t) => t.trim()).length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {w.isActive ? (
                              <Badge className="gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                                <CheckCircle2 className="h-3 w-3" />
                                Actif
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditForm(w)}
                                aria-label={`Modifier ${w.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingWebhook(w)}
                                aria-label={`Supprimer ${w.name}`}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference card — supported event types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-brand" />
                Types d&apos;événements supportés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Liste de tous les événements déclenchés par la plateforme. Dans
                le champ <em>Types d&apos;événements</em> d&apos;un webhook,
                indiquez soit <code className="rounded bg-muted px-1 py-0.5 text-xs">*</code> pour tout recevoir, soit une liste
                séparée par des virgules (ex.{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  candidate.registered,application.created
                </code>
                ).
              </p>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {EVENT_CATEGORIES.map((cat) => (
                  <div key={cat} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat}
                    </h4>
                    <ul className="space-y-1.5">
                      {SUPPORTED_EVENTS.filter((e) => e.category === cat).map(
                        (e) => (
                          <li
                            key={e.value}
                            className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
                          >
                            <span className="font-mono text-[11px] text-navy">
                              {e.value}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {e.label}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ───── Event detail dialog ───── */}
      <Dialog
        open={!!detailEvent}
        onOpenChange={(open) => !open && setDetailEvent(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-brand" />
              Détails de l&apos;événement
            </DialogTitle>
            <DialogDescription>
              Charge utile JSON envoyée aux webhooks pour cet événement.
            </DialogDescription>
          </DialogHeader>
          {detailEvent && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <DetailField label="Type" value={detailEvent.type} mono />
                <DetailField
                  label="Cible"
                  value={
                    detailEvent.targetType
                      ? `${detailEvent.targetType}${
                          detailEvent.targetId
                            ? ` · ${detailEvent.targetId.slice(0, 8)}…`
                            : ""
                        }`
                      : "—"
                  }
                />
                <DetailField
                  label="Statut"
                  value={getStatusStyle(detailEvent.webhookStatus).label}
                />
                <DetailField
                  label="Date"
                  value={formatDateTimeFr(detailEvent.createdAt)}
                />
              </div>
              {detailEvent.webhookError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erreur webhook</AlertTitle>
                  <AlertDescription className="font-mono text-xs">
                    {detailEvent.webhookError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Charge utile (payload)
                </Label>
                <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                  {prettyPrintJson(detailEvent.payload)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ───── Webhook form dialog ───── */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !formSaving) {
            setFormOpen(false);
            setEditingWebhook(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-brand" />
              {editingWebhook ? "Modifier le webhook" : "Nouveau webhook"}
            </DialogTitle>
            <DialogDescription>
              {editingWebhook
                ? "Modifiez la configuration du webhook."
                : "Configurez un nouvel endpoint pour recevoir les événements COORIZON."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wh-name">Nom</Label>
              <Input
                id="wh-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex. N8N — notifications Slack"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://n8n.exemple.com/webhook/coorizon"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                L&apos;URL doit commencer par <code>http://</code> ou{" "}
                <code>https://</code>.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-events">Types d&apos;événements</Label>
              <Textarea
                id="wh-events"
                value={form.eventTypes}
                onChange={(e) => setForm({ ...form, eventTypes: e.target.value })}
                placeholder="* ou candidate.registered,application.created,payment.confirmed"
                className="font-mono text-sm"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Utilisez <code>*</code> pour recevoir tous les événements, ou
                une liste séparée par des virgules.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-secret">Secret (optionnel)</Label>
              <Input
                id="wh-secret"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder="Secret partagé pour la signature HMAC"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Sera envoyé dans l&apos;en-tête{" "}
                <code>X-COORIZON-Signature</code> de chaque requête.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="wh-active" className="text-sm font-medium">
                  Webhook actif
                </Label>
                <p className="text-xs text-muted-foreground">
                  Désactivez pour mettre en pause sans supprimer.
                </p>
              </div>
              <Switch
                id="wh-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditingWebhook(null);
              }}
              disabled={formSaving}
            >
              Annuler
            </Button>
            <Button onClick={submitForm} disabled={formSaving}>
              {formSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {editingWebhook ? "Enregistrer" : "Créer le webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Delete confirmation ───── */}
      <AlertDialog
        open={!!deletingWebhook}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingWebhook(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce webhook ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingWebhook && (
                <>
                  Vous êtes sur le point de supprimer le webhook{" "}
                  <strong>« {deletingWebhook.name} »</strong>. Cette action est
                  irréversible. L&apos;URL ne recevra plus aucun événement.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "navy" | "green" | "red" | "amber" | "gray";
  loading?: boolean;
}

function StatCard({ label, value, icon, tone, loading }: StatCardProps) {
  const toneClasses: Record<StatCardProps["tone"], string> = {
    navy: "bg-navy/10 text-navy",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    gray: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneClasses[tone]}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-12" />
          ) : (
            <p className="text-xl font-semibold text-navy">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`truncate text-sm text-foreground ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function InboxIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Code2 className="h-6 w-6" />
    </div>
  );
}
