"use client";

import * as React from "react";
import {
  Search,
  MapPin,
  Briefcase,
  Languages,
  ArrowRight,
  Users,
  Sparkles,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/site/sections/page-header";
import { SectionHeading, SectionShell } from "@/components/site/sections/section-heading";
import { JobOfferCard } from "@/components/site/job-offer-card";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectors, jobOffers, type JobOffer } from "@/lib/site-data";

const ITALIAN_LEVELS = [
  { value: "A1", label: "A1 — Débutant" },
  { value: "A2", label: "A2 — Élémentaire" },
  { value: "B1", label: "B1 — Intermédiaire" },
  { value: "B2", label: "B2 — Avancé" },
  { value: "C1", label: "C1 — Autonome" },
  { value: "C2", label: "C2 — Maîtrise" },
];

export function JobOffersPage() {
  const { params, navigate } = useSiteRouter();
  const { toast } = useToast();

  // Initial filters pre-filled from URL params.
  const [keyword, setKeyword] = React.useState(params.get("q") ?? "");
  const [sector, setSector] = React.useState(params.get("sector") ?? "all");
  const [level, setLevel] = React.useState(params.get("level") ?? "all");
  const [city, setCity] = React.useState(params.get("city") ?? "");

  // Commit only on submit so "Rechercher" actually applies the filters.
  const [applied, setApplied] = React.useState({
    keyword: params.get("q") ?? "",
    sector: params.get("sector") ?? "all",
    level: params.get("level") ?? "all",
    city: params.get("city") ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied({ keyword, sector, level, city });
    toast({
      title: "Recherche mise à jour",
      description: "Vos filtres ont été appliqués aux offres ci-dessous.",
    });
  };

  const handleClear = () => {
    setKeyword("");
    setSector("all");
    setLevel("all");
    setCity("");
    setApplied({ keyword: "", sector: "all", level: "all", city: "" });
  };

  const results: JobOffer[] = React.useMemo(() => {
    const k = applied.keyword.trim().toLowerCase();
    const c = applied.city.trim().toLowerCase();
    const sectorName =
      applied.sector === "all"
        ? null
        : sectors.find((s) => s.slug === applied.sector)?.name ?? null;

    return jobOffers.filter((offer) => {
      if (k) {
        const hay = `${offer.title} ${offer.company} ${offer.description}`.toLowerCase();
        if (!hay.includes(k)) return false;
      }
      if (sectorName && offer.sector !== sectorName) return false;
      if (applied.level !== "all" && offer.italianLevel !== applied.level) return false;
      if (c) {
        const hay = `${offer.city} ${offer.region}`.toLowerCase();
        if (!hay.includes(c)) return false;
      }
      return true;
    });
  }, [applied]);

  const hasFilters =
    applied.keyword.trim() !== "" ||
    applied.sector !== "all" ||
    applied.level !== "all" ||
    applied.city.trim() !== "";

  return (
    <>
      <PageHeader
        eyebrow="Offres d'emploi"
        title="Trouvez votre poste en Italie"
        description="Plus de 600 offres actives publiées par nos entreprises partenaires italiennes — du secteur agricole à l'hôtellerie, en passant par la santé, le BTP et la logistique. Recrutement ouvert aux talents africains."
      />

      {/* Search & filter bar */}
      <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="shadow-lg">
            <CardContent className="p-5 sm:p-6">
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 gap-4 md:grid-cols-12"
                aria-label="Filtrer les offres d'emploi"
              >
                <div className="md:col-span-4">
                  <label htmlFor="job-keyword" className="mb-1.5 block text-xs font-semibold text-navy">
                    Mot-clé
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="job-keyword"
                      type="text"
                      placeholder="Titre, entreprise, mot-clé…"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="job-sector" className="mb-1.5 block text-xs font-semibold text-navy">
                    Secteur
                  </label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger id="job-sector" className="w-full">
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Tous les secteurs" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les secteurs</SelectItem>
                      {sectors.map((s) => (
                        <SelectItem key={s.slug} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="job-level" className="mb-1.5 block text-xs font-semibold text-navy">
                    Niveau d'italien
                  </label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="job-level" className="w-full">
                      <span className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Tous les niveaux" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      {ITALIAN_LEVELS.map((lvl) => (
                        <SelectItem key={lvl.value} value={lvl.value}>
                          {lvl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="job-city" className="mb-1.5 block text-xs font-semibold text-navy">
                    Ville / Région
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="job-city"
                      type="text"
                      placeholder="Florence…"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="md:col-span-12 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <Button type="submit" size="lg" className="sm:w-auto">
                    <Search className="h-4 w-4" />
                    Rechercher
                  </Button>
                  {hasFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      Réinitialiser les filtres
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results */}
      <SectionShell>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading
            align="left"
            eyebrow="Offres correspondantes"
            title={hasFilters ? "Résultats de votre recherche" : "Toutes nos offres"}
            description={
              results.length > 0
                ? `${results.length} offre${results.length > 1 ? "s" : ""} correspondent à votre recherche.`
                : "Aucune offre ne correspond pour le moment."
            }
            className="max-w-2xl"
          />
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 sm:flex">
            <Users className="h-4 w-4 text-brand" />
            <span className="text-sm font-semibold text-navy">{results.length}</span>
            <span className="text-xs text-muted-foreground">offre{results.length > 1 ? "s" : ""}</span>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {results.map((offer) => (
              <JobOfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <Card className="mt-10 border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-muted-foreground">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy">Aucune offre ne correspond</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Essayez d'élargir votre recherche : retirez un filtre, changez de secteur ou
                abaissez le niveau d'italien demandé. De nouvelles offres sont publiées chaque semaine.
              </p>
              <Button onClick={handleClear} variant="outline" className="mt-6">
                <X className="h-4 w-4" />
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        )}
      </SectionShell>

      {/* CTA band */}
      <section className="bg-brand text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Candidat·e ?
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Créez votre profil et postulez en quelques clics
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-100 sm:text-base">
              Inscrivez-vous gratuitement, complétez votre profil candidat, accédez à l'ensemble des offres
              et suivez votre dossier de recrutement de bout en bout.
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
              onClick={() => navigate("training")}
            >
              Me former en italien
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
