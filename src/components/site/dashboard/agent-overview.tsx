"use client";

import * as React from "react";
import {
  AlertTriangle,
  AlarmClock,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FolderOpen,
  ListTodo,
  Loader,
  RefreshCw,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth/session-provider";
import { useSiteRouter } from "@/lib/site-router";
import { cn } from "@/lib/utils";

/** Shape returned by GET /api/agent/stats. */
interface AgentStats {
  totalCases: number;
  activeCases: number;
  casesByStatus: Record<string, number>;
  tasksTodo: number;
  tasksInProgress: number;
  tasksBlocked: number;
  upcomingDeadlines: number;
  overdueTasks: number;
  closedCases: number;
}

/** Statuts de dossier affichés dans la répartition, dans l'ordre du tunnel. */
const STATUS_BREAKDOWN: {
  key: string;
  label: string;
  chipClass: string;
  barClass: string;
}[] = [
  {
    key: "Open",
    label: "Ouvert",
    chipClass: "bg-blue-100 text-blue-700",
    barClass: "bg-blue-500",
  },
  {
    key: "InProgress",
    label: "En cours",
    chipClass: "bg-brand/10 text-brand",
    barClass: "bg-brand",
  },
  {
    key: "DocumentsPending",
    label: "Documents en attente",
    chipClass: "bg-amber-100 text-amber-700",
    barClass: "bg-amber-500",
  },
  {
    key: "VisaPending",
    label: "Visa en attente",
    chipClass: "bg-amber-100 text-amber-700",
    barClass: "bg-amber-500",
  },
  {
    key: "Ready",
    label: "Prêt",
    chipClass: "bg-brand-green/10 text-brand-green",
    barClass: "bg-brand-green",
  },
  {
    key: "Closed",
    label: "Clôturé",
    chipClass: "bg-muted text-muted-foreground",
    barClass: "bg-muted-foreground/40",
  },
  {
    key: "OnHold",
    label: "En pause",
    chipClass: "bg-muted text-muted-foreground",
    barClass: "bg-muted-foreground/40",
  },
];

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBoxClass: string;
  onClick?: () => void;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBoxClass,
  onClick,
}: StatCardProps) {
  const clickable = Boolean(onClick);
  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `${label} : ${value}` : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "py-5",
        clickable &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      )}
    >
      <CardContent className="flex items-center gap-3 sm:gap-4">
        <div
          aria-hidden
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            iconBoxClass
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-tight text-navy">
            {value}
          </div>
          <div className="truncate text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------

interface QuickActionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}: QuickActionProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer py-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <CardContent className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-navy">{title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {description}
          </div>
        </div>
        <ArrowRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground"
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AgentOverview() {
  const { user } = useSession();
  const { navigate } = useSiteRouter();

  const [stats, setStats] = React.useState<AgentStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/stats", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger vos statistiques."
        );
      }
      const data = (await res.json()) as AgentStats;
      setStats(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const firstName = user?.firstName ?? null;

  // ---- Loading skeleton -------------------------------------------------
  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="py-5">
              <CardContent className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  // ---- Error state ------------------------------------------------------
  if (error && !stats) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Impossible de charger le tableau de bord</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-fit"
            onClick={() => void load()}
            aria-label="Réessayer le chargement des statistiques"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    // Defensive: should not happen, but keep TS happy.
    return null;
  }

  // ---- Stat cards config ------------------------------------------------
  const cards: StatCardProps[] = [
    {
      label: "Dossiers actifs",
      value: String(stats.activeCases),
      icon: FolderOpen,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "cases" }),
    },
    {
      label: "Tâches à faire",
      value: String(stats.tasksTodo),
      icon: ListTodo,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
      onClick: () => navigate("dashboard", { section: "deadlines" }),
    },
    {
      label: "Tâches en cours",
      value: String(stats.tasksInProgress),
      icon: Loader,
      iconBoxClass: "bg-navy/10 text-navy",
      onClick: () => navigate("dashboard", { section: "deadlines" }),
    },
    {
      label: "Tâches bloquées",
      value: String(stats.tasksBlocked),
      icon: AlertTriangle,
      iconBoxClass:
        stats.tasksBlocked > 0
          ? "bg-italian-red/10 text-italian-red"
          : "bg-muted text-muted-foreground",
      onClick: () => navigate("dashboard", { section: "deadlines" }),
    },
    {
      label: "Échéances (7 jours)",
      value: String(stats.upcomingDeadlines),
      icon: CalendarClock,
      iconBoxClass:
        stats.upcomingDeadlines > 0
          ? "bg-amber-100 text-amber-700"
          : "bg-muted text-muted-foreground",
      onClick: () => navigate("dashboard", { section: "deadlines" }),
    },
    {
      label: "Échéances dépassées",
      value: String(stats.overdueTasks),
      icon: AlarmClock,
      iconBoxClass:
        stats.overdueTasks > 0
          ? "bg-italian-red/10 text-italian-red"
          : "bg-muted text-muted-foreground",
      onClick: () => navigate("dashboard", { section: "deadlines" }),
    },
  ];

  // ---- Dossiers par statut (répartition) --------------------------------
  const breakdown = STATUS_BREAKDOWN.map((s) => ({
    ...s,
    count: stats.casesByStatus[s.key] ?? 0,
  }));
  const breakdownTotal = breakdown.reduce((sum, s) => sum + s.count, 0);

  // ---- Quick actions ----------------------------------------------------
  const quickActions: QuickActionProps[] = [
    {
      icon: FolderOpen,
      title: "Voir mes dossiers",
      description: "Suivez les dossiers d'immigration assignés",
      onClick: () => navigate("dashboard", { section: "cases" }),
    },
    {
      icon: CalendarClock,
      title: "Échéances",
      description: "Tâches à venir et dépassees",
      onClick: () => navigate("dashboard", { section: "deadlines" }),
    },
    {
      icon: Users,
      title: "Mes candidats",
      description: "Profils des candidats accompagnés",
      onClick: () => navigate("dashboard", { section: "candidates" }),
    },
    {
      icon: CheckCircle2,
      title: "Dossiers clôturés",
      description: `${stats.closedCases} dossier${
        stats.closedCases > 1 ? "s" : ""
      } clôturé${stats.closedCases > 1 ? "s" : ""}`,
      onClick: () => navigate("dashboard", { section: "cases" }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <header>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Bonjour{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Voici un aperçu de vos dossiers d&apos;immigration et de vos
          tâches sur COORIZON.
        </p>
      </header>

      {/* Stat grid */}
      <section
        aria-label="Statistiques du tableau de bord"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </section>

      {/* Dossiers par statut */}
      <section aria-labelledby="cases-by-status-title">
        <Card className="py-5">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="cases-by-status-title"
                className="text-lg font-semibold text-navy"
              >
                Dossiers par statut
              </h2>
              <span className="text-sm text-muted-foreground">
                {stats.totalCases} dossier{stats.totalCases > 1 ? "s" : ""} au
                total
              </span>
            </div>

            {breakdownTotal === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun dossier à afficher pour le moment.
              </p>
            ) : (
              <>
                {/* Stacked horizontal bar */}
                <div
                  role="img"
                  aria-label="Répartition des dossiers par statut"
                  className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
                >
                  {breakdown.map((s) =>
                    s.count > 0 ? (
                      <div
                        key={s.key}
                        className={cn("h-full", s.barClass)}
                        style={{
                          width: `${(s.count / breakdownTotal) * 100}%`,
                        }}
                        title={`${s.label} : ${s.count}`}
                      />
                    ) : null
                  )}
                </div>

                {/* Labeled chips with counts */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {breakdown.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                    >
                      <span
                        className={cn(
                          "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                          s.barClass
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {s.label}
                      </span>
                      <Badge className={cn("shrink-0", s.chipClass)}>
                        {s.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions-title">
        <h2
          id="quick-actions-title"
          className="mb-3 text-lg font-semibold text-navy"
        >
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <QuickAction key={a.title} {...a} />
          ))}
        </div>
      </section>
    </div>
  );
}
