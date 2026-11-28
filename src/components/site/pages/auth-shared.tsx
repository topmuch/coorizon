"use client";

import * as React from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  User,
  Eye,
  EyeOff,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Plane,
  Users,
  Building2,
  Video,
  ClipboardList,
  Activity,
  Compass,
  Headset,
  Ban,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth/session-provider";
import { Logo } from "../logo";

// ─── Auth Layout (shared — used by registration pages) ──────────────────────

export function AuthLayout({
  children,
  accent = "green",
  title,
  subtitle,
}: {
  children: React.ReactNode;
  accent?: "green" | "gold" | "navy";
  title?: string;
  subtitle?: string;
}) {
  const { navigate } = useSiteRouter();
  const accentColors = {
    green: "from-brand to-brand-green",
    gold: "from-brand-green to-gold",
    navy: "from-navy to-brand",
  };
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-surface px-4 py-8">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-radial" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => navigate("home")}
            aria-label="Retour à l'accueil COORIZON"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Logo size="lg" />
          </button>
        </div>
        <Card className={`border-0 shadow-2xl`}>
          <div className={`h-1.5 rounded-t-xl bg-gradient-to-r ${accentColors[accent]}`} />
          <CardContent className="p-6 sm:p-8">
            {title && (
              <div className="text-center">
                <h1 className="text-2xl font-bold text-navy">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            )}
            {children}
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          En continuant, vous acceptez les conditions d'utilisation et la politique de
          confidentialité de COORIZON.
        </p>
      </div>
    </div>
  );
}

// ─── Split Auth Layout (professional: info left / form right) ───────────────

interface SplitFeature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const panelGradients: Record<"green" | "gold" | "navy", string> = {
  green: "from-navy via-navy/95 to-brand",
  gold: "from-navy via-navy/90 to-brand-green/70",
  navy: "from-[#081c10] via-navy to-brand/80",
};

const accentStrips: Record<"green" | "gold" | "navy", string> = {
  green: "bg-gradient-to-r from-brand to-brand-green",
  gold: "bg-gradient-to-r from-brand-green to-gold",
  navy: "bg-gradient-to-r from-navy to-brand",
};

export function AuthSplitLayout({
  children,
  accent = "green",
  eyebrow,
  panelTitle,
  panelDescription,
  features,
  footnote,
}: {
  children: React.ReactNode;
  accent?: "green" | "gold" | "navy";
  eyebrow: string;
  panelTitle: string;
  panelDescription: string;
  features: SplitFeature[];
  footnote?: string;
}) {
  const { navigate } = useSiteRouter();

  return (
    <div className="flex min-h-screen w-full">
      {/* Left: information panel */}
      <aside
        className={`relative hidden w-[44%] max-w-2xl flex-col justify-between overflow-hidden bg-gradient-to-br ${panelGradients[accent]} p-10 lg:flex xl:p-12`}
      >
        {/* Decorations */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full border border-white/10 bg-white/5"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-16 top-44 h-40 w-40 rounded-full border border-white/10"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-7">
          <button
            onClick={() => navigate("home")}
            className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-2 shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Retour à l'accueil COORIZON"
          >
            <Logo size="md" />
          </button>

          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              {eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white xl:text-4xl">
              {panelTitle}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
              {panelDescription}
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                  <feature.icon className="h-5 w-5 text-gold" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{feature.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-white/70">
                    {feature.description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mt-8 flex items-center gap-2 text-xs text-white/60">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
          {footnote ?? "Connexion sécurisée et chiffrée · Vos données restent confidentielles."}
        </div>
      </aside>

      {/* Right: form panel */}
      <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-surface px-4 py-8 sm:px-6 lg:px-10">
        <div className="absolute inset-0 bg-hero-radial" aria-hidden="true" />
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo (the info panel is hidden below lg) */}
          <div className="mb-6 flex justify-center lg:hidden">
            <button
              onClick={() => navigate("home")}
              aria-label="Retour à l'accueil COORIZON"
              className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Logo size="lg" />
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
            <div className={`h-1.5 ${accentStrips[accent]}`} />
            <div className="p-6 sm:p-8">{children}</div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez les conditions d'utilisation et la politique de
            confidentialité de COORIZON.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Disabled profiles (real-time from platform settings) ──────────────────

/**
 * Fetch the connection profiles disabled platform-wide by the SuperAdmin.
 * The list drives the login hub (disabled profiles are hidden entirely) and
 * each dedicated login page (form replaced by a notice) so deactivated
 * profiles are never usable nor visible from the UI.
 */
function useDisabledRoles(): string[] {
  const [disabledRoles, setDisabledRoles] = React.useState<string[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/check-login", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && Array.isArray(d.disabledRoles)) {
          setDisabledRoles(d.disabledRoles as string[]);
        }
      })
      .catch(() => {
        // Best effort: if the endpoint is unreachable, keep profiles enabled.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return disabledRoles;
}

function isProfileDisabled(disabledRoles: string[], profileRoles: string[]): boolean {
  return (
    profileRoles.length > 0 &&
    profileRoles.every((r) => disabledRoles.includes(r))
  );
}

// ─── Multi-role Login Page (default hub) ────────────────────────────────────

export function LoginPage() {
  const { navigate } = useSiteRouter();
  const disabledRoles = useDisabledRoles();

  const roles = [
    {
      id: "candidate",
      title: "Candidat",
      description: "Offres d'emploi, formations et dossier d'immigration.",
      icon: User,
      route: "login-candidate" as const,
      reserved: false,
      profileRoles: ["Candidate"],
    },
    {
      id: "recruiter",
      title: "Entreprise",
      description: "Publication d'offres et gestion des candidatures reçues.",
      icon: Briefcase,
      route: "login-recruiter" as const,
      reserved: false,
      profileRoles: ["Recruiter"],
    },
    {
      id: "trainer",
      title: "Formateur",
      description: "Cours d'italien, leçons vidéo et examens.",
      icon: GraduationCap,
      route: "login-trainer" as const,
      reserved: false,
      profileRoles: ["Trainer"],
    },
    {
      id: "agent",
      title: "Agent",
      description: "Dossiers d'immigration et tâches assignées.",
      icon: Plane,
      route: "login-agent" as const,
      reserved: false,
      profileRoles: ["RecruitmentAgent", "ImmigrationAgent"],
    },
    {
      id: "admin",
      title: "SuperAdmin",
      description: "Console d'administration de la plateforme COORIZON.",
      icon: ShieldCheck,
      route: "login-admin" as const,
      reserved: true,
      profileRoles: [] as string[],
    },
  ];

  return (
    <AuthSplitLayout
      accent="green"
      eyebrow="Bienvenue sur COORIZON"
      panelTitle="Chaque profil a son espace dédié."
      panelDescription="COORIZON sépare les comptes pour plus de clarté et de sécurité. Sélectionnez votre espace ci-contre, puis connectez-vous avec vos identifiants."
      features={[
        {
          icon: Users,
          title: "Un espace par profil",
          description:
            "Candidat, entreprise, formateur, agent et administration : chacun dispose de ses outils dédiés.",
        },
        {
          icon: ShieldCheck,
          title: "Connexion sécurisée",
          description: "Vos identifiants et vos données personnelles sont protégés.",
        },
        {
          icon: Compass,
          title: "Accompagnement complet",
          description: "Emploi, formation et immigration réunis sur une plateforme unique.",
        },
        {
          icon: Headset,
          title: "Une équipe à votre écoute",
          description: "Un souci de connexion ? Contactez le support COORIZON.",
        },
      ]}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">Connexion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chaque profil dispose de son propre espace. Sélectionnez le vôtre.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Disabled profiles are hidden entirely (SuperAdmin setting). */}
        {roles
          .filter(
            (role) =>
              role.reserved ||
              !isProfileDisabled(disabledRoles, role.profileRoles)
          )
          .map((role) =>
            role.reserved ? (
            <button
              key={role.id}
              onClick={() => navigate(role.route)}
              className="group flex items-start gap-4 rounded-xl border border-gold/40 bg-gradient-to-r from-navy to-brand/90 p-4 text-left text-white transition-all hover:shadow-lg sm:col-span-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/20 text-gold">
                <role.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{role.title}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                    <Lock className="h-2.5 w-2.5" />
                    Accès réservé
                  </span>
                </span>
                <span className="mt-1 block text-xs text-white/70">{role.description}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              key={role.id}
              onClick={() => navigate(role.route)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-brand/40 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <role.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="text-sm font-semibold text-navy">{role.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {role.description}
                </span>
              </span>
              <span className="mt-1 inline-flex items-center text-xs font-medium text-brand">
                Se connecter
                <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          )
          )}
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-muted-foreground">
        Pas encore de compte ?{" "}
        <button
          onClick={() => navigate("register-candidate")}
          className="font-semibold text-brand hover:underline"
        >
          Inscrivez-vous comme candidat
        </button>{" "}
        ou{" "}
        <button
          onClick={() => navigate("register-recruiter")}
          className="font-semibold text-brand hover:underline"
        >
          comme entreprise
        </button>
      </div>
    </AuthSplitLayout>
  );
}

// ─── Dedicated login pages (one per account type) ───────────────────────────

export function CandidateLoginPage() {
  return (
    <RoleLoginPage
      roleLabel="Candidat"
      title="Espace Candidat"
      subtitle="Connectez-vous pour accéder aux offres et formations."
      eyebrow="Espace Candidat"
      panelTitle="Votre mobilité professionnelle, pilotée depuis un seul espace."
      panelDescription="Suivez vos candidatures, vos formations et votre dossier d'immigration jusqu'à votre départ en Italie."
      accent="green"
      icon={User}
      expectedRoles={["Candidate"]}
      footer="candidate"
      features={[
        {
          icon: Briefcase,
          title: "Offres d'emploi",
          description: "Postulez en un clic aux offres adaptées à votre profil.",
        },
        {
          icon: GraduationCap,
          title: "Formations & examens",
          description: "Suivez vos cours d'italien et passez vos certifications.",
        },
        {
          icon: Plane,
          title: "Dossier d'immigration",
          description: "Documents, étapes et statuts suivis en temps réel.",
        },
      ]}
    />
  );
}

export function RecruiterLoginPage() {
  return (
    <RoleLoginPage
      roleLabel="Entreprise"
      title="Espace Entreprise"
      subtitle="Connectez-vous pour gérer vos offres et candidatures."
      eyebrow="Espace Entreprise"
      panelTitle="Recrutez des talents prêts à la mobilité."
      panelDescription="Publiez vos offres, filtrez les candidatures et centralisez les documents de votre entreprise depuis un tableau de bord dédié."
      accent="navy"
      icon={Briefcase}
      expectedRoles={["Recruiter"]}
      footer="recruiter"
      features={[
        {
          icon: Briefcase,
          title: "Offres d'emploi",
          description: "Diffusez vos postes auprès de candidats qualifiés.",
        },
        {
          icon: Users,
          title: "Candidatures reçues",
          description: "Triez, contactez et planifiez vos entretiens.",
        },
        {
          icon: Building2,
          title: "Profil entreprise",
          description: "Centralisez vos pièces et informations légales.",
        },
      ]}
    />
  );
}

export function TrainerLoginPage() {
  return (
    <RoleLoginPage
      roleLabel="Formateur"
      title="Espace Formateur"
      subtitle="Connectez-vous pour gérer vos cours et vos apprenants."
      eyebrow="Espace Formateur"
      panelTitle="Transmettez, suivez, certifiez."
      panelDescription="Gérez vos cours d'italien, vos leçons vidéo et vos examens, et suivez la progression de chaque apprenant."
      accent="gold"
      icon={GraduationCap}
      expectedRoles={["Trainer"]}
      features={[
        {
          icon: GraduationCap,
          title: "Cours & leçons",
          description: "Organisez vos modules pédagogiques en italien.",
        },
        {
          icon: Video,
          title: "Contenus vidéo",
          description: "Publiez des leçons et suivez leur visionnage.",
        },
        {
          icon: ClipboardList,
          title: "Examens & résultats",
          description: "Planifiez vos évaluations et consultez les notes.",
        },
      ]}
    />
  );
}

export function AgentLoginPage() {
  return (
    <RoleLoginPage
      roleLabel="Agent"
      title="Espace Agent"
      subtitle="Agents de recrutement et d'immigration COORIZON."
      eyebrow="Espace Agent"
      panelTitle="Vos dossiers d'immigration, centralisés."
      panelDescription="Suivez les dossiers assignés, organisez vos tâches et faites avancer chaque étape jusqu'à l'arrivée en Italie."
      accent="navy"
      icon={Plane}
      expectedRoles={["RecruitmentAgent", "ImmigrationAgent"]}
      features={[
        {
          icon: Plane,
          title: "Dossiers assignés",
          description: "Consultez le statut de chaque candidat suivi.",
        },
        {
          icon: ClipboardList,
          title: "Tâches",
          description: "Organisez votre travail dossier par dossier.",
        },
        {
          icon: ShieldCheck,
          title: "Conformité",
          description: "Vérifiez documents et validations avant transmission.",
        },
      ]}
    />
  );
}

export function AdminLoginPage() {
  return (
    <RoleLoginPage
      roleLabel="SuperAdmin"
      title="Espace SuperAdmin"
      subtitle="Console d'administration — accès strictement réservé."
      eyebrow="Accès réservé"
      panelTitle="Console d'administration COORIZON."
      panelDescription="Espace strictement réservé aux administrateurs de la plateforme. Toute connexion est enregistrée et auditée."
      accent="navy"
      icon={ShieldCheck}
      expectedRoles={["Admin", "SuperAdmin"]}
      notice="Espace surveillé : chaque tentative de connexion est enregistrée."
      footnote="Identifiants perdus ? Contactez l'administrateur principal de COORIZON."
      features={[
        {
          icon: ShieldCheck,
          title: "Sécurité renforcée",
          description: "Accès limité aux rôles Admin et SuperAdmin uniquement.",
        },
        {
          icon: Activity,
          title: "Supervision complète",
          description: "Utilisateurs, entreprises, offres, paiements et contenus.",
        },
        {
          icon: Lock,
          title: "Journal d'audit",
          description: "Chaque action sensible est historisée et traçable.",
        },
      ]}
    />
  );
}

// ─── Generic Role Login (shared logic) ──────────────────────────────────────

function RoleLoginPage({
  roleLabel,
  title,
  subtitle,
  eyebrow,
  panelTitle,
  panelDescription,
  features,
  accent,
  icon: Icon,
  expectedRoles,
  footer = "none",
  notice,
  footnote,
}: {
  roleLabel: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  panelTitle: string;
  panelDescription: string;
  features: SplitFeature[];
  accent: "green" | "gold" | "navy";
  icon: React.ElementType;
  expectedRoles: string[];
  footer?: "candidate" | "recruiter" | "none";
  notice?: string;
  footnote?: string;
}) {
  const { navigate } = useSiteRouter();
  const { toast } = useToast();
  const { refresh, signOut } = useSession();
  const disabledRoles = useDisabledRoles();
  const profileDisabled = isProfileDisabled(disabledRoles, expectedRoles);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const accentIcon: Record<string, string> = {
    green: "bg-brand/10 text-brand",
    gold: "bg-brand-green/10 text-brand-green",
    navy: "bg-navy/10 text-navy",
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileDisabled) return;
    setError(null);
    if (!email || !password) {
      setError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!res || res.error) {
        const msg = res?.error || "Identifiants incorrects.";
        let friendly = msg;
        if (msg.startsWith("ROLE_DISABLED:")) {
          friendly = msg.slice("ROLE_DISABLED:".length);
        } else if (msg.includes("Pending")) {
          friendly = "Votre compte est en attente de validation par l'administration.";
        } else if (msg.includes("Suspended") || msg.includes("désactivé")) {
          friendly = msg;
        } else if (msg === "CredentialsSignin" || msg.includes("Identifiants")) {
          // NextAuth masks the authorize() message: check whether the profile
          // has been disabled platform-wide before showing a generic error.
          try {
            const check = await fetch("/api/auth/check-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await check.json();
            if (data?.roleDisabled) {
              friendly = `Les connexions pour le profil « ${data.roleLabel} » sont actuellement désactivées par l'administration.`;
            } else {
              friendly = "Email ou mot de passe incorrect.";
            }
          } catch {
            friendly = "Email ou mot de passe incorrect.";
          }
        }
        setError(friendly);
        setLoading(false);
        return;
      }

      // Dedicated space: verify the account role matches this login page.
      try {
        const me = await fetch("/api/auth/me", { credentials: "include" });
        const data = me.ok ? await me.json() : null;
        const actualRole: string | undefined = data?.user?.role;
        if (expectedRoles.length > 0 && (!actualRole || !expectedRoles.includes(actualRole))) {
          await signOut();
          setError(
            `Ce compte n'a pas accès à l'espace « ${title} ». Utilisez l'espace de connexion correspondant à votre profil (${roleLabel}).`
          );
          setLoading(false);
          return;
        }
      } catch {
        // Verification service unavailable: continue to the dashboard.
      }

      await refresh();
      toast({ title: "Connexion réussie", description: `Bienvenue sur votre espace ${roleLabel}.` });
      navigate("dashboard");
    } catch {
      setError("Une erreur est survenue lors de la connexion. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      accent={accent}
      eyebrow={eyebrow}
      panelTitle={panelTitle}
      panelDescription={panelDescription}
      features={features}
      footnote={footnote}
    >
      <button
        onClick={() => navigate("login")}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-3 w-3 rotate-180" />
        Tous les espaces de connexion
      </button>

      <div className="text-center">
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${accentIcon[accent]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Disabled profile: the login form is not displayed at all. */}
      {profileDisabled ? (
        <div className="mt-6 space-y-4">
          <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            <Ban className="h-4 w-4" />
            <AlertDescription>
              Les connexions pour le profil « {roleLabel} » sont actuellement désactivées par
              l'administration COORIZON. Réessayez plus tard ou contactez le support si vous
              pensez qu'il s'agit d'une erreur.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("login")}
          >
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Retour aux espaces de connexion
          </Button>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <button type="button" className="text-xs font-medium text-brand hover:underline">
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
            Se souvenir de moi
          </Label>
        </div>
        <Button
          type="submit"
          className="w-full bg-brand hover:bg-brand/90"
          disabled={loading}
        >
          {loading ? "Connexion…" : "Se connecter"}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>
      )}

      {notice && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs text-foreground/80">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-green" />
          {notice}
        </div>
      )}

      {footer === "candidate" && (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-muted-foreground">
          Pas encore de compte ?{" "}
          <button
            onClick={() => navigate("register-candidate")}
            className="font-semibold text-brand hover:underline"
          >
            Inscrivez-vous
          </button>
        </div>
      )}
      {footer === "recruiter" && (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-muted-foreground">
          Entreprise pas encore inscrite ?{" "}
          <button
            onClick={() => navigate("register-recruiter")}
            className="font-semibold text-brand hover:underline"
          >
            Inscrivez votre entreprise
          </button>
        </div>
      )}
    </AuthSplitLayout>
  );
}
