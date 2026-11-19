"use client";

import { HeroSection } from "../sections/hero";
import {
  StatsBand,
  SectorsSection,
  LatestOffersSection,
  TrainingSection,
  JourneySection,
  TestimonialsSection,
  FaqPreviewSection,
  FinalCtaSection,
} from "../sections/home-sections";
import { PartenariatSection } from "../sections/partenariat";

export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBand />
      <LatestOffersSection />
      <SectorsSection />
      <TrainingSection />
      <JourneySection />
      <TestimonialsSection />
      <FaqPreviewSection />
      <PartenariatSection />
      <FinalCtaSection />
    </>
  );
}
