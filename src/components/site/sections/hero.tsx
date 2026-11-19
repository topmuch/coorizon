"use client";

import * as React from "react";
import { Search, MapPin, Briefcase, ArrowRight, Sparkles, ShieldCheck, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteRouter } from "@/lib/site-router";
import { sectors } from "@/lib/site-data";

export function HeroSection() {
  const { navigate } = useSiteRouter();
  const [keyword, setKeyword] = React.useState("");
  const [sector, setSector] = React.useState("all");
  const [city, setCity] = React.useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (keyword.trim()) params.q = keyword.trim();
    if (sector && sector !== "all") params.sector = sector;
    if (city.trim()) params.city = city.trim();
    navigate("jobs", params);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <img
        src="/coorizon-banner.png"
        alt="COORIZON — Votre avenir professionnel en Italie"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark overlay calque */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/75 to-navy/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-brand-green" />
            Recrutement · Formation en italien · Accompagnement
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
            Votre avenir professionnel{" "}
            <span className="bg-gradient-to-r from-brand-green via-brand to-brand-green bg-clip-text text-transparent">
              commence ici.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/90 text-balance">
            COORIZON vous accompagne dans votre projet professionnel en Italie grâce à la formation
            linguistique, au recrutement et à l'accompagnement personnalisé.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate("register-candidate")}
              className="w-full bg-brand hover:bg-brand/90 sm:w-auto"
            >
              Je suis candidat
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("register-recruiter")}
              className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              Je suis recruteur
            </Button>
          </div>
        </div>

        {/* Job search engine */}
        <form
          onSubmit={onSearch}
          className="mx-auto mt-12 max-w-4xl rounded-2xl border border-white/15 bg-white p-4 shadow-2xl sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label htmlFor="hero-keyword" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Mot-clé / métier
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hero-keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ex : cuisinier, aide-soignant…"
                  className="border-0 bg-surface pl-9 focus-visible:ring-brand"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <label htmlFor="hero-sector" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Secteur
              </label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger id="hero-sector" className="border-0 bg-surface focus:ring-brand">
                  <SelectValue placeholder="Tous les secteurs" />
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
            <div className="md:col-span-2">
              <label htmlFor="hero-city" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Ville / région
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hero-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Italie"
                  className="border-0 bg-surface pl-9 focus-visible:ring-brand"
                />
              </div>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full bg-brand hover:bg-brand/90">
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-green" /> Entreprises vérifiées
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-brand" /> Formation incluse
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-italian-red" /> 610+ offres actives
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}
