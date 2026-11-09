"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Euro,
  GraduationCap,
  RefreshCw,
  Send,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useSiteRouter } from "@/lib/site-router";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (mirror of GET /api/admin/stats response)
// ---------------------------------------------------------------------------

interface Totals {
  candidates: number;
  newCandidates: number;
  recruiters: number;
  validatedCompanies: number;
  pendingCompanies: number;
  activeOffers: number;
  pendingOffers: number;
  totalApplications: number;
  recruitmentsFinalized: number;
  enrollments: number;
  activeEnrollments: number;
  immigrationCases: number;
  certificates: number;
  payments: number;
  revenue: number;
}

interface MonthlyDatum {
  month: string;
  candidates: number;
  applications: number;
  offers: number;
}

interface AdminStats {
  totals: Totals;
  monthlyData: MonthlyDatum[];
  applicationsByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Brand palette (matches globals.css tokens)
// ---------------------------------------------------------------------------

const BRAND = "#2563A6";
const BRAND_GREEN = "#15966A";
const NAVY = "#17365D";
const ITALIAN_RED = "#D92D35";

// ---------------------------------------------------------------------------
// Static metadata for charts
// ---------------------------------------------------------------------------

const APPLICATION_STATUS_META: { key: string; label: string; color: string }[] =
  [
    { key: "Submitted", label: "Reçues", color: "#94a3b8" },
    { key: "Preselected", label: "Présélectionnées", color: BRAND },
    { key: "Interview", label: "Entretiens", color: NAVY },
    { key: "Offered", label: "Propositions", color: "#f59e0b" },
    { key: "Accepted", label: "Acceptées", color: BRAND_GREEN },
    { key: "Rejected", label: "Refusées", color: ITALIAN_RED },
    { key: "Withdrawn", label: "Retirées", color: "#cbd5e1" },
  ];

const ROLE_META: { key: string; label: string; color: string }[] = [
  { key: "Candidate", label: "Candidats", color: BRAND },
  { key: "Recruiter", label: "Recruteurs", color: NAVY },
  { key: "Trainer", label: "Formateurs", color: BRAND_GREEN },
  { key: "RecruitmentAgent", label: "Agents recrutement", color: "#7c3aed" },
  { key: "ImmigrationAgent", label: "Agents immigration", color: "#0891b2" },
  { key: "Admin", label: "Administrateurs", color: ITALIAN_RED },
  { key: "SuperAdmin", label: "Super admins", color: "#1e293b" },
];

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  subtitleClass?: string;
  icon: LucideIcon;
  iconBoxClass: string;
  onClick?: () => void;
}

function StatCard({
  label,
  value,
  subtitle,
  subtitleClass,
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
        "h-full py-5",
        clickable &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      )}
    >
      <CardContent className="flex h-full items-start gap-3">
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
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {label}
          </div>
          {subtitle ? (
            <div
              className={cn(
                "mt-1 truncate text-xs font-medium",
                subtitleClass ?? "text-brand-green"
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Chart tooltip
// ---------------------------------------------------------------------------

interface ChartTooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
  formatter?: (value: number) => string;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? (
        <div className="mb-1 font-medium text-foreground">{label}</div>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((p, i) => {
          const v =
            typeof p.value === "number" && formatter
              ? formatter(p.value)
              : String(p.value ?? "");
          return (
            <li key={i} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-muted-foreground">{p.name}</span>
              <span className="ml-auto font-medium text-foreground">{v}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdminOverview() {
  const { navigate } = useSiteRouter();

  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger les statistiques."
        );
      }
      const data = (await res.json()) as AdminStats;
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

  // ----- Loading skeleton -----
  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-80" />
          <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="py-5">
              <CardContent className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ----- Error state -----
  if (error && !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
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

  if (!stats) return null;

  const { totals, monthlyData, applicationsByStatus, usersByRole } = stats;

  // ----- Stat cards -----
  const cards: StatCardProps[] = [
    {
      label: "Candidats",
      value: formatNumber(totals.candidates),
      subtitle:
        totals.newCandidates > 0
          ? `+${formatNumber(totals.newCandidates)} nouveaux (30 j)`
          : "Aucun nouveau (30 j)",
      subtitleClass:
        totals.newCandidates > 0 ? "text-brand-green" : "text-muted-foreground",
      icon: Users,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "users" }),
    },
    {
      label: "Recruteurs",
      value: formatNumber(totals.recruiters),
      icon: Briefcase,
      iconBoxClass: "bg-navy/10 text-navy",
      onClick: () => navigate("dashboard", { section: "users" }),
    },
    {
      label: "Entreprises validées",
      value: formatNumber(totals.validatedCompanies),
      subtitle:
        totals.pendingCompanies > 0
          ? `${formatNumber(totals.pendingCompanies)} en attente`
          : "Aucune en attente",
      subtitleClass:
        totals.pendingCompanies > 0
          ? "text-italian-red"
          : "text-muted-foreground",
      icon: Building2,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
      onClick: () => navigate("dashboard", { section: "companies" }),
    },
    {
      label: "Offres actives",
      value: formatNumber(totals.activeOffers),
      subtitle:
        totals.pendingOffers > 0
          ? `${formatNumber(totals.pendingOffers)} en attente`
          : "Aucune en attente",
      subtitleClass:
        totals.pendingOffers > 0
          ? "text-italian-red"
          : "text-muted-foreground",
      icon: TrendingUp,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "offers" }),
    },
    {
      label: "Candidatures",
      value: formatNumber(totals.totalApplications),
      icon: Send,
      iconBoxClass: "bg-navy/10 text-navy",
      onClick: () => navigate("dashboard", { section: "applications" }),
    },
    {
      label: "Recrutements finalisés",
      value: formatNumber(totals.recruitmentsFinalized),
      icon: CheckCircle2,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
      onClick: () => navigate("dashboard", { section: "applications" }),
    },
    {
      label: "Apprenants",
      value: formatNumber(totals.activeEnrollments),
      subtitle: `${formatNumber(totals.enrollments)} inscriptions au total`,
      subtitleClass: "text-muted-foreground",
      icon: GraduationCap,
      iconBoxClass: "bg-brand/10 text-brand",
      onClick: () => navigate("dashboard", { section: "training" }),
    },
    {
      label: "Revenus",
      value: formatEuro(totals.revenue),
      subtitle: `${formatNumber(totals.payments)} paiement${
        totals.payments > 1 ? "s" : ""
      } payé${totals.payments > 1 ? "s" : ""}`,
      subtitleClass: "text-brand-green",
      icon: Euro,
      iconBoxClass: "bg-brand-green/10 text-brand-green",
      onClick: () => navigate("dashboard", { section: "payments" }),
    },
  ];

  // ----- Applications by status pie data (filter zero values) -----
  const pieData = APPLICATION_STATUS_META.map((m) => ({
    name: m.label,
    value: applicationsByStatus[m.key] ?? 0,
    color: m.color,
  })).filter((d) => d.value > 0);

  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0);

  // ----- Users by role bar data -----
  const roleData = ROLE_META.map((m) => ({
    name: m.label,
    role: m.key,
    count: usersByRole[m.key] ?? 0,
    color: m.color,
  }));

  const showPendingCompanies = totals.pendingCompanies > 0;
  const showPendingOffers = totals.pendingOffers > 0;
  const showPendingActions = showPendingCompanies || showPendingOffers;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <header>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Tableau de bord administrateur
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Vue d’ensemble de l’activité de la plateforme
          COORIZON : utilisateurs, entreprises, offres, candidatures,
          formations et revenus.
        </p>
      </header>

      {/* Pending actions */}
      {showPendingActions ? (
        <section aria-labelledby="pending-actions-title">
          <h2 id="pending-actions-title" className="sr-only">
            Actions en attente
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {showPendingCompanies ? (
              <Alert>
                <Clock className="h-4 w-4 text-brand" />
                <AlertTitle>
                  {formatNumber(totals.pendingCompanies)} entreprise
                  {totals.pendingCompanies > 1 ? "s" : ""} en attente de
                  validation
                </AlertTitle>
                <AlertDescription>
                  <span className="text-muted-foreground">
                    Examinez et validez les nouvelles entreprises inscrites.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() =>
                      navigate("dashboard", { section: "companies" })
                    }
                  >
                    Examiner les entreprises
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {showPendingOffers ? (
              <Alert>
                <Clock className="h-4 w-4 text-brand" />
                <AlertTitle>
                  {formatNumber(totals.pendingOffers)} offre
                  {totals.pendingOffers > 1 ? "s" : ""} en attente de validation
                </AlertTitle>
                <AlertDescription>
                  <span className="text-muted-foreground">
                    Validez les offres d’emploi soumises par les
                    recruteurs.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => navigate("dashboard", { section: "offers" })}
                  >
                    Examiner les offres
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Stat cards grid */}
      <section
        aria-label="Indicateurs clés de la plateforme"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </section>

      {/* Monthly trends + Applications by status */}
      <section
        aria-label="Évolution mensuelle et répartition des candidatures"
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-navy">Évolution sur 6 mois</CardTitle>
            <CardDescription>
              Nouveaux candidats, candidatures et offres créées
              par mois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="h-72 w-full"
              role="img"
              aria-label="Évolution mensuelle sur 6 mois"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={formatNumber} />}
                    cursor={{ fill: "rgba(148,163,184,0.15)" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="candidates"
                    name="Candidats"
                    fill={BRAND}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="applications"
                    name="Candidatures"
                    fill={BRAND_GREEN}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="offers"
                    name="Offres"
                    fill={NAVY}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-navy">
              Candidatures par statut
            </CardTitle>
            <CardDescription>
              Répartition des {formatNumber(totals.totalApplications)}{" "}
              candidatures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieTotal === 0 ? (
              <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-center text-sm text-muted-foreground">
                Aucune candidature à afficher.
              </div>
            ) : (
              <div
                className="h-72 w-full"
                role="img"
                aria-label="Répartition des candidatures par statut"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip formatter={formatNumber} />}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Users by role */}
      <section aria-labelledby="users-by-role-title">
        <Card>
          <CardHeader>
            <CardTitle id="users-by-role-title" className="text-navy">
              Utilisateurs par rôle
            </CardTitle>
            <CardDescription>
              Répartition des comptes utilisateurs par rôle sur la
              plateforme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="h-72 w-full"
              role="img"
              aria-label="Répartition des utilisateurs par rôle"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roleData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                    width={140}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={formatNumber} />}
                    cursor={{ fill: "rgba(148,163,184,0.15)" }}
                  />
                  <Bar
                    dataKey="count"
                    name="Utilisateurs"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                  >
                    {roleData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {roleData.map((r) => (
                <Badge
                  key={r.role}
                  variant="secondary"
                  className="gap-1.5"
                  title={r.name}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  {r.name} : {formatNumber(r.count)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
