"use client";

import * as React from "react";
import { Mail, Lock, ArrowRight, User, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth/session-provider";

export function LoginPage() {
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
        // NextAuth surfaces authorize() errors via the `error` query string.
        const msg = res?.error || "Identifiants incorrects.";
        // Map the error code to a friendly message.
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
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur votre espace COORIZON.",
      });
      navigate("dashboard");
    } catch {
      setError("Une erreur est survenue lors de la connexion. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Connexion à votre espace"
      subtitle="Accédez à votre tableau de bord COORIZON, quel que soit votre rôle."
    >
      <form onSubmit={onSubmit} className="space-y-4">
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

      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-3 text-xs text-muted-foreground">
        Pas encore de compte ?{" "}
        <button onClick={() => navigate("register-candidate")} className="font-semibold text-brand hover:underline">
          Inscrivez-vous comme candidat
        </button>{" "}
        ou{" "}
        <button onClick={() => navigate("register-recruiter")} className="font-semibold text-brand hover:underline">
          comme recruteur
        </button>
        .
      </div>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-radial" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <Card className="border-border shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <User className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-navy">{title}</h1>
            <CardDescription>{subtitle}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          En continuant, vous acceptez les conditions d'utilisation et la politique de confidentialité de COORIZON.
        </p>
      </div>
    </div>
  );
}
