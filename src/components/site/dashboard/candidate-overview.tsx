"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarClock,
  Clock,
  FileCheck,
  GraduationCap,
  Plane,
  RefreshCw,
  Send,
  User,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/session-provider";
import { useSiteRouter } from "@/lib/site-router";
import { cn } from "@/lib/utils";

/** Shape returned by GET /api/candidate/stats. */
interface CandidateStats {
  profileCompletion: number;
  italianLevel: string | null;
  activeEnrollments: number;
  applicationsSent: number;
  applicationsInProgress: number;
  interviewsScheduled: number;
  pendingDocs: number;
  missingDocs: number;
  immigrationStatus: string | null;
}

/** Mapping ImmigrationCaseStatus → libellé français. */
const IMMIGRATION_LABELS: Record<string, string> = {
  Open: "Ouvert",
  InProgress: "En cours",
  DocumentsPending: "Docs en attente",
  VisaPending: "Visa en attente",
  Ready: "Prêt",
  Closed: "Clôturé",
  OnHold: "En pause",
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

export function CandidateOverview() {
  const { user } = useSession();
  const { navigate } = useSiteRouter();

  const [stats, setStats] = React.useState<CandidateStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/stats", {
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
      const data = (await res.json()) as CandidateStats;
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
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="py-5">
              <CardContent className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-20 w-full" />
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
      label: "Profil complété",
      value: `${stats.profileCompletion}%`,
      icon: User,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "profile" }),
    },
    {
      label: "Niveau d'italien",
      value: stats.italianLevel ?? "—",
      icon: GraduationCap,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
    },
    {
      label: "Formations en cours",
      value: String(stats.activeEnrollments),
      icon: BookOpen,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "training" }),
    },
    {
      label: "Candidatures envoyées",
      value: String(stats.applicationsSent),
      icon: Send,
      iconBoxClass: "bg-navy/10 text-navy",
    },
    {
      label: "Candidatures en cours",
      value: String(stats.applicationsInProgress),
      icon: Clock,
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
      onClick: () => navigate("dashboard", { section: "applications" }),
    },
    {
      label: "Documents manquants",
      value: String(stats.missingDocs),
      icon: AlertTriangle,
      iconBoxClass:
        stats.missingDocs > 0
          ? "bg-italian-red/10 text-italian-red"
          : "bg-brand-green/10 text-brand-green",
      onClick: () => navigate("dashboard", { section: "documents" }),
    },
    {
      label: "Dossier administratif",
      value: stats.immigrationStatus
        ? IMMIGRATION_LABELS[stats.immigrationStatus] ??
          stats.immigrationStatus
        : "Aucun dossier",
      icon: Plane,
      iconBoxClass: "bg-navy/10 text-navy",
      onClick: () => navigate("dashboard", { section: "immigration" }),
    },
  ];

  // ---- Quick actions ----------------------------------------------------
  const quickActions: QuickActionProps[] = [
    {
      icon: User,
      title: "Compléter mon profil",
      description: "Renseignez vos informations personnelles et pro",
      onClick: () => navigate("dashboard", { section: "profile" }),
    },
    {
      icon: Briefcase,
      title: "Voir les offres",
      description: "Parcourez les annonces en Italie",
      onClick: () => navigate("dashboard", { section: "jobs" }),
    },
    {
      icon: FileCheck,
      title: "Téléverser mes documents",
      description: "CV, passeport, diplômes…",
      onClick: () => navigate("dashboard", { section: "documents" }),
    },
    {
      icon: Send,
      title: "Mes candidatures",
      description: "Suivez vos postulations",
      onClick: () => navigate("dashboard", { section: "applications" }),
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
          Voici un aperçu de votre activité sur COORIZON.
        </p>
      </header>

      {/* Pending documents info alert */}
      {stats.pendingDocs > 0 && (
        <Alert className="border-brand/20 bg-brand/5">
          <FileCheck className="h-4 w-4 text-brand" />
          <AlertTitle className="text-navy">
            Documents en attente de validation
          </AlertTitle>
          <AlertDescription>
            {stats.pendingDocs} document
            {stats.pendingDocs > 1 ? "s" : ""} en cours de vérification par
            notre équipe. Vous serez notifié dès leur validation.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat grid */}
      <section
        aria-label="Statistiques du tableau de bord"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
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
