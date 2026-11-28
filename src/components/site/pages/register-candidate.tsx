"use client";

import * as React from "react";
import { useSession } from "@/lib/auth/session-provider";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Home,
  Plane,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";
import { AuthLayout } from "./auth-shared";
import {
  SENEGAL_REGIONS,
  ITALIAN_REGIONS,
  PROFESSION_GROUPS,
  EDUCATION_LEVEL_OPTIONS,
} from "@/lib/senegal-data";

const countries = ["Sénégal", "Côte d'Ivoire", "Mali", "Guinée", "Burkina Faso", "Bénin", "Togo", "Cameroun", "Autre"];
const italianLevels = ["Aucun", "A1", "A2", "B1", "B2", "C1", "C2"];

export function RegisterCandidatePage() {
  const { navigate } = useSiteRouter();
  const { refresh } = useSession();
  const { toast } = useToast();
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState(false);

  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    nationality: "Sénégal",
    residence: "Sénégal",
    city: "",
    profession: "",
    educationLevel: "",
    italianLevel: "Aucun",
    department: "",
    preferredItalianRegion: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError("Veuillez renseigner votre prénom, nom, email et mot de passe.");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!form.profession || !form.educationLevel || !form.department) {
      setError("Veuillez choisir votre profession, votre niveau d'études et votre département.");
      return;
    }
    if (!consent) {
      setError("Veuillez accepter les conditions d'utilisation.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          nationality: form.nationality,
          residenceCountry: form.residence,
          city: form.city || undefined,
          profession: form.profession,
          educationLevel: form.educationLevel,
          department: form.department,
          preferredItalianRegion: form.preferredItalianRegion || undefined,
          italianLevel: form.italianLevel === "Aucun" ? undefined : form.italianLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "L'inscription a échoué. Réessayez.");
        setLoading(false);
        return;
      }

      // Connexion automatique avec les identifiants saisis, puis redirection
      // directe vers l'espace candidat.
      const signInRes = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });
      if (!signInRes || signInRes.error) {
        toast({
          title: "Inscription réussie !",
          description: "Votre compte est créé. Connectez-vous avec votre email et mot de passe.",
        });
        navigate("login-candidate");
        return;
      }
      await refresh();
      toast({
        title: "Inscription réussie !",
        description: "Bienvenue sur COORIZON — votre espace candidat est prêt.",
      });
      navigate("dashboard");
    } catch {
      setError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Inscription candidat"
      subtitle="Créez votre compte, choisissez votre département et accédez directement à votre espace."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ─── Section 1 : Compte ─────────────────────────────────────── */}
        <section className="space-y-4">
          <SectionTitle icon={User} title="Compte" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prénom" icon={User}>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Aïssatou" />
            </Field>
            <Field label="Nom" icon={User}>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Diallo" />
            </Field>
          </div>
          <Field label="Adresse email" icon={Mail}>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="vous@exemple.com" />
          </Field>
          <Field label="Téléphone (avec indicatif)" icon={Phone}>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+221 77 000 00 00" />
          </Field>
          <Field label="Mot de passe" icon={Lock}>
            <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 8 caractères" />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>
        </section>

        {/* ─── Section 2 : Profil professionnel ───────────────────────── */}
        <section className="space-y-4">
          <SectionTitle icon={Briefcase} title="Profil professionnel" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Profession" icon={Briefcase}>
              <Select value={form.profession} onValueChange={(v) => set("profession", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir une profession…" /></SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-3rem)]">
                  {PROFESSION_GROUPS.map((g) => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{g.group}</SelectLabel>
                      {g.professions.map((p) => (
                        <SelectItem key={p} value={p} className="whitespace-normal text-left">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Niveau d'études" icon={GraduationCap}>
              <Select value={form.educationLevel} onValueChange={(v) => set("educationLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-3rem)]">
                  {EDUCATION_LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l} className="whitespace-normal text-left">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Niveau d'italien" icon={Globe}>
            <Select value={form.italianLevel} onValueChange={(v) => set("italianLevel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{italianLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </section>

        {/* ─── Section 3 : Localisation ───────────────────────────────── */}
        <section className="space-y-4">
          <SectionTitle icon={MapPin} title="Localisation" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nationalité" icon={Globe}>
              <Select value={form.nationality} onValueChange={(v) => set("nationality", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Pays de résidence" icon={MapPin}>
              <Select value={form.residence} onValueChange={(v) => set("residence", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Ville" icon={MapPin}>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Dakar" />
          </Field>
        </section>

        {/* ─── Section 4 : Département & région italienne ─────────────── */}
        <section className="space-y-4">
          <SectionTitle icon={Home} title="Département & destination" />
          <Field label="Département (centre de formation)" icon={Home}>
            <Select value={form.department} onValueChange={(v) => set("department", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir votre département…" /></SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-3rem)]">
                {SENEGAL_REGIONS.map((r) => (
                  <SelectGroup key={r.region}>
                    <SelectLabel>Région de {r.region}</SelectLabel>
                    {r.departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Dans quelle région italienne souhaitez-vous travailler ?" icon={Plane}>
            <Select value={form.preferredItalianRegion} onValueChange={(v) => set("preferredItalianRegion", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir une région…" /></SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-3rem)]">
                {ITALIAN_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        {/* ─── Consentement + validation ──────────────────────────────── */}
        <div className="flex items-start gap-2">
          <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <Label htmlFor="consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
            J'accepte les conditions d'utilisation et la politique de confidentialité de COORIZON.
          </Label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création de votre compte…
            </>
          ) : (
            <>
              Créer mon compte et accéder à mon espace
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </>
          )}
        </Button>

        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>
              Votre email et votre mot de passe vous serviront à vous connecter à votre espace.
              Vous pourrez compléter votre CV, vos diplômes et vos documents directement dans votre
              tableau de bord après l'inscription.
            </span>
          </CardContent>
        </Card>
      </form>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Déjà inscrit ?{" "}
        <button onClick={() => navigate("login")} className="font-semibold text-brand hover:underline">
          Connectez-vous
        </button>
      </div>
    </AuthLayout>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-navy">{title}</h2>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="[&_input]:pl-9 [&_[role=combobox]]:pl-9">{children}</div>
      </div>
    </div>
  );
}
