"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  Plus,
  RefreshCw,
  TrendingUp,
  UserCheck,
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

/** Shape returned by GET /api/recruiter/stats. */
interface RecruiterStats {
  company: {
    legalName: string;
    sector: string | null;
    city: string | null;
    region: string | null;
    status: string;
  } | null;
  totalOffers: number;
  activeOffers: number;
  publishedOffers: number;
  draftOffers: number;
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
  preselectedCount: number;
  interviewsScheduled: number;
  recruitmentsFinalized: number;
}

/** Statuts de candidature affichés dans la répartition, dans l'ordre du tunnel. */
const STATUS_BREAKDOWN: {
  key: string;
  label: string;
  chipClass: string;
  barClass: string;
}[] = [
  {
    key: "Submitted",
    label: "Reçues",
    chipClass: "bg-muted text-muted-foreground",
    barClass: "bg-muted-foreground/40",
  },
  {
    key: "Preselected",
    label: "Présélectionnés",
    chipClass: "bg-brand/10 text-brand",
    barClass: "bg-brand",
  },
  {
    key: "Interview",
    label: "Entretiens",
    chipClass: "bg-navy/10 text-navy",
    barClass: "bg-navy",
  },
  {
    key: "Offered",
    label: "Propositions",
    chipClass: "bg-amber-100 text-amber-700",
    barClass: "bg-amber-500",
  },
  {
    key: "Accepted",
    label: "Acceptées",
    chipClass: "bg-brand-green/10 text-brand-green",
    barClass: "bg-brand-green",
  },
  {
    key: "Rejected",
    label: "Refusées",
    chipClass: "bg-italian-red/10 text-italian-red",
    barClass: "bg-italian-red",
  },
];

const COMPANY_STATUS_LABELS: Record<string, string> = {
  Pending: "En attente de validation",
  Validated: "Validée",
  Suspended: "Suspendue",
  Rejected: "Rejetée",
};

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
      <CardContent className="flex items-center gap-4">
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

export function RecruiterOverview() {
  const { user } = useSession();
  const { navigate } = useSiteRouter();

  const [stats, setStats] = React.useState<RecruiterStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recruiter/stats", {
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
      const data = (await res.json()) as RecruiterStats;
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="py-5">
              <CardContent className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-28" />
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

  const company = stats.company;
  const companyStatusBadge =
    company && company.status !== "Validated" ? (
      <Badge variant="outline" className="ml-2 align-middle">
        {COMPANY_STATUS_LABELS[company.status] ?? company.status}
      </Badge>
    ) : null;

  const companyLocation = [company?.city, company?.region]
    .filter(Boolean)
    .join(", ");

  // ---- Stat cards config ------------------------------------------------
  const cards: StatCardProps[] = [
    {
      label: "Total offres",
      value: String(stats.totalOffers),
      icon: Briefcase,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "offers" }),
    },
    {
      label: "Offres actives",
      value: String(stats.activeOffers),
      icon: TrendingUp,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
      onClick: () => navigate("dashboard", { section: "offers" }),
    },
    {
      label: "Candidatures reçues",
      value: String(stats.totalApplications),
      icon: Users,
      iconBoxClass: "bg-navy/10 text-navy",
      onClick: () => navigate("dashboard", { section: "applications" }),
    },
    {
      label: "Candidats présélectionnés",
      value: String(stats.preselectedCount),
      icon: UserCheck,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "applications" }),
    },
    {
      label: "Entretiens programmés",
      value: String(stats.interviewsScheduled),
      icon: CalendarClock,
      iconBoxClass:
        stats.interviewsScheduled > 0
          ? "bg-italian-red/10 text-italian-red"
          : "bg-muted text-muted-foreground",
      onClick: () => navigate("dashboard", { section: "interviews" }),
    },
    {
      label: "Recrutements finalisés",
      value: String(stats.recruitmentsFinalized),
      icon: CheckCircle2,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
    },
  ];

  // ---- Applications par statut (répartition) ----------------------------
  const breakdown = STATUS_BREAKDOWN.map((s) => ({
    ...s,
    count: stats.applicationsByStatus[s.key] ?? 0,
  }));
  const breakdownTotal = breakdown.reduce((sum, s) => sum + s.count, 0);

  // ---- Quick actions ----------------------------------------------------
  const quickActions: QuickActionProps[] = [
    {
      icon: Plus,
      title: "Publier une offre",
      description: "Créez une nouvelle annonce",
      onClick: () => navigate("dashboard", { section: "offers" }),
    },
    {
      icon: Users,
      title: "Voir les candidatures",
      description: "Traitez les candidatures reçues",
      onClick: () => navigate("dashboard", { section: "applications" }),
    },
    {
      icon: CalendarClock,
      title: "Mes entretiens",
      description: "Planifiez et suivez les entretiens",
      onClick: () => navigate("dashboard", { section: "interviews" }),
    },
    {
      icon: Building2,
      title: "Profil entreprise",
      description: "Gérez les informations de votre société",
      onClick: () => navigate("dashboard", { section: "company" }),
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
          {company ? (
            <span>
              <span className="font-medium text-navy">{company.legalName}</span>
              {company.sector ? ` · ${company.sector}` : ""}
              {companyLocation ? ` · ${companyLocation}` : ""}
              {companyStatusBadge}
            </span>
          ) : (
            "Voici un aperçu de votre activité de recrutement sur COORIZON."
          )}
        </p>
      </header>

      {/* Stat grid */}
      <section
        aria-label="Statistiques du tableau de bord"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </section>

      {/* Applications par statut */}
      <section aria-labelledby="apps-by-status-title">
        <Card className="py-5">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="apps-by-status-title"
                className="text-lg font-semibold text-navy"
              >
                Applications par statut
              </h2>
              <span className="text-sm text-muted-foreground">
                {stats.totalApplications} candidature
                {stats.totalApplications > 1 ? "s" : ""} au total
              </span>
            </div>

            {breakdownTotal === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Aucune candidature à afficher pour le moment.
              </p>
            ) : (
              <>
                {/* Stacked horizontal bar */}
                <div
                  role="img"
                  aria-label="Répartition des candidatures par statut"
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
