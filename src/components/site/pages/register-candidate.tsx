"use client";

import * as React from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";
import { AuthLayout } from "./auth-shared";
import { cn } from "@/lib/utils";

const steps = ["Compte", "Profil", "Confirmation"] as const;

const countries = ["Sénégal", "Côte d'Ivoire", "Mali", "Guinée", "Burkina Faso", "Bénin", "Togo", "Cameroun", "Autre"];
const sectors = [
  "Hôtellerie & Restauration",
  "Agriculture & Agroalimentaire",
  "BTP & Construction",
  "Soins & Santé",
  "Industrie & Mécanique",
  "Logistique & Transport",
  "Tech & Numérique",
  "Commerce & Services",
];
const italianLevels = ["Aucun", "A1", "A2", "B1", "B2", "C1", "C2"];

export function RegisterCandidatePage() {
  const { navigate } = useSiteRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
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
    job: "",
    sector: "",
    italianLevel: "Aucun",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => {
    setError(null);
    if (step === 0) {
      if (!form.firstName || !form.lastName || !form.email || !form.password) {
        setError("Veuillez renseigner tous les champs du compte.");
        return;
      }
      if (form.password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      if (!consent) {
        setError("Veuillez accepter les conditions d'utilisation.");
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!form.city || !form.job || !form.sector) {
        setError("Veuillez renseigner votre ville, métier recherché et secteur.");
        return;
      }
      setStep(2);
      setLoading(true);
      // LOT 2 — real registration + role assignment (Candidate) here.
      setTimeout(() => {
        setLoading(false);
        toast({
          title: "Inscription enregistrée",
          description: "Votre espace candidat sera activé dans le LOT 2 (authentification & rôles).",
        });
      }, 900);
    }
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <AuthLayout
      title="Inscription candidat"
      subtitle="Créez votre profil et accédez aux offres, formations et accompagnement."
    >
      {/* Stepper */}
      <div className="mb-6 flex items-center justify-between">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  i < step && "bg-brand-green text-white",
                  i === step && "bg-brand text-white",
                  i > step && "bg-surface text-muted-foreground"
                )}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === step ? "font-semibold text-navy" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1 rounded", i < step ? "bg-brand-green" : "bg-border")} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          <div className="flex items-start gap-2">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <Label htmlFor="consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
              J'accepte les conditions d'utilisation et la politique de confidentialité de COORIZON.
            </Label>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          <Field label="Métier recherché" icon={Briefcase}>
            <Input value={form.job} onChange={(e) => set("job", e.target.value)} placeholder="Ex : Aide-soignant" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Secteur d'activité" icon={Briefcase}>
              <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Niveau d'italien" icon={GraduationCap}>
              <Select value={form.italianLevel} onValueChange={(v) => set("italianLevel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{italianLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Card className="border-brand/20 bg-brand/5">
            <CardContent className="p-3 text-xs text-muted-foreground">
              Vous pourrez compléter votre CV, vos diplômes, vos expériences et vos documents une fois votre
              espace candidat activé.
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-navy">Inscription enregistrée !</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Merci {form.firstName}. Votre espace candidat sera pleinement opérationnel après le LOT 2
            (authentification, rôles et base de données). Vous recevrez un email de confirmation.
          </p>
          <Button className="mt-6 bg-brand hover:bg-brand/90" onClick={() => navigate("home")}>
            Retour à l'accueil
          </Button>
        </div>
      )}

      {step < 2 && (
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={back} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          )}
          <Button
            type="button"
            onClick={next}
            disabled={loading}
            className="flex-1 bg-brand hover:bg-brand/90"
          >
            {step === 1 ? (loading ? "Finalisation…" : "Finaliser l'inscription") : "Continuer"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Déjà inscrit ?{" "}
        <button onClick={() => navigate("login")} className="font-semibold text-brand hover:underline">
          Connectez-vous
        </button>
      </div>
    </AuthLayout>
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
