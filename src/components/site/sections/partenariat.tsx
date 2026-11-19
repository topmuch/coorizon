"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading, SectionShell } from "./section-heading";

export function PartenariatSection() {
  return (
    <SectionShell className="bg-surface">
      <SectionHeading
        eyebrow="Partenariat"
        title="Ils nous font confiance"
        description="COORIZON s'engage aux côtés d'institutions et d'organisations pour accompagner les talents vers l'Italie."
      />
      <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
        <Card className="flex items-center justify-center p-8 transition-shadow hover:shadow-md" style={{ width: "240px", height: "140px" }}>
          <img
            src="/partner-logo-1.jpg"
            alt="Partenaire 1"
            className="max-h-full max-w-full object-contain"
            style={{ maxHeight: "100px" }}
          />
        </Card>
        <Card className="flex items-center justify-center p-8 transition-shadow hover:shadow-md" style={{ width: "240px", height: "140px" }}>
          <img
            src="/partner-logo-2.jpg"
            alt="Partenaire 2"
            className="max-h-full max-w-full object-contain"
            style={{ maxHeight: "100px" }}
          />
        </Card>
      </div>
    </SectionShell>
  );
}
