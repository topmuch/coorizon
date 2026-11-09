"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Building2,
  Users,
  FileCheck,
  Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionHeading, SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";
import { journeySteps } from "@/lib/site-data";

interface RecruiterStep {
  title: string;
  description: string;
}

const recruiterSteps: RecruiterStep[] = [
  {
    title: "Inscription & validation admin",
    description:
      "Créez le compte de votre entreprise. L'administration COORIZON valide votre identité avant publication.",
  },
  {
    title: "Profil entreprise",
    description:
      "Complétez la fiche de votre entreprise : secteur, taille, localisation et présentation.",
  },
  {
    title: "Publication d'offres",
    description:
      "Publiez vos offres en précisant poste, contrat, niveau d'italien requis et rémunération.",
  },
  {
    title: "Réception des candidatures",
    description:
      "Recevez les candidatures des profils formés et consultez leurs CV et attestations internes.",
  },
  {
    title: "Présélection & entretien",
    description:
      "Présélectionnez les profils pertinents et programmez les entretiens directement via la plateforme.",
  },
  {
    title: "Recrutement & accompagnement",
    description:
      "Recrutez et bénéficiez d'un accompagnement pour le contrat et les démarches d'immigration.",
  },
];

interface TrainerFeature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const trainerFeatures: TrainerFeature[] = [
  {
    icon: GraduationCap,
    title: "Création de leçons",
    description:
      "Concevez des leçons structurées par niveau (A1 à C2) avec un éditeur de contenu pédagogique.",
  },
  {
    icon: FileCheck,
    title: "Vidéos & exercices",
    description:
      "Ajoutez des vidéos, des exercices interactifs et des évaluations pour chaque module de cours.",
  },
  {
    icon: CheckCircle2,
    title: "Correction & examens",
    description:
      "Corrigez les copies, animez les examens en ligne et délivrez les attestations internes.",
  },
  {
    icon: Users,
    title: "Suivi de la progression",
    description:
      "Suivez la progression de vos apprenants, identifiez les difficultés et accompagnez-les.",
  },
];

export function HowItWorksPage() {
  const { navigate } = useSiteRouter();

  return (
    <>
      <PageHeader
        eyebrow="Parcours"
        title="Comment ça marche"
        description="Découvrez le parcours structuré proposé par COORIZON : de l'inscription du candidat à son arrivée en Italie, en passant par la formation, la candidature et l'accompagnement administratif."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("register-candidate")}
            className="bg-white text-navy hover:bg-slate-100"
          >
            Démarrer mon parcours
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("jobs")}
            className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Voir les offres
          </Button>
        </div>
      </PageHeader>

      {/* Le parcours candidat */}
      <SectionShell>
        <SectionHeading
          eyebrow="Candidats"
          title="Le parcours candidat"
          description="Un parcours en 6 étapes, conçu pour structurer votre projet professionnel et maximiser vos chances de réussite en Italie."
        />
        <div className="mx-auto mt-12 max-w-3xl">
          <ol className="relative space-y-8 border-l-2 border-brand/20 pl-8 sm:pl-10">
            {journeySteps.map((step) => (
              <li key={step.step} className="relative">
                <span
                  className="absolute -left-[2.45rem] flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white ring-4 ring-white sm:-left-[2.95rem]"
                  aria-hidden="true"
                >
                  {step.step}
                </span>
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                          Étape {step.step}
                        </span>
                        <h3 className="font-semibold text-navy">{step.title}</h3>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </SectionShell>

      {/* Pour les recruteurs */}
      <SectionShell className="bg-surface">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Recruteurs"
              title="Pour les recruteurs"
              description="Un espace dédié aux entreprises italiennes pour recruter des talents préformés, vérifiés et accompagnés dans leur mobilité."
              className="max-w-xl"
            />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              De l'inscription de votre entreprise à la signature du contrat, COORIZON structure votre
              processus de recrutement international pour gagner en efficacité et en sérénité.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => navigate("register-recruiter")}>
                Inscrire mon entreprise
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("partners")}>
                Voir les entreprises partenaires
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-navy">Le parcours recruteur</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {recruiterSteps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-brand">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h4 className="text-sm font-semibold text-navy">{step.title}</h4>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </SectionShell>

      {/* Pour les formateurs */}
      <SectionShell>
        <SectionHeading
          eyebrow="Formateurs"
          title="Pour les formateurs"
          description="Un espace dédié aux enseignants d'italien pour créer, animer et suivre des parcours de formation de niveau A1 à C2."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trainerFeatures.map((feature) => (
            <Card key={feature.title} className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-navy">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={() => navigate("training")}>
            Découvrir les formations
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </SectionShell>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-brand" aria-label="Démarrer votre parcours">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div className="text-white">
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Lancez-vous avec COORIZON
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-100 text-balance">
                Que vous soyez candidat, recruteur ou formateur, notre plateforme vous accompagne à
                chaque étape de votre projet de mobilité professionnelle vers l'Italie.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate("register-candidate")}
                  className="bg-white text-navy hover:bg-slate-100"
                >
                  Créer un compte candidat
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("register-recruiter")}
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  Espace recruteur
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CtaFeature icon={Briefcase} title="Candidats" desc="Profil, formation, offres, visa." />
              <CtaFeature icon={Building2} title="Recruteurs" desc="Entreprises vérifiées et profils qualifiés." />
              <CtaFeature icon={GraduationCap} title="Formateurs" desc="Cours, examens et suivi des apprenants." />
              <CtaFeature icon={Plane} title="Accompagnement" desc="Un agent dédié jusqu'au départ en Italie." />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CtaFeature({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-slate-100">{desc}</div>
      </div>
    </div>
  );
}
