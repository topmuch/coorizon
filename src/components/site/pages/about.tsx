"use client";

import * as React from "react";
import {
  Target,
  Award,
  ShieldCheck,
  Eye,
  HeartHandshake,
  Users,
  Globe,
  Briefcase,
  Building2,
  GraduationCap,
  Plane,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionHeading, SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";
import { stats } from "@/lib/site-data";

const values = [
  { icon: Eye, title: "Transparence", desc: "Des processus clairs à chaque étape, sans promesse illusoire." },
  { icon: Award, title: "Excellence", desc: "Des standards élevés pour la formation et le recrutement." },
  { icon: HeartHandshake, title: "Accompagnement", desc: "Un agent dédié qui guide chaque candidat pas à pas." },
  { icon: Globe, title: "Inclusion", desc: "Une mobilité professionnelle ouverte à tous les talents." },
];

const audiences = [
  { icon: Briefcase, title: "Candidats africains", desc: "Talents du Sénégal et d'Afrique de l'Ouest cherchant un emploi qualifié en Italie." },
  { icon: Building2, title: "Entreprises italiennes", desc: "Recruteurs vérifiés cherchant des profils motivés et formés." },
  { icon: Users, title: "Agences & partenaires", desc: "Structures locales qui identifient et préparent les candidats." },
  { icon: GraduationCap, title: "Formateurs en italien", desc: "Enseignants qui conçoivent et animent les parcours linguistiques." },
  { icon: Plane, title: "Agents de suivi", desc: "Accompagnateurs qui gèrent les dossiers administratifs et le suivi." },
];

const pillars = [
  { icon: Briefcase, title: "Recrutement", desc: "Offres vérifiées et profils validés." },
  { icon: GraduationCap, title: "Formation", desc: "Italien A1 à C2, examens internes." },
  { icon: Plane, title: "Immigration", desc: "Dossiers suivis par des agents dédiés." },
];

const commitments = [
  "Recrutement par des entreprises italiennes vérifiées",
  "Formation en italien structurée, du niveau A1 au niveau C2",
  "Accompagnement humain par des agents dédiés",
  "Transparence sur les démarches, les coûts et les délais",
];

export function AboutPage() {
  const { navigate } = useSiteRouter();

  return (
    <>
      <PageHeader
        eyebrow="À propos"
        title="La plateforme de la mobilité professionnelle vers l'Italie"
        description="COORIZON connecte les talents d'Afrique de l'Ouest aux entreprises italiennes qui recrutent, en combinant formation en langue italienne, recrutement international et accompagnement complet à l'immigration professionnelle."
      />

      {/* Notre mission */}
      <SectionShell>
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Notre mission"
              title="Rendre la mobilité professionnelle accessible et encadrée"
            />
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              COORIZON a pour mission de structurer et sécuriser le parcours des talents africains
              vers l'Italie. Nous opérons à la croisée de trois métiers : le recrutement
              international, la formation en langue italienne et l'accompagnement à l'immigration
              professionnelle.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Notre marché cible est le Sénégal et l'Afrique de l'Ouest, une région riche en talents
              qualifiés et motivés. Nous les mettons en relation avec des entreprises italiennes
              vérifiées qui recrutent dans les secteurs porteurs : hôtellerie, santé, BTP,
              agriculture, industrie, logistique et tech.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {pillars.map((p) => (
                <div key={p.title} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <p.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-navy">{p.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-navy bg-navy text-white">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-brand-green">
                <Target className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">COORIZON en chiffres</span>
              </div>
              <h3 className="mt-3 text-xl font-bold text-white">Un écosystème en croissance</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Des chiffres qui témoignent de l'engagement de nos équipes et de la confiance des
                candidats et entreprises partenaires.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/20 text-brand-green">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-2xl font-extrabold text-white">{s.value}</div>
                    <div className="text-xs text-slate-300">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionShell>

      {/* Nos valeurs */}
      <SectionShell className="bg-surface">
        <SectionHeading
          eyebrow="Nos valeurs"
          title="Ce qui guide COORIZON au quotidien"
          description="Quatre principes structurent notre action, du premier contact jusqu'à l'intégration professionnelle en Italie."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <Card key={v.title} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-navy">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Pour qui ? */}
      <SectionShell>
        <SectionHeading
          eyebrow="Pour qui ?"
          title="Un écosystème au service de cinq acteurs"
          description="COORIZON relie les candidats, les entreprises et les acteurs de l'accompagnement autour d'un parcours commun et transparent."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <Card key={a.title} className="h-full transition-all hover:border-brand/40 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-navy">{a.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Notre engagement */}
      <SectionShell>
        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-navy">Notre engagement de transparence</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  COORIZON est une plateforme d'accompagnement. Aucune offre d'emploi, attestation
                  ou visa n'est garanti. Les décisions de recrutement relèvent des entreprises
                  partenaires ; les décisions administratives relèvent des autorités consulaires et
                  gouvernementales italiennes. Les attestations de formation générées par la
                  plateforme sont internes et ne constituent pas des certifications officielles.
                </p>
              </div>
              <div className="lg:w-80 lg:shrink-0">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand">
                    Ce que nous garantissons
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {commitments.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SectionShell>

      {/* CTA final */}
      <section className="relative overflow-hidden bg-brand">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Rejoignez COORIZON et structurez votre projet professionnel en Italie
            </h2>
            <p className="mt-4 text-slate-100 text-balance">
              Créez votre compte gratuitement et accédez aux offres d'emploi, aux formations en
              italien et à l'accompagnement de nos équipes.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("register-candidate")}
                className="bg-white text-navy hover:bg-slate-100"
              >
                Créer mon compte candidat
                <ArrowRight className="ml-2 h-4 w-4" />
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
