"use client";

import { HeroSection } from "../sections/hero";
import {
  StatsBand,
  SectorsSection,
  TrainingSection,
  JourneySection,
  TestimonialsSection,
  FaqPreviewSection,
  FinalCtaSection,
  PlusCoorizonSection,
} from "../sections/home-sections";
import { PartenariatSection } from "../sections/partenariat";

export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBand />
      <JourneySection />
      <TrainingSection />
      <SectorsSection />
      <TestimonialsSection />
      <FaqPreviewSection />
      <PlusCoorizonSection />
      <PartenariatSection />
      <FinalCtaSection />
    </>
  );
}
