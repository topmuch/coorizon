"use client";

import * as React from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  User,
  Building2,
  FileText,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
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

const italianRegions = [
  "Lombardie", "Vénétie", "Émilie-Romagne", "Toscane", "Latium", "Ligurie", "Piémont", "Campanie", "Sicile", "Autre",
];

export function RegisterRecruiterPage() {
  const { navigate } = useSiteRouter();
  const { toast } = useToast();
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [consent, setConsent] = React.useState(false);

  const [form, setForm] = React.useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    company: "", vat: "", tax: "", address: "", city: "", region: "", website: "", sector: "",
    responsibleName: "", responsiblePhone: "", responsibleEmail: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const required = ["firstName", "lastName", "email", "password", "company", "vat", "city", "region", "sector"];
    for (const k of required) {
      if (!form[k as keyof typeof form]) {
        setError("Veuillez renseigner tous les champs obligatoires (marqués *).");
        return;
      }
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!consent) {
      setError("Veuillez accepter les conditions et confirmer la véracité des informations.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          jobTitle: form.responsibleName || undefined,
          company: form.company,
          vat: form.vat,
          tax: form.tax || undefined,
          city: form.city,
          region: form.region,
          sector: form.sector,
          address: form.address || undefined,
          website: form.website || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "L'inscription a échoué. Réessayez.");
        setLoading(false);
        return;
      }
      setLoading(false);
      setDone(true);
      toast({
        title: "Demande d'inscription envoyée",
        description: "Votre compte entreprise sera validé par l'administration COORIZON.",
      });
    } catch {
      setError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Demande envoyée" subtitle="Votre compte entreprise est en attente de validation.">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-navy">Merci pour votre inscription</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre demande a bien été enregistrée, {form.firstName}. Conformément à nos règles, chaque compte
            entreprise est validé par notre administration avant toute publication d'offre. Vous recevrez un
            email dès validation.
          </p>
          <Card className="mt-5 w-full border-brand/20 bg-brand/5">
            <CardContent className="flex items-start gap-3 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <p className="text-xs text-muted-foreground">
                Pourquoi la validation ? Elle garantit la fiabilité des entreprises sur COORIZON et protège
                les candidats contre les offres frauduleuses.
              </p>
            </CardContent>
          </Card>
          <Button className="mt-6 bg-brand hover:bg-brand/90" onClick={() => navigate("home")}>
            Retour à l'accueil
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Inscription recruteur"
      subtitle="Publiez vos offres et recrutez des talents africains qualifiés."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
            <User className="h-4 w-4 text-brand" /> Compte responsable
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Marco" />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Rossi" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="marco@entreprise.it" />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+39 …" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Mot de passe *</Label>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 8 caractères" />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
            <Building2 className="h-4 w-4 text-brand" /> Entreprise
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Raison sociale *</Label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Ristorante Bella Toscana S.r.l." />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro d'immatriculation *</Label>
              <Input value={form.vat} onChange={(e) => set("vat", e.target.value)} placeholder="Partita IVA" />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro fiscal</Label>
              <Input value={form.tax} onChange={(e) => set("tax", e.target.value)} placeholder="Codice fiscale" />
            </div>
            <div className="space-y-1.5">
              <Label>Site web</Label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="www.entreprise.it" />
            </div>
            <div className="space-y-1.5">
              <Label>Ville *</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Florence" />
            </div>
            <div className="space-y-1.5">
              <Label>Région italienne *</Label>
              <Select value={form.region} onValueChange={(v) => set("region", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{italianRegions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Via Roma, 12" />
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Secteur d'activité *</Label>
            <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
            <FileText className="h-4 w-4 text-brand" /> Documents justificatifs
          </h3>
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-6 text-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">Téléversez vos justificatifs</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Extrait de registre, Partita IVA, pièce d'identité du responsable. PDF/PNG/JPG, max 10 Mo.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3">
                  Choisir des fichiers
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Le téléversement réel des documents sera actif dans le LOT 2. Les fichiers seront privés et protégés.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox id="consent2" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <Label htmlFor="consent2" className="text-xs font-normal leading-relaxed text-muted-foreground">
            Je confirme que les informations fournies sont exactes et j'accepte les conditions d'utilisation
            et la politique de confidentialité de COORIZON.
          </Label>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand/90">
          {loading ? "Envoi de la demande…" : "Envoyer la demande d'inscription"}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          Déjà inscrit ?{" "}
          <button type="button" onClick={() => navigate("login")} className="font-semibold text-brand hover:underline">
            Connectez-vous
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
