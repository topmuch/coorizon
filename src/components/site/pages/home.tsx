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
} from "../sections/home-sections";
import { PartenariatSection } from "../sections/partenariat";

export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBand />
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
