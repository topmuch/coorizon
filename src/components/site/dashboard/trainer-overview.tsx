"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  Award,
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

/** Shape returned by GET /api/trainer/stats. */
interface TrainerStats {
  totalCourses: number;
  publishedCourses: number;
  totalLearners: number;
  activeLearners: number;
  completedLearners: number;
  totalAttempts: number;
  passedAttempts: number;
  avgScore: number;
}

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

export function TrainerOverview() {
  const { user } = useSession();
  const { navigate } = useSiteRouter();

  const [stats, setStats] = React.useState<TrainerStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/stats", {
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
      const data = (await res.json()) as TrainerStats;
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

  const successRate =
    stats.totalAttempts > 0
      ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100)
      : 0;

  // ---- Stat cards config ------------------------------------------------
  const cards: StatCardProps[] = [
    {
      label: "Formations",
      value: String(stats.totalCourses),
      icon: GraduationCap,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "courses" }),
    },
    {
      label: "Publiées",
      value: String(stats.publishedCourses),
      icon: BookOpen,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
      onClick: () => navigate("dashboard", { section: "courses" }),
    },
    {
      label: "Apprenants",
      value: String(stats.totalLearners),
      icon: Users,
      iconBoxClass: "bg-navy/10 text-navy",
      onClick: () => navigate("dashboard", { section: "learners" }),
    },
    {
      label: "Apprenants actifs",
      value: String(stats.activeLearners),
      icon: TrendingUp,
      iconBoxClass: "bg-amber-100 text-amber-700",
      onClick: () => navigate("dashboard", { section: "learners" }),
    },
    {
      label: "Tentatives d'examen",
      value: String(stats.totalAttempts),
      icon: ClipboardCheck,
      iconBoxClass: "bg-italian-red/10 text-italian-red",
      onClick: () => navigate("dashboard", { section: "exams" }),
    },
    {
      label: "Taux de réussite",
      value: `${successRate}%`,
      icon: Award,
      iconBoxClass:
        successRate >= 50
          ? "bg-brand-green/10 text-brand-green"
          : "bg-muted text-muted-foreground",
      onClick: () => navigate("dashboard", { section: "exams" }),
    },
  ];

  // ---- Quick actions ----------------------------------------------------
  const quickActions: QuickActionProps[] = [
    {
      icon: Plus,
      title: "Nouvelle formation",
      description: "Créez une nouvelle formation en italien",
      onClick: () => navigate("dashboard", { section: "courses" }),
    },
    {
      icon: BookOpen,
      title: "Leçons & contenu",
      description: "Parcourez la structure de vos cours",
      onClick: () => navigate("dashboard", { section: "lessons" }),
    },
    {
      icon: Users,
      title: "Mes apprenants",
      description: "Suivez la progression de vos élèves",
      onClick: () => navigate("dashboard", { section: "learners" }),
    },
    {
      icon: ClipboardCheck,
      title: "Examens & résultats",
      description: "Consultez les tentatives récentes",
      onClick: () => navigate("dashboard", { section: "exams" }),
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
          Voici un aperçu de votre activité de formation sur COORIZON.
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

      {/* Highlights */}
      <section aria-labelledby="highlights-title">
        <Card className="py-5">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="highlights-title"
                className="text-lg font-semibold text-navy"
              >
                Points clés
              </h2>
              <Badge variant="secondary">
                {stats.totalAttempts} tentative
                {stats.totalAttempts > 1 ? "s" : ""} au total
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-card px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  Formations terminées par les apprenants
                </div>
                <div className="mt-1 text-xl font-bold text-navy">
                  {stats.completedLearners}
                </div>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  Tentatives réussies
                </div>
                <div className="mt-1 text-xl font-bold text-brand-green">
                  {stats.passedAttempts}
                </div>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  Score moyen
                </div>
                <div className="mt-1 text-xl font-bold text-brand">
                  {stats.avgScore}%
                </div>
              </div>
            </div>
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
