"use client";

import * as React from "react";
import {
  User,
  Briefcase,
  GraduationCap,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

/**
 * CandidateProfile (LOT 3 — Task 3-b)
 *
 * Full editable candidate profile form. Loads existing data from
 * GET /api/candidate/profile on mount, and saves changes through
 * PUT /api/candidate/profile. Renders inside the CandidateShell.
 */

const COUNTRIES = [
  "Sénégal",
  "Côte d'Ivoire",
  "Mali",
  "Guinée",
  "Burkina Faso",
  "Bénin",
  "Togo",
  "Cameroun",
  "Autre",
];

const SECTORS = [
  "Hôtellerie & Restauration",
  "Agriculture & Agroalimentaire",
  "BTP & Construction",
  "Soins & Santé",
  "Industrie & Mécanique",
  "Logistique & Transport",
  "Tech & Numérique",
  "Commerce & Services",
];

const EDUCATION_LEVELS = [
  "Sans diplôme",
  "CAP/BEP",
  "Bac",
  "Bac+2",
  "Bac+3",
  "Bac+5",
  "Autre",
];

const ITALIAN_LEVELS = ["Aucun", "A1", "A2", "B1", "B2", "C1", "C2"];

const AVAILABILITIES = [
  "Immédiate",
  "Sous 1 mois",
  "Sous 2 mois",
  "Sous 3 mois",
  "Non disponible",
];

const MOBILITIES = ["Oui", "Non", "Selon l'offre"];

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string;
  residenceCountry: string;
  city: string;
  desiredJob: string;
  sector: string;
  educationLevel: string;
  diplomas: string;
  experiences: string;
  skills: string;
  languages: string;
  italianLevel: string; // "Aucun" | "A1" | ... | "C2"
  availability: string;
  geographicMobility: string;
}

const EMPTY_FORM: ProfileFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  nationality: "",
  residenceCountry: "",
  city: "",
  desiredJob: "",
  sector: "",
  educationLevel: "",
  diplomas: "",
  experiences: "",
  skills: "",
  languages: "",
  italianLevel: "Aucun",
  availability: "",
  geographicMobility: "",
};

interface ProfileResponse {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  profile: {
    nationality: string | null;
    residenceCountry: string | null;
    city: string | null;
    dateOfBirth: string | null;
    photoUrl: string | null;
    desiredJob: string | null;
    sector: string | null;
    educationLevel: string | null;
    diplomas: string | null;
    experiences: string | null;
    skills: string | null;
    languages: string | null;
    italianLevel: string | null;
    availability: string | null;
    geographicMobility: string | null;
    completionPct: number;
  };
}

function mapResponseToForm(data: ProfileResponse): ProfileFormState {
  return {
    firstName: data.user.firstName ?? "",
    lastName: data.user.lastName ?? "",
    email: data.user.email,
    phone: data.user.phone ?? "",
    dateOfBirth: data.profile.dateOfBirth ?? "",
    nationality: data.profile.nationality ?? "",
    residenceCountry: data.profile.residenceCountry ?? "",
    city: data.profile.city ?? "",
    desiredJob: data.profile.desiredJob ?? "",
    sector: data.profile.sector ?? "",
    educationLevel: data.profile.educationLevel ?? "",
    diplomas: data.profile.diplomas ?? "",
    experiences: data.profile.experiences ?? "",
    skills: data.profile.skills ?? "",
    languages: data.profile.languages ?? "",
    italianLevel: data.profile.italianLevel ?? "Aucun",
    availability: data.profile.availability ?? "",
    geographicMobility: data.profile.geographicMobility ?? "",
  };
}

export function CandidateProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [completionPct, setCompletionPct] = React.useState(0);
  const [form, setForm] = React.useState<ProfileFormState>(EMPTY_FORM);

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/profile", { method: "GET" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger votre profil."
        );
      }
      const data = (await res.json()) as ProfileResponse;
      setForm(mapResponseToForm(data));
      setCompletionPct(data.profile.completionPct);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de charger votre profil."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const set = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!form.desiredJob.trim()) {
      setError("Le métier recherché est obligatoire.");
      return;
    }
    if (!form.sector) {
      setError("Le secteur d'activité est obligatoire.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        nationality: form.nationality || null,
        residenceCountry: form.residenceCountry || null,
        city: form.city.trim() || null,
        desiredJob: form.desiredJob.trim(),
        sector: form.sector,
        educationLevel: form.educationLevel || null,
        diplomas: form.diplomas.trim() || null,
        experiences: form.experiences.trim() || null,
        skills: form.skills.trim() || null,
        languages: form.languages.trim() || null,
        italianLevel:
          form.italianLevel === "Aucun" ? null : form.italianLevel,
        availability: form.availability || null,
        geographicMobility: form.geographicMobility || null,
      };

      const res = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "La mise à jour a échoué.");
      }

      const data = (await res.json()) as ProfileResponse;
      setForm(mapResponseToForm(data));
      setCompletionPct(data.profile.completionPct);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès.",
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "La mise à jour a échoué."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Mon profil candidat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez vos informations pour maximiser vos chances auprès des
          recruteurs italiens.
        </p>
      </div>

      {/* Completion progress */}
      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">
              Avancement du profil
            </p>
            <p className="text-xs text-muted-foreground">
              {completionPct}% complété — plus votre profil est complet, plus
              il est visible par les recruteurs.
            </p>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-72">
            <Progress
              value={completionPct}
              className="h-2 flex-1"
              aria-label={`Profil complété à ${completionPct}%`}
            />
            <span className="text-sm font-semibold text-brand tabular-nums">
              {completionPct}%
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Card 1 — Identité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
                <User className="h-4 w-4" />
              </span>
              Identité
            </CardTitle>
            <CardDescription>
              Vos informations personnelles et vos coordonnées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Prénom" htmlFor="firstName" required>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  placeholder="Aïssatou"
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Nom" htmlFor="lastName" required>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Diallo"
                  autoComplete="family-name"
                />
              </Field>
              <Field label="Date de naissance" htmlFor="dateOfBirth">
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </Field>
              <Field label="Nationalité" htmlFor="nationality">
                <Select
                  value={form.nationality || undefined}
                  onValueChange={(v) => set("nationality", v)}
                >
                  <SelectTrigger id="nationality" className="w-full">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pays de résidence" htmlFor="residenceCountry">
                <Select
                  value={form.residenceCountry || undefined}
                  onValueChange={(v) => set("residenceCountry", v)}
                >
                  <SelectTrigger id="residenceCountry" className="w-full">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ville" htmlFor="city">
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Dakar"
                  autoComplete="address-level2"
                />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  disabled
                  autoComplete="email"
                />
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié. Contactez le support si
                  nécessaire.
                </p>
              </Field>
              <Field label="Téléphone" htmlFor="phone">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+221 77 000 00 00"
                  autoComplete="tel"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Profil professionnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
                <Briefcase className="h-4 w-4" />
              </span>
              Profil professionnel
            </CardTitle>
            <CardDescription>
              Votre projet professionnel, vos diplômes et vos expériences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Métier recherché" htmlFor="desiredJob" required>
                <Input
                  id="desiredJob"
                  value={form.desiredJob}
                  onChange={(e) => set("desiredJob", e.target.value)}
                  placeholder="Ex : Aide-soignant"
                />
              </Field>
              <Field label="Secteur d'activité" htmlFor="sector" required>
                <Select
                  value={form.sector || undefined}
                  onValueChange={(v) => set("sector", v)}
                >
                  <SelectTrigger id="sector" className="w-full">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Niveau d'études" htmlFor="educationLevel">
                <Select
                  value={form.educationLevel || undefined}
                  onValueChange={(v) => set("educationLevel", v)}
                >
                  <SelectTrigger id="educationLevel" className="w-full">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />

            <Field
              label="Diplômes"
              htmlFor="diplomas"
              hint="Indiquez vos diplômes, certifications et formations."
            >
              <Textarea
                id="diplomas"
                value={form.diplomas}
                onChange={(e) => set("diplomas", e.target.value)}
                placeholder="Ex : Bac S (2018), Licence en informatique (2021)…"
                rows={3}
              />
            </Field>
            <Field
              label="Expériences professionnelles"
              htmlFor="experiences"
              hint="Décrivez vos postes précédents, durées et missions."
            >
              <Textarea
                id="experiences"
                value={form.experiences}
                onChange={(e) => set("experiences", e.target.value)}
                placeholder="Ex : Serveur (2020-2023) — Restaurant Le Dakarois…"
                rows={4}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Compétences"
                htmlFor="skills"
                hint="Une compétence par ligne ou séparées par des virgules."
              >
                <Textarea
                  id="skills"
                  value={form.skills}
                  onChange={(e) => set("skills", e.target.value)}
                  placeholder="Ex : Service en salle, Caisses, Accueil client…"
                  rows={3}
                />
              </Field>
              <Field
                label="Langues parlées"
                htmlFor="languages"
                hint="Indiquez les langues et votre niveau approximatif."
              >
                <Textarea
                  id="languages"
                  value={form.languages}
                  onChange={(e) => set("languages", e.target.value)}
                  placeholder="Ex : Français (natif), Wolof (natif), Anglais (B1)…"
                  rows={3}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Italien & mobilité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
                <GraduationCap className="h-4 w-4" />
              </span>
              Italien & mobilité
            </CardTitle>
            <CardDescription>
              Votre niveau d'italien et votre disponibilité pour la mobilité.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Niveau d'italien" htmlFor="italianLevel">
                <Select
                  value={form.italianLevel}
                  onValueChange={(v) => set("italianLevel", v)}
                >
                  <SelectTrigger id="italianLevel" className="w-full">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITALIAN_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Disponibilité" htmlFor="availability">
                <Select
                  value={form.availability || undefined}
                  onValueChange={(v) => set("availability", v)}
                >
                  <SelectTrigger id="availability" className="w-full">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITIES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Mobilité géographique"
                htmlFor="geographicMobility"
              >
                <Select
                  value={form.geographicMobility || undefined}
                  onValueChange={(v) => set("geographicMobility", v)}
                >
                  <SelectTrigger id="geographicMobility" className="w-full">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILITIES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-brand hover:bg-brand/90 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-navy">
        {label}
        {required && (
          <span className="ml-0.5 text-italian-red" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
          <Skeleton className="h-24 w-full sm:col-span-2" />
          <Skeleton className="h-24 w-full sm:col-span-2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
      <Skeleton className="h-10 w-full sm:w-40 sm:justify-self-end" />
    </div>
  );
}
