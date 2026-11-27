"use client";

import * as React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteRouter } from "@/lib/site-router";

export function HeroSection() {
  const { navigate } = useSiteRouter();

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
            COORIZON,{" "}
            <span className="bg-gradient-to-r from-brand-green via-brand to-brand-green bg-clip-text text-transparent">
              un parcours de mobilité professionnelle
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
              Espace candidat
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("register-recruiter")}
              className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              Espace entreprise
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
