"use client";

import * as React from "react";
import {
  ArrowRight,
  Quote,
  Star,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Plane,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SectionHeading, SectionShell } from "./section-heading";
import { JobOfferCard } from "../job-offer-card";
import { useSiteRouter } from "@/lib/site-router";
import {
  stats,
  sectors,
  jobOffers,
  courses,
  testimonials,
  partners,
  journeySteps,
  faqItems,
} from "@/lib/site-data";

export function StatsBand() {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 py-6 lg:justify-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-navy">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectorsSection() {
  const { navigate } = useSiteRouter();
  return (
    <SectionShell>
      <SectionHeading
        eyebrow="Secteurs qui recrutent"
        title="Des opportunités dans tous les secteurs porteurs"
        description="COORIZON collabore avec des entreprises italiennes de toutes tailles, des exploitations agricoles aux groupes industriels, en passant par l'hôtellerie et la santé."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sectors.map((sector) => (
          <button
            key={sector.slug}
            onClick={() => navigate("jobs", { sector: sector.slug })}
            className="group flex flex-col items-start rounded-xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <sector.icon className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="font-semibold">{sector.count}</Badge>
            </div>
            <h3 className="mt-4 font-semibold text-navy">{sector.name}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{sector.description}</p>
            <span className="mt-3 inline-flex items-center text-xs font-semibold text-brand">
              Voir les offres
              <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </SectionShell>
  );
}

export function LatestOffersSection() {
  const { navigate } = useSiteRouter();
  return (
    <SectionShell className="bg-surface">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <SectionHeading
          align="left"
          eyebrow="Offres récentes"
          title="Les dernières offres d'emploi"
          description="Une sélection d'opportunités publiées par nos entreprises partenaires en Italie."
          className="max-w-xl"
        />
        <Button variant="outline" onClick={() => navigate("jobs")} className="shrink-0">
          Toutes les offres
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {jobOffers.slice(0, 6).map((offer) => (
          <JobOfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </SectionShell>
  );
}

export function TrainingSection() {
  const { navigate } = useSiteRouter();
  return (
    <SectionShell>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <SectionHeading
          align="left"
          eyebrow="Formation en italien"
          title="Apprenez l'italien, niveau par niveau"
          description="Du niveau A1 au niveau C2, suivez des parcours structurés avec vidéos, exercices, examens et attestations internes."
          className="max-w-xl"
        />
        <Button variant="outline" onClick={() => navigate("training")} className="shrink-0">
          Découvrir les formations
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((course) => (
          <Card key={course.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className={`${course.color} relative h-24 px-5 py-4 text-white`}>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-extrabold">{course.levelLabel}</span>
                <GraduationCap className="h-6 w-6 opacity-80" />
              </div>
              <div className="mt-1 text-xs font-medium opacity-90">{course.subtitle}</div>
            </div>
            <CardContent className="p-5">
              <h3 className="font-semibold text-navy">{course.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{course.duration} · {course.modules} modules</span>
                <span>{course.lessons} leçons</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

export function JourneySection() {
  return (
    <SectionShell className="bg-navy text-white">
      <SectionHeading
        eyebrow="Le parcours candidat"
        title={<span className="text-white">De l'inscription au départ en Italie</span>}
        description={
          <span className="text-slate-300">
            Un processus structuré et transparent, de la création de votre profil jusqu'à votre intégration
            professionnelle en Italie.
          </span>
        }
      />
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {journeySteps.map((step) => (
          <div
            key={step.step}
            className="relative rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-brand-green/40 hover:bg-white/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-green/20 text-brand-green">
                <step.icon className="h-5 w-5" />
              </div>
              <span className="text-4xl font-extrabold text-white/10">{String(step.step).padStart(2, "0")}</span>
            </div>
            <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function PartnersSection() {
  const { navigate } = useSiteRouter();
  return (
    <SectionShell>
      <SectionHeading
        eyebrow="Ils recrutent avec COORIZON"
        title="Nos entreprises partenaires"
        description="Des entreprises italiennes vérifiées et validées par notre administration, qui recrutent régulièrement des talents africains."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {partners.map((p) => (
          <Card key={p.name} className="transition-all hover:border-brand/40 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy/5 text-navy">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-navy">{p.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="font-normal">{p.sector}</Badge>
                <Badge variant="outline" className="font-normal">{p.location}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{p.size}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button variant="outline" onClick={() => navigate("partners")}>
          Voir toutes les entreprises
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </SectionShell>
  );
}

export function TestimonialsSection() {
  return (
    <SectionShell className="bg-surface">
      <SectionHeading
        eyebrow="Témoignages"
        title="Ils ont réussi leur projet avec COORIZON"
        description="Des candidats accompagnés de l'Afrique de l'Ouest jusqu'à leur poste en Italie."
      />
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <Card key={t.id} className="flex h-full flex-col">
            <CardContent className="flex flex-1 flex-col p-6">
              <Quote className="h-7 w-7 text-brand/30" />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-brand/10 text-brand">{t.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.role} · {t.location}</div>
                </div>
                <div className="ml-auto flex">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

export function FaqPreviewSection() {
  const { navigate } = useSiteRouter();
  return (
    <SectionShell>
      <SectionHeading
        eyebrow="FAQ"
        title="Questions fréquentes"
        description="Les réponses aux questions les plus posées par les candidats et les entreprises."
      />
      <div className="mx-auto mt-10 max-w-3xl">
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
          {faqItems.slice(0, 5).map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-b last:border-b-0">
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate("faq")}>
            Voir toutes les questions
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}

export function FinalCtaSection() {
  const { navigate } = useSiteRouter();
  return (
    <section className="relative overflow-hidden bg-brand">
      <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="text-white">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Prêt à démarrer votre projet professionnel en Italie ?
            </h2>
            <p className="mt-4 max-w-xl text-slate-100 text-balance">
              Créez votre compte gratuitement, complétez votre profil et accédez aux offres, formations et
              accompagnement COORIZON.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" onClick={() => navigate("register-candidate")} className="bg-white text-navy hover:bg-slate-100">
                Créer mon compte candidat
                <ArrowRight className="ml-2 h-4 w-4" />
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
            <CtaFeature icon={Users} title="Accompagnement humain" desc="Un agent dédié pour votre dossier." />
            <CtaFeature icon={GraduationCap} title="Formation incluse" desc="Italien A1 à C2, examens & attestations." />
            <CtaFeature icon={ShieldCheck} title="Entreprises vérifiées" desc="Chaque recruteur est validé." />
            <CtaFeature icon={Plane} title="Suivi complet" desc="Du profil au départ en Italie." />
          </div>
        </div>
      </div>
    </section>
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
