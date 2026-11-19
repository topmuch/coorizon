"use client";

import { HeroSection } from "../sections/hero";
import {
  StatsBand,
  SectorsSection,
  LatestOffersSection,
  TrainingSection,
  JourneySection,
  PartnersSection,
  TestimonialsSection,
  FaqPreviewSection,
  FinalCtaSection,
} from "../sections/home-sections";

export function HomePage() {
  return (
    <>
      <HeroSection />
      <LatestOffersSection />
      <StatsBand />
      <SectorsSection />
      <TrainingSection />
      <JourneySection />
      <TestimonialsSection />
      <FaqPreviewSection />
      <FinalCtaSection />
    </>
  );
}
