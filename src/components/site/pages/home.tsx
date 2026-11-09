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
      <StatsBand />
      <SectorsSection />
      <LatestOffersSection />
      <TrainingSection />
      <JourneySection />
      <PartnersSection />
      <TestimonialsSection />
      <FaqPreviewSection />
      <FinalCtaSection />
    </>
  );
}
