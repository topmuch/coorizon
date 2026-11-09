"use client";

import * as React from "react";
import { HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionShell } from "@/components/site/sections/section-heading";
import { useSiteRouter } from "@/lib/site-router";
import { faqItems } from "@/lib/site-data";

const categories: string[] = ["Toutes", ...Array.from(new Set(faqItems.map((i) => i.category)))];

export function FaqPage() {
  const { navigate } = useSiteRouter();
  const [active, setActive] = React.useState<string>("Toutes");

  const filtered =
    active === "Toutes" ? faqItems : faqItems.filter((i) => i.category === active);

  return (
    <>
      <PageHeader
        eyebrow="FAQ"
        title="Questions fréquentes"
        description="Les réponses aux questions les plus posées par les candidats, les entreprises et les partenaires de COORIZON."
      />

      <SectionShell>
        <div className="mx-auto max-w-4xl">
          {/* Filtre par catégorie */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => {
              const isActive = active === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActive(cat)}
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors"
                      : "rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Liste des questions */}
          <div className="mt-8">
            <Accordion type="single" collapsible className="space-y-3">
              {filtered.map((item, i) => (
                <Card
                  key={`${active}-${i}`}
                  className="overflow-hidden transition-colors hover:border-brand/30"
                >
                  <AccordionItem value={`item-${i}`} className="border-b-0">
                    <AccordionTrigger className="px-5 hover:no-underline">
                      <span className="flex flex-1 flex-col items-start gap-2 pr-4">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold uppercase tracking-wide"
                        >
                          {item.category}
                        </Badge>
                        <span className="text-left text-sm font-medium text-navy sm:text-base">
                          {item.question}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </Card>
              ))}
            </Accordion>
          </div>
        </div>
      </SectionShell>

      {/* CTA — pas de réponse trouvée */}
      <SectionShell className="pt-0">
        <div className="mx-auto max-w-4xl">
          <Card className="border-brand/20 bg-brand/5">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-navy">
                  Vous ne trouvez pas votre réponse ?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Notre équipe vous répond sous 24h ouvrées. Écrivez-nous et nous vous orienterons
                  vers la bonne ressource.
                </p>
              </div>
              <Button
                onClick={() => navigate("contact")}
                className="bg-brand hover:bg-brand/90"
              >
                Contacter l'équipe
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </SectionShell>
    </>
  );
}
