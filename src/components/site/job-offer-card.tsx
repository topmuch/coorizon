"use client";

import * as React from "react";
import { MapPin, Building2, Briefcase, Clock, Users, ArrowRight, Star } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobOffer } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function JobOfferCard({ offer, className }: { offer: JobOffer; className?: string }) {
  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden transition-all hover:border-brand/40 hover:shadow-lg",
        offer.featured && "border-brand/30",
        className
      )}
    >
      {offer.featured && (
        <div className="absolute right-0 top-0 flex items-center gap-1 bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <Star className="h-3 w-3 fill-current" /> À la une
        </div>
      )}
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-semibold leading-snug text-navy">{offer.title}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{offer.company}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="font-normal">
            <MapPin className="mr-1 h-3 w-3" /> {offer.city}, {offer.region}
          </Badge>
          <Badge variant="outline" className="font-normal">{offer.contract}</Badge>
          <Badge variant="outline" className="font-normal">Italien {offer.italianLevel}</Badge>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{offer.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" /> {offer.sector}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {offer.positions} poste{offer.positions > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Il y a {offer.postedDays} j
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-surface/50 px-5 py-3">
        <span className="text-sm font-semibold text-navy">{offer.salary}</span>
        <Button variant="ghost" size="sm" className="text-brand hover:bg-brand/10">
          Voir l'offre
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
