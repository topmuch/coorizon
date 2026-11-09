"use client";

import * as React from "react";
import {
  Building2,
  Briefcase,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Users,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionHeading, SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";
import { partners, sectors } from "@/lib/site-data";

interface PartnerStat {
  value: string;
  label: string;
  icon: React.ElementType;
}

const partnerStats: PartnerStat[] = [
  { value: "180+", label: "Entreprises partenaires", icon: Building2 },
  { value: "610+", label: "Offres d'emploi actives", icon: Briefcase },
  { value: "8", label: "Secteurs représentés", icon: TrendingUp },
  { value: "94%", label: "Satisfaction recruteurs", icon: CheckCircle2 },
];

interface PartnerBenefit {
  icon: React.ElementType;
  title: string;
  description: string;
}

const partnerBenefits: PartnerBenefit[] = [
  {
    icon: Users,
    title: "Talents préformés",
    description: "Accédez à des candidats formés en italien (A1 à C2) et accompagnés par nos équipes.",
  },
  {
    icon: ShieldCheck,
    title: "Profils vérifiés",
    description: "Consultez des CV et des documents validés par l'administration COORIZON.",
  },
  {
    icon: Briefcase,
    title: "Accompagnement administratif",
    description: "Bénéficiez d'un accompagnement pour le contrat, le Nulla Osta et les démarches.",
  },
  {
    icon: TrendingUp,
    title: "Visibilité",
    description: "Mettez en avant votre entreprise et vos offres auprès de candidats qualifiés.",
  },
];

export function PartnersPage() {
  const { navigate } = useSiteRouter();

  return (
    <>
      <PageHeader
        eyebrow="Entreprises"
        title="Nos entreprises partenaires"
        description="Des entreprises italiennes vérifiées et validées par l'administration COORIZON, qui recrutent régulièrement des talents africains pour des postes durables en Italie."
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
            onClick={() => navigate("register-recruiter")}
            className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Devenir partenaire
          </Button>
        </div>
      </PageHeader>

      {/* Stats strip */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {partnerStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 py-6 lg:justify-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-navy">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Partners grid */}
      <SectionShell>
        <SectionHeading
          eyebrow="Annuaire"
          title="Les entreprises qui recrutent"
          description="Une sélection d'entreprises italiennes partenaires de COORIZON. Chaque entreprise est validée par notre administration avant de pouvoir publier des offres."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <Card
              key={partner.name}
              className="group flex h-full flex-col transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/5 text-navy">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <ShieldCheck className="h-5 w-5 text-brand-green" aria-label="Entreprise vérifiée" />
                </div>
                <h3 className="mt-4 font-semibold text-navy">{partner.name}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-normal">{partner.sector}</Badge>
                  <Badge variant="outline" className="font-normal">
                    <MapPin className="mr-1 h-3 w-3" />
                    {partner.location}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{partner.size}</p>
                <div className="mt-auto pt-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("jobs")}
                    className="h-8 px-3 text-brand hover:bg-brand/10 hover:text-brand"
                  >
                    Voir les offres
                    <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Devenir entreprise partenaire */}
      <SectionShell className="bg-surface">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Recruteurs"
              title="Devenir entreprise partenaire"
              description="Rejoignez le réseau d'entreprises italiennes qui recrutent des talents formés et accompagnés par COORIZON."
              className="max-w-xl"
            />
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {partnerBenefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-navy">{benefit.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="lg:sticky lg:top-6">
            <CardContent className="p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy">Inscrire mon entreprise</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Créez le compte de votre entreprise en quelques minutes. Une fois votre profil
                complété, publiez vos offres et recevez les candidatures de talents préformés.
              </p>
              <Button
                className="mt-6 w-full"
                size="lg"
                onClick={() => navigate("register-recruiter")}
              >
                Créer un compte recruteur
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Chaque compte recruteur est validé par l'administration COORIZON avant de pouvoir
                  publier des offres. Les délais de validation sont généralement de 24 à 48 heures
                  ouvrées.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionShell>

      {/* Secteurs représentés */}
      <SectionShell>
        <SectionHeading
          eyebrow="Couverture sectorielle"
          title="Secteurs représentés"
          description="Nos entreprises partenaires couvrent les principaux secteurs qui recrutent en Italie, de l'hôtellerie à l'industrie en passant par la santé et la logistique."
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
      <section className="relative overflow-hidden bg-brand" aria-label="Devenir partenaire">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              Votre entreprise recrute en Italie ?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-100 text-balance sm:text-lg">
              Rejoignez les entreprises partenaires de COORIZON et accédez à des talents africains
              formés, vérifiés et accompagnés dans leur mobilité professionnelle.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("register-recruiter")}
                className="bg-white text-navy hover:bg-slate-100"
              >
                Devenir entreprise partenaire
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
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-100">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Comptes vérifiés
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Validation sous 48h
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Talents préformés
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
