"use client";

import * as React from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  ArrowRight,
  MessageSquare,
  Building2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";

const subjects = [
  "Je suis candidat",
  "Je suis recruteur",
  "Partenariat",
  "Formation",
  "Support technique",
  "Autre",
];

const contactInfo = [
  { icon: MapPin, label: "Adresse", value: "Plateau, Dakar — Sénégal" },
  { icon: Phone, label: "Téléphone", value: "+221 33 800 00 00" },
  { icon: Mail, label: "Email", value: "contact@coorizon.com" },
  { icon: Clock, label: "Horaires", value: "Lun–Ven, 9h–18h" },
];

interface ContactFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const emptyForm: ContactFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export function ContactPage() {
  const { navigate } = useSiteRouter();
  const { toast } = useToast();

  const [form, setForm] = React.useState<ContactFormState>(emptyForm);
  const [consent, setConsent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (k: keyof ContactFormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email.trim() || !form.message.trim() || !consent) {
      setError(
        "Veuillez renseigner votre email, votre message et accepter la politique de confidentialité."
      );
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (!emailOk) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }

    setLoading(true);
    // LOT 1 — UI only. Real persistence + email routing in a later lot.
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Message envoyé",
        description: "Notre équipe vous répondra sous 24h ouvrées.",
      });
      setForm(emptyForm);
      setConsent(false);
    }, 700);
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Parlons de votre projet"
        description="Une question sur les offres, la formation en italien ou l'accompagnement à l'immigration ? L'équipe COORIZON vous répond sous 24h ouvrées."
      />

      <SectionShell>
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Colonne gauche — coordonnées */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Coordonnées
                </div>
                <ul className="mt-4 space-y-4">
                  {contactInfo.map((c) => (
                    <li key={c.label} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <c.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {c.label}
                        </div>
                        <div className="mt-0.5 text-sm font-medium text-navy">{c.value}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Note 24h */}
            <Card className="border-brand-green/20 bg-brand-green/5">
              <CardContent className="flex items-start gap-3 p-5 sm:p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green/15 text-brand-green">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">Réponse sous 24h ouvrées</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Nous traitons toutes les demandes dans l'ordre d'arrivée. Pour un suivi optimal,
                    indiquez votre profil (candidat, recruteur, partenaire) dans votre message.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Accès rapide */}
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Accès rapide
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <QuickLink
                    icon={User}
                    label="Inscription candidat"
                    onClick={() => navigate("register-candidate")}
                  />
                  <QuickLink
                    icon={Building2}
                    label="Espace recruteur"
                    onClick={() => navigate("register-recruiter")}
                  />
                  <QuickLink
                    icon={MessageSquare}
                    label="Consulter la FAQ"
                    onClick={() => navigate("faq")}
                  />
                  <QuickLink
                    icon={ArrowRight}
                    label="À propos de COORIZON"
                    onClick={() => navigate("about")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite — formulaire */}
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Envoyez-nous un message</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tous les champs marqués d'un{" "}
                <span className="font-semibold text-italian-red">*</span> sont obligatoires.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      placeholder="Aïssatou"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      placeholder="Diallo"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    Adresse email <span className="text-italian-red">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    aria-required="true"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+221 77 000 00 00"
                    autoComplete="tel"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject">Sujet</Label>
                  <Select value={form.subject} onValueChange={(v) => set("subject", v)}>
                    <SelectTrigger id="subject" className="w-full">
                      <SelectValue placeholder="Choisir un sujet…" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">
                    Message <span className="text-italian-red">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="Décrivez votre demande en quelques lignes…"
                    className="min-h-32"
                    aria-required="true"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    className="mt-0.5"
                    aria-required="true"
                  />
                  <Label
                    htmlFor="consent"
                    className="text-xs font-normal leading-relaxed text-muted-foreground"
                  >
                    J'accepte que mes données soient utilisées pour traiter ma demande, conformément
                    à la politique de confidentialité de COORIZON.{" "}
                    <span className="text-italian-red">*</span>
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand/90"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      Envoyer le message
                      <Send className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Ce formulaire est démonstratif : les données ne sont pas encore enregistrées
                  (persistance prévue dans un lot ultérieur).
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </SectionShell>
    </>
  );
}

function QuickLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-navy transition-colors hover:border-brand/40 hover:bg-accent"
    >
      <Icon className="h-4 w-4 shrink-0 text-brand" />
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
