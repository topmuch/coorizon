"use client";

import * as React from "react";
import {
  GraduationCap,
  BookOpen,
  PlayCircle,
  ListChecks,
  Award,
  ShieldCheck,
  Info,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ListVideo,
} from "lucide-react";

import { PageHeader } from "@/components/site/sections/page-header";
import { SectionHeading, SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { courses, type Course } from "@/lib/site-data";
import { cn } from "@/lib/utils";

const CECRL_LEVELS: { code: string; label: string; color: string }[] = [
  { code: "A1", label: "Débutant", color: "bg-brand" },
  { code: "A2", label: "Élémentaire", color: "bg-brand-green" },
  { code: "B1", label: "Intermédiaire", color: "bg-navy" },
  { code: "B2", label: "Avancé", color: "bg-italian-red" },
  { code: "C1", label: "Autonome", color: "bg-brand" },
  { code: "C2", label: "Maîtrise", color: "bg-navy" },
];

interface Feature {
  icon: typeof BookOpen;
  title: string;
  description: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    icon: BookOpen,
    title: "Modules & leçons structurés",
    description:
      "Chaque niveau est découpé en modules progressifs, eux-mêmes divisés en leçons courtes et ciblées, pour avancer pas à pas.",
    color: "bg-brand/10 text-brand",
  },
  {
    icon: PlayCircle,
    title: "Vidéos & documents PDF",
    description:
      "Apprenez avec des vidéos pédagogiques et des supports PDF téléchargeables, conçus par des formateurs natifs.",
    color: "bg-brand-green/10 text-brand-green",
  },
  {
    icon: ListChecks,
    title: "Exercices & quiz chronométrés",
    description:
      "Fixez les acquis avec des exercices interactifs et des quiz chronométrés qui évaluent votre progression à chaque étape.",
    color: "bg-navy/10 text-navy",
  },
  {
    icon: Award,
    title: "Examens & attestations",
    description:
      "À la fin de chaque niveau, passez un examen final et recevez une attestation interne de réussite avec QR code de vérification.",
    color: "bg-italian-red/10 text-italian-red",
  },
];

const ATTESTATION_FIELDS = [
  "Nom et prénom du candidat",
  "Intitulé de la formation suivie",
  "Niveau CECRL validé (A1 → C2)",
  "Note obtenue à l'examen final",
  "Date de délivrance",
  "Numéro unique d'attestation",
  "QR code de vérification",
];

export function TrainingPage() {
  const { navigate } = useSiteRouter();

  return (
    <>
      <PageHeader
        eyebrow="Formation en italien"
        title="Maîtrisez l'italien, niveau par niveau"
        description="Du niveau A1 au niveau C2, COORIZON vous propose des parcours e-learning structurés : vidéos, documents PDF, exercices chronométrés, examens finaux et attestations internes pour accompagner votre projet de mobilité professionnelle en Italie."
      />

      {/* CECRL levels strip */}
      <SectionShell className="py-12 sm:py-14">
        <SectionHeading
          eyebrow="Cadre européen CECRL"
          title="Six niveaux, un parcours progressif"
          description="Nos formations suivent le Cadre européen commun de référence pour les langues (CECRL). Choisissez votre point de départ, du grand débutant à la maîtrise complète."
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CECRL_LEVELS.map((lvl) => (
            <div
              key={lvl.code}
              className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-base font-extrabold text-white",
                  lvl.color
                )}
                aria-hidden="true"
              >
                {lvl.code}
              </span>
              <span className="mt-3 text-sm font-semibold text-navy">{lvl.label}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Courses catalog */}
      <SectionShell className="bg-surface">
        <SectionHeading
          eyebrow="Catalogue des formations"
          title="Choisissez la formation adaptée à votre niveau"
          description="Chaque formation est conçue pour vous amener au niveau supérieur, avec un objectif clair : être prêt à travailler en Italie dans votre secteur."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onEnroll={() => navigate("register-candidate")} />
          ))}
        </div>
      </SectionShell>

      {/* How it works */}
      <SectionShell>
        <SectionHeading
          eyebrow="Comment fonctionne la formation"
          title="Une pédagogie complète, 100 % en ligne"
          description="Un format hybride qui combine vidéos, supports écrits et exercices pratiques pour ancrer durablement chaque compétence linguistique."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg",
                    feature.color
                  )}
                >
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
      </SectionShell>

      {/* Internal attestations info card */}
      <SectionShell className="bg-surface">
        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-navy sm:text-2xl">
                    Attestations internes de réussite
                  </h2>
                  <Badge className="bg-brand/10 text-brand">Interne COORIZON</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  À l'issue de chaque niveau, un examen final évalue vos compétences. En cas de réussite,
                  une attestation est générée automatiquement et inclut les éléments suivants :
                </p>

                <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {ATTESTATION_FIELDS.map((field) => (
                    <li key={field} className="flex items-start gap-2 text-sm text-ink">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-start gap-3 rounded-lg border border-italian-red/20 bg-italian-red/5 p-4">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-italian-red" />
                  <p className="text-sm leading-relaxed text-ink">
                    <span className="font-semibold text-italian-red">Important — </span>
                    ces attestations sont <strong>internes à la plateforme COORIZON</strong> et attestent
                    du suivi et de la réussite à nos parcours. Elles <strong>ne constituent pas</strong> des
                    certifications officielles reconnues par les institutions italiennes ou européennes
                    (CELI, CILS, PLIDA, etc.) et ne peuvent être présentées comme telles.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SectionShell>

      {/* Final CTA */}
      <section className="bg-brand text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="h-3.5 w-3.5" />
              Prêt à commencer ?
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Inscrivez-vous et démarrez votre formation en italien
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-100 sm:text-base">
              Créez votre compte candidat, choisissez votre niveau de départ et accédez immédiatement aux
              premiers modules. Votre progression est suivie dans votre espace personnel.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-brand hover:bg-white/90"
              onClick={() => navigate("register-candidate")}
            >
              Créer mon compte candidat
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate("jobs")}
            >
              Voir les offres d'emploi
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function CourseCard({ course, onEnroll }: { course: Course; onEnroll: () => void }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className={cn("relative px-5 py-4 text-white", course.color)}>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-extrabold tracking-tight">{course.levelLabel}</span>
          <GraduationCap className="h-6 w-6 opacity-80" />
        </div>
        <div className="mt-1 text-xs font-medium opacity-90">{course.subtitle}</div>
      </div>
      <CardContent className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold text-navy">{course.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {course.description}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-center">
            <Clock className="h-4 w-4 text-brand" />
            <span className="font-semibold text-navy">{course.duration}</span>
            <span className="text-muted-foreground">Durée</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-center">
            <Layers className="h-4 w-4 text-brand-green" />
            <span className="font-semibold text-navy">{course.modules}</span>
            <span className="text-muted-foreground">Modules</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-center">
            <ListVideo className="h-4 w-4 text-italian-red" />
            <span className="font-semibold text-navy">{course.lessons}</span>
            <span className="text-muted-foreground">Leçons</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-surface/50 px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-brand hover:bg-brand/10"
          onClick={onEnroll}
        >
          S'inscrire à cette formation
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
