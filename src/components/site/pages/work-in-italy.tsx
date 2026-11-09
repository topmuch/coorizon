"use client";

import * as React from "react";
import {
  TrendingUp,
  Briefcase,
  Sun,
  Globe,
  FileText,
  ShieldCheck,
  Plane,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionHeading, SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";
import { sectors } from "@/lib/site-data";

interface WhyItalyFeature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const whyItalyFeatures: WhyItalyFeature[] = [
  {
    icon: TrendingUp,
    title: "Marché dynamique",
    description:
      "L'Italie recrute massivement dans l'hôtellerie, l'agroalimentaire, le BTP, la santé et l'industrie.",
  },
  {
    icon: Briefcase,
    title: "Secteurs qui recrutent",
    description:
      "Plus de 600 offres actives publiées par des entreprises italiennes vérifiées par COORIZON.",
  },
  {
    icon: Sun,
    title: "Cadre de vie",
    description:
      "Un climat méditerranéen, une qualité de vie reconnue et un coût de la vie accessible.",
  },
  {
    icon: Globe,
    title: "Proximité culturelle",
    description:
      "Une culture latine proche, une langue accessible et des communautés accueillantes.",
  },
];

interface ContractType {
  italianName: string;
  frenchName: string;
  description: string;
}

const contractTypes: ContractType[] = [
  {
    italianName: "Contratto Indeterminato",
    frenchName: "CDI",
    description:
      "Contrat à durée indéterminée, le plus stable. Réservé aux profils qualifiés ou confirmés.",
  },
  {
    italianName: "Contratto Determinato",
    frenchName: "CDD",
    description:
      "Contrat à durée déterminée pour des missions ponctuelles, remplacements ou pics d'activité.",
  },
  {
    italianName: "Contratto Stagionale",
    frenchName: "Saisonnier",
    description:
      "Emploi saisonnier dans le tourisme, l'agriculture ou l'hôtellerie, sur plusieurs mois.",
  },
  {
    italianName: "Contratto Interinale",
    frenchName: "Intérim",
    description:
      "Mission via une agence d'intérim (Agenzia per il lavoro), flexible et souvent renouvelable.",
  },
  {
    italianName: "Apprendistato",
    frenchName: "Apprentissage",
    description:
      "Contrat en alternance combinant formation et travail, accessible aux jeunes professionnels.",
  },
  {
    italianName: "Partita IVA",
    frenchName: "Freelance",
    description:
      "Statut d'indépendant pour les consultants, traducteurs et professionnels du numérique.",
  },
];

interface AdminStep {
  title: string;
  italianLabel: string;
  description: string;
  icon: React.ElementType;
}

const adminSteps: AdminStep[] = [
  {
    title: "Contrat de travail",
    italianLabel: "Contratto di lavoro",
    description:
      "Une entreprise italienne partenaire vous recrute et signe votre contrat de travail.",
    icon: FileText,
  },
  {
    title: "Nulla Osta",
    italianLabel: "Autorisation préalable",
    description:
      "L'employeur obtient l'autorisation au travail (Nulla Osta) auprès de l'administration italienne.",
    icon: ShieldCheck,
  },
  {
    title: "Demande de visa",
    italianLabel: "Richiesta visto",
    description:
      "Vous déposez votre demande de visa de travail auprès du consulat d'Italie de votre pays.",
    icon: FileText,
  },
  {
    title: "Départ vers l'Italie",
    italianLabel: "Partenza",
    description:
      "Une fois le visa délivré, vous organisez votre voyage et votre installation en Italie.",
    icon: Plane,
  },
  {
    title: "Permis de séjour",
    italianLabel: "Permesso di soggiorno",
    description:
      "Dans les 8 jours suivant votre arrivée, vous déposez votre demande de permis de séjour.",
    icon: MapPin,
  },
];

export function WorkInItalyPage() {
  const { navigate } = useSiteRouter();

  return (
    <>
      <PageHeader
        eyebrow="Mobilité"
        title="Travailler en Italie"
        description="COORIZON vous accompagne dans votre mobilité professionnelle vers l'Italie : compréhension des contrats, démarches administratives, recherche d'offres et suivi de votre projet, de votre inscription à votre installation."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("jobs")}
            className="bg-white text-navy hover:bg-slate-100"
          >
            Voir les offres
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("register-candidate")}
            className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            S'inscrire
          </Button>
        </div>
      </PageHeader>

      {/* Pourquoi l'Italie ? */}
      <SectionShell>
        <SectionHeading
          eyebrow="Le contexte"
          title="Pourquoi l'Italie ?"
          description="Une destination de choix pour les talents africains : un marché du travail actif, des secteurs qui recrutent en continu et un cadre de vie méditerranéen."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyItalyFeatures.map((feature) => (
            <Card key={feature.title} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
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

      {/* Les types de contrat */}
      <SectionShell className="bg-surface">
        <SectionHeading
          eyebrow="Comprendre avant de partir"
          title="Les types de contrat en Italie"
          description="Avant de postuler, identifiez le contrat adapté à votre profil. Voici les principaux types de contrat utilisés par les entreprises italiennes partenaires."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {contractTypes.map((contract) => (
            <Card key={contract.italianName} className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex h-full flex-col p-6">
                <Badge variant="secondary" className="w-fit font-semibold">{contract.frenchName}</Badge>
                <h3 className="mt-3 font-semibold text-navy">{contract.italianName}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {contract.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Les démarches administratives */}
      <SectionShell>
        <SectionHeading
          eyebrow="Parcours d'immigration"
          title="Les démarches administratives"
          description="Le parcours type d'immigration professionnelle vers l'Italie se déroule en plusieurs étapes, du contrat de travail au permis de séjour."
        />
        <div className="mx-auto mt-12 max-w-4xl">
          <ol className="relative space-y-8 border-l-2 border-brand/20 pl-8 sm:pl-10">
            {adminSteps.map((step, index) => (
              <li key={step.title} className="relative">
                <span
                  className="absolute -left-[2.45rem] flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white ring-4 ring-white sm:-left-[2.95rem]"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <h3 className="font-semibold text-navy">{step.title}</h3>
                          <span className="text-xs italic text-muted-foreground">
                            {step.italianLabel}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>

        <Card className="mx-auto mt-10 max-w-4xl border-italian-red/30 bg-italian-red/5">
          <CardContent className="flex items-start gap-3 p-5 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-italian-red/10 text-italian-red">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-navy">Information importante</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                COORIZON ne garantit aucun visa ou autorisation. Les décisions relèvent des autorités
                italiennes compétentes (consulats, Préfectures, Sportello Unico). Notre rôle est de
                vous informer et de vous accompagner dans la préparation de votre dossier.
              </p>
            </div>
          </CardContent>
        </Card>
      </SectionShell>

      {/* Secteurs qui recrutent */}
      <SectionShell className="bg-surface">
        <SectionHeading
          eyebrow="Opportunités par secteur"
          title="Secteurs qui recrutent en Italie"
          description="Explorez les offres d'emploi par secteur et identifiez les opportunités correspondant à votre profil professionnel."
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sectors.map((sector) => (
            <button
              key={sector.slug}
              onClick={() => navigate("jobs", { sector: sector.slug })}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <sector.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-navy">{sector.name}</div>
                <div className="text-xs text-muted-foreground">{sector.count} offres</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-brand opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </SectionShell>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-brand" aria-label="Inscription candidat">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              Prêt à travailler en Italie ?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-100 text-balance sm:text-lg">
              Créez votre compte candidat, suivez la formation en italien et accédez aux offres des
              entreprises italiennes partenaires de COORIZON.
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
                onClick={() => navigate("jobs")}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Parcourir les offres
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-100">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Inscription gratuite
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Entreprises vérifiées
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> Accompagnement humain
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
