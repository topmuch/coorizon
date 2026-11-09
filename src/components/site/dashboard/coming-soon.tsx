"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoonCard({ lot }: { lot: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Clock className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-navy">Bientôt disponible</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Cette section sera pleinement opérationnelle dans le <strong>{lot}</strong>.
          En attendant, les autres modules de votre espace candidat sont disponibles via le menu.
        </p>
      </CardContent>
    </Card>
  );
}
