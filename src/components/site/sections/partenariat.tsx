"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading, SectionShell } from "./section-heading";

interface PartnerLogo {
  name: string;
  role: string;
  logo: string;
}

/**
 * Institutional & business partners of COORIZON.
 * Logos are served from /public (partner-logo-*.jpg), optimised for the web.
 */
export const partnerLogos: PartnerLogo[] = [
  {
    name: "Unimpresa Sicilia Sénégal",
    role: "Réseau d'entreprises italiennes",
    logo: "/partner-logo-1.jpg",
  },
  {
    name: "ACA Sarl",
    role: "Partenaire commercial",
    logo: "/partner-logo-2.jpg",
  },
  {
    name: "Croix-Rouge Sénégalaise",
    role: "Partenaire humanitaire",
    logo: "/partner-logo-3.jpg",
  },
  {
    name: "CCJS — Conseil Consultatif des Jeunes du Sénégal",
    role: "Partenaire jeunesse & engagement",
    logo: "/partner-logo-4.jpg",
  },
  {
    name: "CFPAG Goudiry",
    role: "Centre de formation professionnelle agricole",
    logo: "/partner-logo-5.jpg",
  },
];

export function PartenariatSection() {
  return (
    <SectionShell className="bg-surface">
      <SectionHeading
        eyebrow="Partenariat"
        title="Ils nous font confiance"
        description="COORIZON s'engage aux côtés d'institutions et d'organisations pour accompagner les talents vers l'Italie."
      />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {partnerLogos.map((partner) => (
          <Card
            key={partner.name}
            className="group flex h-full flex-col items-center justify-center p-5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <CardContent className="flex w-full flex-1 flex-col items-center justify-center gap-3 p-0 text-center">
              <div className="flex h-24 w-full items-center justify-center">
                <Image
                  src={partner.logo}
                  alt={`Logo ${partner.name}`}
                  width={180}
                  height={110}
                  className="max-h-[96px] w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.04]"
                />
              </div>
              <div>
                <p className="text-xs font-semibold leading-snug text-navy">
                  {partner.name}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {partner.role}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}
