"use client";

import * as React from "react";
import { Mail, Lock, ArrowRight, User, Eye, EyeOff, Briefcase, GraduationCap, ShieldCheck, Plane, Users } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth/session-provider";
import { Logo } from "../logo";

// ─── Auth Layout (shared) ───────────────────────────────────────────────────

export function AuthLayout({ children, accent = "green" }: { children: React.ReactNode; accent?: "green" | "gold" | "navy" }) {
  const accentColors = {
    green: "from-brand to-brand-green",
    gold: "from-brand-green to-gold",
    navy: "from-navy to-brand",
  };
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-radial" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <Card className={`border-0 shadow-2xl`}>
          <div className={`h-1.5 rounded-t-xl bg-gradient-to-r ${accentColors[accent]}`} />
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          En continuant, vous acceptez les conditions d'utilisation et la politique de
          confidentialité de COORIZON.
        </p>
      </div>
    </div>
  );
}

// ─── Multi-role Login Page (default) ────────────────────────────────────────

export function LoginPage() {
  const { navigate } = useSiteRouter();

  const roles = [
    {
      id: "candidate",
      title: "Candidat",
      description: "Accédez aux offres, formations et votre dossier d'immigration.",
      icon: User,
      accent: "green",
      route: "login-candidate" as const,
    },
    {
      id: "recruiter",
      title: "Recruteur",
      description: "Gérez vos offres d'emploi et candidatures reçues.",
      icon: Briefcase,
      accent: "navy",
      route: "login-recruiter" as const,
    },
    {
      id: "trainer",
      title: "Formateur",
      description: "Gérez vos cours, leçons et apprenants en italien.",
      icon: GraduationCap,
      accent: "gold",
      route: "login-candidate" as const,
    },
    {
      id: "agent",
      title: "Agent",
      description: "Suivez les dossiers d'immigration assignés.",
      icon: Plane,
      accent: "navy",
      route: "login-candidate" as const,
    },
  ];

  const accentBg: Record<string, string> = {
    green: "bg-brand/10 text-brand",
    gold: "bg-brand-green/10 text-brand-green",
    navy: "bg-navy/10 text-navy",
  };

  return (
    <AuthLayout>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">Connexion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sélectionnez votre espace pour vous connecter à COORIZON.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => navigate(role.route)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-brand/40 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentBg[role.accent]}`}>
              <role.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-navy">{role.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{role.description}</div>
            </div>
            <span className="mt-1 inline-flex items-center text-xs font-medium text-brand">
              Se connecter
              <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-muted-foreground">
        Pas encore de compte ?{" "}
        <button onClick={() => navigate("register-candidate")} className="font-semibold text-brand hover:underline">
          Inscrivez-vous comme candidat
        </button>{" "}
        ou{" "}
        <button onClick={() => navigate("register-recruiter")} className="font-semibold text-brand hover:underline">
          comme recruteur
        </button>
      </div>
    </AuthLayout>
  );
}

// ─── Candidate Login Page ───────────────────────────────────────────────────

export function CandidateLoginPage() {
  return <RoleLoginPage role="Candidate" title="Espace Candidat" subtitle="Connectez-vous pour accéder aux offres et formations." accent="green" icon={User} />;
}

// ─── Recruiter Login Page ───────────────────────────────────────────────────

export function RecruiterLoginPage() {
  return <RoleLoginPage role="Recruiter" title="Espace Recruteur" subtitle="Connectez-vous pour gérer vos offres et candidatures." accent="navy" icon={Briefcase} />;
}

// ─── Generic Role Login (shared logic) ──────────────────────────────────────

function RoleLoginPage({
  role,
  title,
  subtitle,
  accent,
  icon: Icon,
}: {
  role: string;
  title: string;
  subtitle: string;
  accent: "green" | "gold" | "navy";
  icon: React.ElementType;
}) {
  const { navigate } = useSiteRouter();
  const { toast } = useToast();
  const { refresh } = useSession();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        if (msg.includes("Pending")) {
          friendly = "Votre compte est en attente de validation par l'administration.";
        } else if (msg.includes("Suspended") || msg.includes("désactivé")) {
          friendly = msg;
        } else if (msg === "CredentialsSignin" || msg.includes("Identifiants")) {
          friendly = "Email ou mot de passe incorrect.";
        }
        setError(friendly);
        setLoading(false);
        return;
      }
      await refresh();
      toast({ title: "Connexion réussie", description: `Bienvenue sur ${title}.` });
      navigate("dashboard");
    } catch {
      setError("Une erreur est survenue lors de la connexion. Réessayez.");
      setLoading(false);
    }
  };

  const accentIcon: Record<string, string> = {
    green: "bg-brand/10 text-brand",
    gold: "bg-brand-green/10 text-brand-green",
    navy: "bg-navy/10 text-navy",
  };

  return (
    <AuthLayout accent={accent}>
      <button
        onClick={() => navigate("login")}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-3 w-3 rotate-180" />
        Retour au choix du rôle
      </button>

      <div className="text-center">
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${accentIcon[accent]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>

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
        <Button type="submit" className="w-full bg-brand hover:bg-brand/90" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      {role === "Candidate" && (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-muted-foreground">
          Pas encore de compte ?{" "}
          <button onClick={() => navigate("register-candidate")} className="font-semibold text-brand hover:underline">
            Inscrivez-vous
          </button>
        </div>
      )}
      {role === "Recruiter" && (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-muted-foreground">
          Entreprise pas encore inscrite ?{" "}
          <button onClick={() => navigate("register-recruiter")} className="font-semibold text-brand hover:underline">
            Inscrivez votre entreprise
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
