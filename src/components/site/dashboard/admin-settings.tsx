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
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  MessageCircle,
  Send,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

// ─── Connection profiles access ─────────────────────────────────────────────

interface RoleAccessRow {
  role: Role;
  label: string;
  enabled: boolean;
  locked: boolean;
}

// ─── Role metadata ─────────────────────────────────────────────────────────

const ROLE_META: { key: Role; label: string; color: string }[] = [
  { key: "Candidate", label: ROLE_LABELS.Candidate, color: "#1E8236" },
  { key: "Recruiter", label: ROLE_LABELS.Recruiter, color: "#0D3B1A" },
  { key: "Trainer", label: ROLE_LABELS.Trainer, color: "#D4A017" },
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

      {/* Connection profiles access (Admin & SuperAdmin) */}
      <RoleAccessCard />

      {/* SMTP server (SuperAdmin settings) */}
      <SmtpSettingsCard />

      {/* Emails & notifications (Admin & SuperAdmin) */}
      <NotificationSettingsCard />

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

      {/* ─── GDPR / Data Privacy ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-brand-green" />
            Confidentialité & RGPD
          </CardTitle>
          <CardDescription>
            Export et suppression des données personnelles (RGPD Article 15, 17, 20).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4 text-brand-green" />
            <AlertDescription>
              Conformément au RGPD et aux obligations applicables au Sénégal, les utilisateurs
              peuvent demander l'export ou la suppression de leurs données personnelles.
              Utilisez les outils ci-dessous pour répondre à ces demandes.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Export */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-brand" />
                <h4 className="font-semibold text-navy">Exporter les données</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Téléchargez toutes les données personnelles d'un utilisateur au format JSON
                (droit à la portabilité).
              </p>
              <PrivacyExportTool />
            </div>

            {/* Delete */}
            <div className="rounded-lg border border-italian-red/30 p-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-italian-red" />
                <h4 className="font-semibold text-navy">Supprimer les données</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Anonymise et supprime les données personnelles d'un utilisateur.
                Cette action est <strong className="text-italian-red">irréversible</strong>.
              </p>
              <PrivacyDeleteTool />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── WhatsApp Numbers ─── */}
      <WhatsAppSettingsCard />
    </div>
  );
}

// ─── Emails & notifications card ────────────────────────────────────────────

interface NotificationConfig {
  emailEnabled: boolean;
  emailRegistration: boolean;
  emailPayment: boolean;
  emailMessages: boolean;
  adminAlerts: boolean;
  alertRecipient: string;
}

interface EmailLogEntry {
  id: string;
  toEmail: string;
  subject: string;
  template: string;
  status: string;
  provider: string;
  createdAt: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  registration: "Inscription",
  payment: "Paiement",
  message: "Message",
  account: "Compte",
  forfait: "Forfait",
};

const EMAIL_TEMPLATES = ["registration", "payment", "message", "account"] as const;

/**
 * Email & notification switches (SuperAdmin settings) plus the journal of
 * the latest notification emails recorded by the platform.
 */
function NotificationSettingsCard() {
  const { toast } = useToast();

  const [config, setConfig] = React.useState<NotificationConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pendingSwitch, setPendingSwitch] = React.useState<string | null>(null);

  // Email journal
  const [emails, setEmails] = React.useState<EmailLogEntry[]>([]);
  const [emailsLoading, setEmailsLoading] = React.useState(true);
  const [templateFilter, setTemplateFilter] = React.useState<string>("all");
  const [showJournal, setShowJournal] = React.useState(false);

  const fetchConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Échec du chargement des paramètres.");
      const data = (await res.json()) as { notifications: NotificationConfig };
      setConfig(data.notifications);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmails = React.useCallback(async (filter: string) => {
    setEmailsLoading(true);
    try {
      const res = await fetch(`/api/admin/emails?template=${filter}&take=50`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { emails: EmailLogEntry[] };
      setEmails(data.emails);
    } catch {
      setEmails([]);
    } finally {
      setEmailsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  React.useEffect(() => {
    if (showJournal) void fetchEmails(templateFilter);
  }, [showJournal, templateFilter, fetchEmails]);

  const handleToggle = async (key: keyof Omit<NotificationConfig, "alertRecipient">, value: boolean) => {
    setPendingSwitch(key);
    try {
      const res = await fetch("/api/admin/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { notifications?: NotificationConfig; error?: string };
      if (!res.ok || !data.notifications) throw new Error(data.error || "Échec de la mise à jour.");
      setConfig(data.notifications);
      toast({ title: "Paramètre mis à jour" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setPendingSwitch(null);
    }
  };

  const handleRecipientSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alertRecipient: config.alertRecipient }),
      });
      const data = (await res.json().catch(() => ({}))) as { notifications?: NotificationConfig; error?: string };
      if (!res.ok || !data.notifications) throw new Error(data.error || "Échec de la mise à jour.");
      setConfig(data.notifications);
      toast({ title: "Destinataire enregistré" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy">
          <MessageCircle className="h-5 w-5 text-brand" />
          Emails &amp; notifications
        </CardTitle>
        <CardDescription>
          Activez ou désactivez les notifications email et les alertes visuelles de la plateforme.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !config ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              <NotificationSwitch
                label="Notifications email"
                description="Interrupteur général de tous les emails de notification."
                checked={config.emailEnabled}
                disabled={pendingSwitch === "emailEnabled"}
                onCheckedChange={(v) => void handleToggle("emailEnabled", v)}
              />
              <NotificationSwitch
                label="Emails d'inscription"
                description="Bienvenue aux nouveaux candidats et entreprises + alerte à l'administration."
                checked={config.emailRegistration}
                disabled={!config.emailEnabled || pendingSwitch === "emailRegistration"}
                onCheckedChange={(v) => void handleToggle("emailRegistration", v)}
              />
              <NotificationSwitch
                label="Emails de paiement"
                description="Demande de forfait, validation et activation du forfait formation."
                checked={config.emailPayment}
                disabled={!config.emailEnabled || pendingSwitch === "emailPayment"}
                onCheckedChange={(v) => void handleToggle("emailPayment", v)}
              />
              <NotificationSwitch
                label="Emails de messagerie"
                description="Prévenir le destinataire par email d'un nouveau message interne."
                checked={config.emailMessages}
                disabled={!config.emailEnabled || pendingSwitch === "emailMessages"}
                onCheckedChange={(v) => void handleToggle("emailMessages", v)}
              />
              <NotificationSwitch
                label="Alertes visuelles administration"
                description="Badges et notifications dans le back-office à chaque inscription ou paiement."
                checked={config.adminAlerts}
                disabled={pendingSwitch === "adminAlerts"}
                onCheckedChange={(v) => void handleToggle("adminAlerts", v)}
              />
            </ul>

            <Separator />

            {/* Alert recipient */}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="alert-recipient" className="text-xs">
                  Destinataire supplémentaire des alertes administration (optionnel)
                </Label>
                <Input
                  id="alert-recipient"
                  type="email"
                  placeholder="contact@coorizon.com"
                  value={config.alertRecipient}
                  onChange={(e) => setConfig({ ...config, alertRecipient: e.target.value })}
                  className="h-9"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => void handleRecipientSave()} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                Enregistrer
              </Button>
            </div>

            <Separator />

            {/* Email journal */}
            <div className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-semibold text-navy"
                onClick={() => setShowJournal((v) => !v)}
                aria-expanded={showJournal}
              >
                Journal des emails
                <Badge variant="secondary" className="ml-2 text-[10px] font-normal">
                  {showJournal ? "Masquer" : "Afficher"}
                </Badge>
              </button>
              {showJournal && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", ...EMAIL_TEMPLATES] as string[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTemplateFilter(t)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          templateFilter === t
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {t === "all" ? "Tous" : TEMPLATE_LABELS[t] ?? t}
                      </button>
                    ))}
                  </div>
                  {emailsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : emails.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Aucun email enregistré pour le moment.
                    </p>
                  ) : (
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                      {emails.map((e) => (
                        <li key={e.id} className="rounded-md border p-2.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="font-medium text-navy">{e.subject}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-normal",
                                e.status === "Sent" && "border-brand-green/40 text-brand-green",
                                e.status === "Skipped" && "border-amber-400 text-amber-700",
                                e.status === "Failed" && "border-italian-red/40 text-italian-red"
                              )}
                            >
                              {e.status === "Sent" ? "Envoyé" : e.status === "Skipped" ? "Désactivé" : "Échec"}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                            <span>{e.toEmail}</span>
                            <span aria-hidden>•</span>
                            <span>{TEMPLATE_LABELS[e.template] ?? e.template}</span>
                            <span aria-hidden>•</span>
                            <span>
                              {new Date(e.createdAt).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span aria-hidden>•</span>
                            <span className="uppercase">{e.provider === "smtp" ? "SMTP" : "Journal"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Les emails partent via le serveur SMTP configuré ci-dessus (Paramètres &gt; Serveur SMTP). Sans serveur configuré, ils sont uniquement enregistrés dans ce journal (envoi simulé).
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationSwitch({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} />
    </li>
  );
}

// ─── SMTP server settings card ──────────────────────────────────────────────

interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  hasPassword: boolean;
}

/**
 * SMTP server configuration (SuperAdmin settings).
 * The saved configuration drives every notification email (inscriptions,
 * paiements, messagerie, alertes admin) — with the legacy SMTP_* environment
 * variables as fallback when no host is stored.
 */
function SmtpSettingsCard() {
  const { toast } = useToast();
  const [form, setForm] = React.useState<SmtpSettings>({
    host: "",
    port: 587,
    secure: false,
    username: "",
    fromName: "COORIZON",
    fromEmail: "no-reply@coorizon.com",
    hasPassword: false,
  });
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testTo, setTestTo] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const fetchSmtp = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/smtp", { credentials: "include" });
      if (!res.ok) throw new Error("Échec du chargement du serveur SMTP.");
      const data = (await res.json()) as { smtp: SmtpSettings; active: boolean };
      setForm(data.smtp);
      setActive(Boolean(data.active));
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void fetchSmtp();
  }, [fetchSmtp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        smtp?: SmtpSettings;
        active?: boolean;
        error?: string;
      };
      if (!res.ok || !data.smtp) throw new Error(data.error || "Échec de la sauvegarde.");
      setForm(data.smtp);
      setActive(Boolean(data.active));
      setPassword("");
      toast({
        title: "Serveur SMTP enregistré",
        description: data.active
          ? "Les emails de notification partiront via ce serveur."
          : "Hôte vide : les emails restent enregistrés dans le journal (envoi simulé).",
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testTo.trim()) {
      toast({
        title: "Email requis",
        description: "Renseignez l'adresse destinataire du test.",
        variant: "destructive",
      });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Échec de l'envoi du test.");
      }
      toast({
        title: "Email de test envoyé",
        description: `Vérifiez la boîte de ${testTo.trim()}. L'envoi figure aussi dans le journal des emails.`,
      });
    } catch (e) {
      toast({
        title: "Échec du test SMTP",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-navy">
          <Server className="h-5 w-5 text-brand" />
          Serveur SMTP
          {!loading && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                active
                  ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                  : "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
              )}
            >
              {active ? "Configuré" : "Non configuré"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Paramétrez le serveur d&apos;envoi des emails (inscriptions, paiements, messagerie,
          alertes). Sans serveur configuré, les emails sont seulement enregistrés dans le
          journal des emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="smtp-host" className="text-xs">
                  Hôte SMTP
                </Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-port" className="text-xs">
                  Port
                </Label>
                <Input
                  id="smtp-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) =>
                    setForm({ ...form, port: Number(e.target.value) || 587 })
                  }
                  className="h-9"
                />
              </div>
            </div>

            <NotificationSwitch
              label="TLS sécurisé (SSL implicite)"
              description="Activé pour le port 465. Désactivé pour STARTTLS (587) ou port non chiffré."
              checked={form.secure}
              onCheckedChange={(v) => setForm({ ...form, secure: v })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-user" className="text-xs">
                  Nom d&apos;utilisateur
                </Label>
                <Input
                  id="smtp-user"
                  placeholder="no-reply@coorizon.com"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="h-9"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-pass" className="text-xs">
                  Mot de passe {form.hasPassword && "(déjà enregistré)"}
                </Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  placeholder={form.hasPassword ? "•••••••• (inchangé)" : "Mot de passe SMTP"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-from-name" className="text-xs">
                  Nom de l&apos;expéditeur
                </Label>
                <Input
                  id="smtp-from-name"
                  placeholder="COORIZON"
                  value={form.fromName}
                  onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-from-email" className="text-xs">
                  Email de l&apos;expéditeur
                </Label>
                <Input
                  id="smtp-from-email"
                  type="email"
                  placeholder="no-reply@coorizon.com"
                  value={form.fromEmail}
                  onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void handleSave()} disabled={saving} className="bg-brand hover:bg-brand/90">
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                Enregistrer la configuration
              </Button>
            </div>

            <Separator />

            {/* Test email */}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-test-to" className="text-xs">
                  Email de test (vérifier la configuration)
                </Label>
                <Input
                  id="smtp-test-to"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleTest()}
                disabled={testing || !form.host.trim()}
                title={!form.host.trim() ? "Configurez d'abord l'hôte SMTP" : undefined}
              >
                {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Envoyer un email de test
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Role access card (connection profiles) ────────────────────────────────

function RoleAccessCard() {
  const { toast } = useToast();
  const [roles, setRoles] = React.useState<RoleAccessRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pendingRole, setPendingRole] = React.useState<string | null>(null);
  const [usersByRole, setUsersByRole] = React.useState<Record<string, number>>({});

  const fetchRoles = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/settings/roles", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Échec du chargement des profils de connexion."
        );
      }
      const data = (await res.json()) as { roles: RoleAccessRow[] };
      setRoles(data.roles);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  // Affected account counts per profile (so the admin sees the impact of
  // enabling/disabling a connection profile).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { usersByRole?: Record<string, number> };
        if (!cancelled && data.usersByRole) setUsersByRole(data.usersByRole);
      } catch {
        // Counts are best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (row: RoleAccessRow, nextValue: boolean) => {
    if (row.locked) return;
    const previous = roles;
    // Optimistic update, reverted on error.
    setRoles((rs) =>
      rs.map((r) => (r.role === row.role ? { ...r, enabled: nextValue } : r))
    );
    setPendingRole(row.role);
    try {
      const res = await fetch("/api/admin/settings/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: row.role, enabled: nextValue }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        roles?: RoleAccessRow[];
        error?: string;
      };
      if (!res.ok || !data.roles) {
        throw new Error(
          data.error || "Impossible de modifier l'accès de ce profil."
        );
      }
      setRoles(data.roles);
      toast({
        title: nextValue ? "Profil activé" : "Profil désactivé",
        description: nextValue
          ? "Les comptes de ce profil peuvent à nouveau se connecter."
          : "Les comptes de ce profil ne peuvent plus se connecter depuis les pages de connexion.",
      });
    } catch (e) {
      setRoles(previous);
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setPendingRole(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy">
          <Lock className="h-5 w-5 text-brand" />
          Accès des profils de connexion
        </CardTitle>
        <CardDescription>
          Désactivez un profil pour bloquer toutes les connexions de ce type
          depuis les pages de connexion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{loadError}</span>
              <Button size="sm" variant="outline" onClick={() => void fetchRoles()}>
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="space-y-2">
            {roles.map((row) => {
              const meta = ROLE_META.find((m) => m.key === row.role);
              return (
                <li
                  key={row.role}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card p-3"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        !meta && "border-border bg-muted text-muted-foreground"
                      )}
                      style={
                        meta
                          ? {
                              color: meta.color,
                              borderColor: `${meta.color}55`,
                              backgroundColor: `${meta.color}14`,
                            }
                          : undefined
                      }
                    >
                      {row.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {usersByRole[row.role] ?? 0} compte{(usersByRole[row.role] ?? 0) > 1 ? "s" : ""}
                    </span>
                    {row.locked && (
                      <span className="text-xs text-muted-foreground">
                        Toujours actif
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={row.enabled}
                    disabled={row.locked || pendingRole === row.role}
                    onCheckedChange={(v) => void handleToggle(row, v)}
                    aria-label={
                      row.locked
                        ? `${row.label} (toujours actif)`
                        : row.enabled
                        ? `Désactiver le profil ${row.label}`
                        : `Activer le profil ${row.label}`
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        {!loading && !loadError && roles.some((r) => !r.enabled && !r.locked) && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Les profils désactivés apparaissent avec le badge « Connexions désactivées » dans l'onglet Utilisateurs et ne peuvent plus se connecter depuis les pages de connexion.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppSettingsCard() {
  const { toast } = useToast();
  const [numbers, setNumbers] = React.useState([
    { service: "Service Client", number: "221710907070", label: "Service Client" },
    { service: "Facturation", number: "221710907071", label: "Facturation" },
    { service: "Formation", number: "221710907072", label: "Formation" },
  ]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/settings/whatsapp?admin=true", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.numbers) setNumbers(d.numbers); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ numbers }),
      });
      if (!res.ok) throw new Error("Échec de la sauvegarde.");
      toast({ title: "Numéros WhatsApp mis à jour" });
    } catch {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          Numéros WhatsApp
        </CardTitle>
        <CardDescription>
          Configurez les numéros de téléphone pour le bouton flottant WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          numbers.map((num, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Service</Label>
                <Input
                  value={num.label}
                  onChange={(e) => {
                    const next = [...numbers];
                    next[i] = { ...num, label: e.target.value, service: e.target.value };
                    setNumbers(next);
                  }}
                  placeholder="Nom du service"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Numéro (format international sans +)</Label>
                <Input
                  value={num.number}
                  onChange={(e) => {
                    const next = [...numbers];
                    next[i] = { ...num, number: e.target.value.replace(/[^0-9]/g, "") };
                    setNumbers(next);
                  }}
                  placeholder="221710907070"
                />
              </div>
            </div>
          ))
        )}
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Enregistrer les numéros
        </Button>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Ces numéros apparaîtront sur le bouton flottant WhatsApp visible par tous les visiteurs.
            Le format doit être international sans le "+" (ex: 221710907070 pour le Sénégal).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
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

// ─── GDPR Tools ──────────────────────────────────────────────────────────────

function PrivacyExportTool() {
  const { toast } = useToast();
  const [userId, setUserId] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    if (!userId.trim()) {
      toast({ title: "Erreur", description: "Saisissez un ID utilisateur.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/privacy/export?userId=${encodeURIComponent(userId.trim())}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec de l'export.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coorizon-data-${userId.trim()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export téléchargé", description: "Les données ont été exportées au format JSON." });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec de l'export.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <Label htmlFor="export-userid" className="text-xs">ID utilisateur</Label>
      <div className="flex gap-2">
        <Input
          id="export-userid"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="cmw..."
          className="text-sm"
        />
        <Button size="sm" onClick={handleExport} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exporter
        </Button>
      </div>
    </div>
  );
}

function PrivacyDeleteTool() {
  const { toast } = useToast();
  const [userId, setUserId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/privacy/delete?userId=${encodeURIComponent(userId.trim())}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de la suppression.");
      toast({ title: "Données supprimées", description: data.message || "Les données ont été anonymisées." });
      setUserId("");
      setOpen(false);
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec de la suppression.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <Label htmlFor="delete-userid" className="text-xs">ID utilisateur</Label>
      <Input
        id="delete-userid"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="cmw..."
        className="text-sm"
      />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={!userId.trim()} className="w-full">
            <Trash2 className="h-4 w-4" />
            Supprimer les données
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. Toutes les données personnelles
              de cet utilisateur (documents, messages, notifications, certificats…) seront
              définitivement supprimées. Le compte sera anonymisé et désactivé.
              Les enregistrements liés (candidatures, paiements) seront conservés pour
              l'intégrité référentielle mais l'utilisateur sera anonymisé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={loading}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
