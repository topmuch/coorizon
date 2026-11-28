"use client";

import * as React from "react";
import {
  ArrowRight,
  BookOpen,
  School,
  Compass,
  ClipboardList,
  Brain,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionHeading, SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Rubric {
  name: string;
  description: string;
}

interface MainService {
  icon: React.ElementType;
  title: string;
  description: string;
  rubrics: Rubric[];
}

// ─── Données ────────────────────────────────────────────────────────────────

const mainServices: MainService[] = [
  {
    icon: BookOpen,
    title: "Accès aux ressources",
    description:
      "Une bibliothèque complète de supports pratiques pour préparer votre projet de mobilité professionnelle en Italie.",
    rubrics: [
      {
        name: "Fascicules",
        description:
          "Des guides pratiques à télécharger : préparer votre départ, comprendre les contrats italiens, réussir votre installation.",
      },
      {
        name: "Contenus en ligne",
        description:
          "Articles et fiches pratiques sur le marché du travail italien, la formation linguistique et la vie quotidienne.",
      },
    ],
  },
  {
    icon: School,
    title: "Espaces d'apprentissage",
    description:
      "Des espaces dédiés pour développer vos compétences linguistiques, culturelles et professionnelles, à votre rythme.",
    rubrics: [
      {
        name: "Italien pratique",
        description:
          "Vocabulaire du travail et de la vie quotidienne, dialogues types et exercices interactifs par niveau.",
      },
      {
        name: "Culture italienne",
        description:
          "Us et coutumes, codes professionnels régionaux et savoir-vivre en entreprise en Italie.",
      },
      {
        name: "Préparation aux entretiens",
        description:
          "Simulations d'entretiens, questions fréquentes et conseils pour convaincre les entreprises italiennes.",
      },
      {
        name: "Techniques de recherche",
        description:
          "CV européen, lettres de motivation et utilisation des plateformes d'emploi italiennes.",
      },
      {
        name: "Vie quotidienne",
        description:
          "Logement, transports, santé et démarches du quotidien dans les grandes villes italiennes.",
      },
    ],
  },
  {
    icon: Compass,
    title: "Conseil et orientation",
    description:
      "Un accompagnement personnalisé pour clarifier votre projet et construire un plan d'action réaliste.",
    rubrics: [
      {
        name: "Formation",
        description:
          "Choisissez le parcours de formation en italien adapté à votre niveau et à votre métier cible.",
      },
      {
        name: "Insertion",
        description:
          "Stratégies d'entrée sur le marché du travail italien : ciblage des secteurs, candidatures et réseau.",
      },
      {
        name: "Évolution",
        description:
          "Planifiez votre progression : certifications, spécialisation et perspectives de carrière en Italie.",
      },
    ],
  },
];

const softSkillsRubrics: Rubric[] = [
  {
    name: "Communication interpersonnelle",
    description:
      "Savoir écouter, négocier et collaborer efficacement dans un environnement multiculturel.",
  },
  {
    name: "Gestion du stress",
    description:
      "Techniques de respiration, organisation et prise de recul pour rester performant sous pression.",
  },
  {
    name: "Travail en équipe",
    description:
      "Contribuer à un collectif, gérer les différences et résoudre les conflits de façon constructive.",
  },
  {
    name: "Adaptabilité",
    description:
      "S'ajuster rapidement à un nouvel environnement de travail, de nouveaux outils et de nouvelles méthodes.",
  },
  {
    name: "Gestion du temps",
    description:
      "Prioriser les tâches, respecter les échéances et équilibrer vie professionnelle et personnelle.",
  },
];

const adminRubrics: Rubric[] = [
  {
    name: "Passeport",
    description:
      "Vérifiez la validité de votre passeport et anticipez le renouvellement avant le dépôt du dossier.",
  },
  {
    name: "Assurance",
    description:
      "Souscrivez une couverture santé et rapatriement valide en Italie pour toute la durée de votre contrat.",
  },
  {
    name: "Certificat médical",
    description:
      "Réalisez la visite médicale d'aptitude auprès d'un centre agréé et transmettez le rapport.",
  },
];

const softSkillsHighlights = [
  {
    icon: Users,
    title: "Compétences humaines recherchées",
    desc: "Les qualités que les employeurs italiens valorisent au quotidien.",
  },
  {
    icon: Brain,
    title: "Développement personnel",
    desc: "Des modules courts et concrets, pensés pour un apprentissage durable.",
  },
  {
    icon: ShieldCheck,
    title: "Préparation à l'emploi",
    desc: "Un atout décisif pour réussir vos entretiens et votre intégration.",
  },
];

// ─── RubricExplorer (badges cliquables + détail dépliable) ──────────────────

function RubricExplorer({ rubrics, variant = "light" }: { rubrics: Rubric[]; variant?: "light" | "dark" }) {
  const [activeName, setActiveName] = React.useState<string | null>(null);
  const active = rubrics.find((r) => r.name === activeName) ?? null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {rubrics.map((rubric) => {
          const isActive = rubric.name === activeName;
          return (
            <button
              key={rubric.name}
              type="button"
              onClick={() => setActiveName(isActive ? null : rubric.name)}
              aria-expanded={isActive}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                variant === "light" && [
                  "border-border bg-surface text-navy hover:border-brand/50 hover:bg-brand/5",
                  isActive && "border-brand bg-brand text-white hover:bg-brand",
                ],
                variant === "dark" && [
                  "border-white/20 bg-white/10 text-white hover:bg-white/20",
                  isActive && "border-brand-green bg-brand-green text-white hover:bg-brand-green",
                ]
              )}
            >
              {rubric.name}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  isActive && "rotate-180",
                  variant === "light" ? "text-brand" : "text-brand-green",
                  isActive && variant === "light" && "text-white"
                )}
              />
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className={cn(
            "mt-3 flex items-start gap-3 rounded-xl border p-4",
            variant === "light" && "border-brand/25 bg-brand/5",
            variant === "dark" && "border-white/15 bg-white/10"
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              variant === "light" ? "bg-brand/15 text-brand" : "bg-brand-green/25 text-brand-green"
            )}
          >
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div
              className={cn(
                "text-sm font-semibold",
                variant === "light" ? "text-navy" : "text-white"
              )}
            >
              {active.name}
            </div>
            <p
              className={cn(
                "mt-1 text-sm leading-relaxed",
                variant === "light" ? "text-muted-foreground" : "text-slate-300"
              )}
            >
              {active.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function PlusCoorizonPage() {
  const { navigate } = useSiteRouter();

  return (
    <>
      <PageHeader
        eyebrow="Accompagnement global"
        title="Plus COORIZON"
        description="Ressources, espaces d'apprentissage, Soft Skills Center, conseil et orientation, démarches administratives : un accompagnement complet au-delà du recrutement, pour réussir chaque étape de votre projet en Italie."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("register-candidate")}
            className="bg-white text-navy hover:bg-slate-100"
          >
            Créer mon compte
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("contact")}
            className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Nous contacter
          </Button>
        </div>
      </PageHeader>

      {/* Les 3 services principaux */}
      <SectionShell>
        <SectionHeading
          eyebrow="Nos accompagnements"
          title="Tout COORIZON, au-delà de l'emploi"
          description="Cliquez sur les rubriques de chaque bloc pour découvrir le détail de nos services."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {mainServices.map((service) => (
            <Card key={service.title} className="flex h-full flex-col transition-all hover:shadow-lg">
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-navy">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-auto">
                  <RubricExplorer rubrics={service.rubrics} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Soft Skills Center */}
      <SectionShell className="bg-navy text-white">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Soft Skills Center
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl">
              Développez les compétences humaines qui font la différence
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Le Soft Skills Center COORIZON vous aide à renforcer vos compétences
              comportementales, essentielles pour réussir en Italie comme pour progresser
              dans votre carrière. Cliquez sur un module pour découvrir son contenu.
            </p>
            <RubricExplorer rubrics={softSkillsRubrics} variant="dark" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {softSkillsHighlights.map((h) => (
              <div
                key={h.title}
                className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur transition-colors hover:border-brand-green/40 hover:bg-white/10"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-green/20 text-brand-green">
                  <h.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-white">{h.title}</div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-300">{h.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* Démarches administratives */}
      <SectionShell>
        <SectionHeading
          eyebrow="Démarches administratives"
          title="Nous vous guidons pas à pas"
          description="Préparez sereinement vos documents pour la mobilité vers l'Italie. Cliquez sur une démarche pour voir ce que COORIZON vérifie avec vous."
        />
        <Card className="mx-auto mt-10 max-w-3xl border-dashed">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-navy">Vos documents, vérifiés par nos équipes</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Avant chaque étape clé de votre dossier, un agent COORIZON passe en revue
                  avec vous les documents indispensables pour éviter les retards et les refus.
                </p>
              </div>
            </div>
            <RubricExplorer rubrics={adminRubrics} />
          </CardContent>
        </Card>
      </SectionShell>

      {/* CTA final */}
      <section className="relative overflow-hidden bg-brand" aria-label="Inscription Plus COORIZON">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              Profitez de l'accompagnement complet COORIZON
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-100 text-balance sm:text-lg">
              Créez votre compte et accédez aux ressources, aux espaces d'apprentissage, au
              Soft Skills Center et à l'accompagnement personnalisé.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("register-candidate")}
                className="bg-white text-navy hover:bg-slate-100"
              >
                Créer mon compte
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("contact")}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Nous contacter
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
