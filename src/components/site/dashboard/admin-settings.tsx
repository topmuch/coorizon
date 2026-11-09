"use client";

import * as React from "react";
import {
  Settings,
  Shield,
  Key,
  Globe,
  Database,
  Info,
  Lock,
  CheckCircle2,
  Users,
  Server,
  HardDrive,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSession } from "@/lib/auth/session-provider";
import { useSiteRouter } from "@/lib/site-router";
import { ROLE_LABELS, ALL_ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AdminStats {
  totals: {
    candidates: number;
    recruiters: number;
    validatedCompanies: number;
    activeOffers: number;
    totalApplications: number;
    enrollments: number;
    payments: number;
    revenue: number;
  };
  usersByRole: Record<string, number>;
}

// ─── Role metadata ─────────────────────────────────────────────────────────

const ROLE_META: { key: Role; label: string; color: string }[] = [
  { key: "Candidate", label: ROLE_LABELS.Candidate, color: "#2563A6" },
  { key: "Recruiter", label: ROLE_LABELS.Recruiter, color: "#17365D" },
  { key: "Trainer", label: ROLE_LABELS.Trainer, color: "#15966A" },
  { key: "RecruitmentAgent", label: ROLE_LABELS.RecruitmentAgent, color: "#7c3aed" },
  { key: "ImmigrationAgent", label: ROLE_LABELS.ImmigrationAgent, color: "#0891b2" },
  { key: "Admin", label: ROLE_LABELS.Admin, color: "#d92d35" },
  { key: "SuperAdmin", label: ROLE_LABELS.SuperAdmin, color: "#1e293b" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminSettings() {
  const { user } = useSession();
  const { navigate } = useSiteRouter();

  const isSuperAdmin = user?.role === "SuperAdmin";
  const isAdminOnly = user?.role === "Admin";

  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dbError, setDbError] = React.useState(false);

  // Fetch stats to derive the platform info (total users, roles breakdown,
  // and DB status — if the API responds, the DB is reachable).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setDbError(true);
          return;
        }
        const data = (await res.json()) as AdminStats;
        if (!cancelled) {
          setStats(data);
          setDbError(false);
        }
      } catch {
        if (!cancelled) setDbError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsers = stats
    ? Object.values(stats.usersByRole).reduce((sum, n) => sum + n, 0)
    : 0;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-navy">
          <Settings className="h-6 w-6 text-brand" />
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">
          Configuration générale de la plateforme et informations système.
        </p>
      </header>

      {/* Admin (non-SuperAdmin) notice */}
      {isAdminOnly && (
        <Alert>
          <Shield className="h-4 w-4 text-brand" />
          <AlertTitle>Accès administrateur</AlertTitle>
          <AlertDescription>
            Vous êtes connecté en tant qu'administrateur. Certaines
            opérations sensibles (gestion des rôles, configuration des
            intégrations) sont réservées au Super administrateur.
          </AlertDescription>
        </Alert>
      )}

      {/* Platform info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <Server className="h-5 w-5 text-brand" />
            Informations plateforme
          </CardTitle>
          <CardDescription>
            État général de la plateforme et répartition des utilisateurs par rôle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Stat tiles */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile
                  icon={Users}
                  label="Utilisateurs"
                  value={totalUsers}
                  color="bg-brand/10 text-brand"
                />
                <StatTile
                  icon={Database}
                  label="Base de données"
                  value={dbError ? "Indisponible" : "Connectée"}
                  color={
                    dbError
                      ? "bg-italian-red/10 text-italian-red"
                      : "bg-brand-green/15 text-brand-green"
                  }
                  isText
                />
                <StatTile
                  icon={Server}
                  label="Mode"
                  value="Production"
                  color="bg-navy/10 text-navy"
                  isText
                />
                <StatTile
                  icon={Globe}
                  label="Langue"
                  value="Français"
                  color="bg-amber-50 text-amber-700"
                  isText
                />
              </div>

              <Separator />

              {/* Roles breakdown */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-navy">
                  Répartition par rôle
                </h3>
                {stats ? (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ROLE_META.map((role) => {
                      const count = stats.usersByRole[role.key] ?? 0;
                      const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                      return (
                        <li
                          key={role.key}
                          className="flex items-center justify-between rounded-md border bg-card p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: role.color }}
                              aria-hidden
                            />
                            <span className="text-sm text-foreground">
                              {role.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-navy">
                              {count}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {pct.toFixed(0)}%
                            </Badge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Données de répartition indisponibles.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SuperAdmin: role management */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <Shield className="h-5 w-5 text-brand" />
              Gestion des rôles
            </CardTitle>
            <CardDescription>
              Le Super administrateur peut modifier le rôle de n'importe quel
              utilisateur de la plateforme.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Les modifications de rôles s'effectuent depuis la section
              « Utilisateurs » du back-office. Sélectionnez un utilisateur,
              puis choisissez son nouveau rôle parmi les valeurs suivantes :
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="border-brand/30 text-brand"
                >
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("dashboard", { section: "users" })}
              className="mt-2"
            >
              Aller à la gestion des utilisateurs
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* General settings (SuperAdmin only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <Settings className="h-5 w-5 text-brand" />
            Paramètres généraux
          </CardTitle>
          <CardDescription>
            Identité de la plateforme et langue par défaut.
            {isSuperAdmin
              ? " La configuration des clés API et des intégrations externes se fait via les variables d'environnement côté serveur."
              : " Accessible en lecture seule. La configuration avancée est réservée au Super administrateur."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadonlyRow
            icon={Globe}
            label="Nom de la plateforme"
            value="COORIZON"
          />
          <Separator />
          <ReadonlyRow
            icon={Globe}
            label="Langue par défaut"
            value="Français"
          />
          <Separator />
          <ReadonlyRow
            icon={Key}
            label="Clés API & intégrations"
            value="Configurées via variables d'environnement (côté serveur)"
            note="Les clés API ne sont jamais stockées ni modifiables dans l'interface. Elles vivent dans les secrets du serveur."
          />
        </CardContent>
      </Card>

      {/* Security card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <Lock className="h-5 w-5 text-brand" />
            Sécurité & confidentialité
          </CardTitle>
          <CardDescription>
            Politiques appliquées par défaut sur la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadonlyRow
            icon={Key}
            label="Politique de mot de passe"
            value="Min. 8 caractères, hachage bcrypt"
            note="Les mots de passe sont hachés avec bcrypt et ne sont jamais stockés en clair."
          />
          <Separator />
          <ReadonlyRow
            icon={HardDrive}
            label="Rétention des données"
            value="Conformément à la politique RGPD"
            note="Les données personnelles sont conservées selon la politique RGPD en vigueur."
          />
          <Separator />
          <ReadonlyRow
            icon={Database}
            label="Sauvegardes"
            value="Automatiques, gérées côté serveur"
            note="Les sauvegardes sont planifiées et supervisées par l'équipe d'exploitation."
          />
          <Separator />
          <ReadonlyRow
            icon={Shield}
            label="Journalisation"
            value="Audit actif"
            note="Toutes les actions sensibles sont enregistrées dans le journal d'audit (voir la section dédiée)."
          />
        </CardContent>
      </Card>

      {/* About card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <Info className="h-5 w-5 text-brand" />
            À propos
          </CardTitle>
          <CardDescription>
            Informations de version de la plateforme COORIZON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadonlyRow
            icon={CheckCircle2}
            label="Plateforme"
            value="COORIZON"
          />
          <Separator />
          <ReadonlyRow
            icon={Server}
            label="Version"
            value="LOT 5 — Back-office administrateur"
          />
          <Separator />
          <ReadonlyRow
            icon={Database}
            label="Pile technique"
            value="Next.js 16 · TypeScript · Prisma · Tailwind CSS"
          />
          <Separator />
          <ReadonlyRow
            icon={Globe}
            label="Région"
            value="Europe"
          />
        </CardContent>
      </Card>

      {/* Read-only notice */}
      <Alert>
        <Info className="h-4 w-4 text-brand" />
        <AlertTitle>Configuration en lecture seule</AlertTitle>
        <AlertDescription>
          Les paramètres avancés (clés API, intégrations externes, variables
          d'environnement) sont gérés côté serveur par l'équipe d'exploitation
          et ne sont jamais exposés ni modifiables depuis le navigateur, par
          mesure de sécurité.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}

function StatTile({ icon: Icon, label, value, color, isText }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold text-navy">
        {isText ? value : value.toLocaleString("fr-FR")}
      </div>
    </div>
  );
}

interface ReadonlyRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
}

function ReadonlyRow({ icon: Icon, label, value, note }: ReadonlyRowProps) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[1fr_2fr] sm:items-start">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 text-sm text-navy">
          <span className="font-medium">{value}</span>
          <Lock className="h-3 w-3 text-muted-foreground" aria-label="Lecture seule" />
        </div>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}
