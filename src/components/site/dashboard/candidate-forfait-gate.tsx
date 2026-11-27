"use client";

import * as React from "react";
import {
  Lock,
  ShoppingCart,
  Clock,
  Check,
  Receipt,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format-currency";
import { useCandidateAccess } from "@/lib/candidate-access";

// ─── Static copy ───────────────────────────────────────────────────────────

const UNLOCK_ITEMS = [
  "Formations en italien",
  "Examens et certificats",
  "Offres d'emploi publiées",
  "Candidatures aux offres",
] as const;

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Gates the "jobs" and "training" sections of the candidate space: candidates
 * without the validated formation forfait see a purchase screen instead of
 * the gated content. Once the administration validates the forfait, children
 * are rendered normally.
 */
export function ForfaitGate({ children }: { children: React.ReactNode }) {
  const { access, loading, refresh, buyForfait } = useCandidateAccess();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  const handleBuy = async () => {
    setSubmitting(true);
    const result = await buyForfait();
    setSubmitting(false);
    if (result.ok) {
      toast({
        title: "Demande envoyée",
        description:
          "Votre demande est en attente de validation par l'administration.",
      });
    } else {
      toast({
        title: "Erreur",
        description:
          result.error ?? "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Access status is being fetched — same spinner style as the dashboard.
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  // Full access granted — the section renders normally.
  if (access?.hasFormationAccess) {
    return <>{children}</>;
  }

  // Access status unavailable (network error, expired session…) — graceful
  // fallback with a retry action instead of a broken purchase screen.
  if (!access) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Lock className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-2xl font-bold text-navy">
              Accès limité — Forfait requis
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Votre compte candidat est actif mais l&rsquo;accès complet est
              réservé aux titulaires du forfait formation. Nous n&rsquo;avons
              pas pu vérifier votre statut d&rsquo;accès pour le moment.
            </p>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const price = formatAmount(access.forfait.amount, access.forfait.currency);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardContent className="space-y-6 p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Lock className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-2xl font-bold text-navy">
              Accès limité — Forfait requis
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Votre compte candidat est actif mais l&rsquo;accès complet est
              réservé aux titulaires du forfait formation. Acquérez le forfait
              pour débloquer vos formations et les offres d&rsquo;emploi.
            </p>
          </div>

          {/* Price block */}
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center">
            <p className="font-semibold text-navy">{access.forfait.name}</p>
            <p className="text-3xl font-bold text-brand">{price}</p>
            {access.forfait.durationLabel ? (
              <Badge variant="secondary">{access.forfait.durationLabel}</Badge>
            ) : null}
          </div>

          {/* Unlocked with the forfait */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-navy">
              Débloqué avec le forfait
            </h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {UNLOCK_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check
                    className="h-4 w-4 shrink-0 text-brand-green"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA zone */}
          <div
            className={cn(
              "flex flex-col items-center gap-3 border-t border-border pt-6",
              submitting && "opacity-80"
            )}
          >
            {access.pendingRequest ? (
              <>
                <Alert className="border-amber-300 bg-amber-50 text-amber-800 [&>svg]:text-amber-600">
                  <Clock className="h-4 w-4" aria-hidden />
                  <AlertTitle>Demande en cours de validation</AlertTitle>
                  <AlertDescription>
                    Votre demande d&rsquo;acquisition est en attente de
                    validation par l&rsquo;administration COORIZON.
                  </AlertDescription>
                </Alert>
                <Button className="w-full bg-brand hover:bg-brand/90 sm:w-auto" disabled>
                  <Clock className="mr-2 h-4 w-4" aria-hidden />
                  En attente de validation…
                </Button>
              </>
            ) : access.paidRequest ? (
              <>
                <Alert className="border-border bg-muted/40">
                  <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <AlertTitle className="text-navy">Paiement enregistré</AlertTitle>
                  <AlertDescription>
                    Un paiement pour ce forfait a été enregistré (facture{" "}
                    {access.paidRequest.invoiceNumber}). L&rsquo;activation de
                    votre accès est en cours de vérification par
                    l&rsquo;administration COORIZON.
                  </AlertDescription>
                </Alert>
                <Button className="w-full bg-brand hover:bg-brand/90 sm:w-auto" disabled>
                  <Clock className="mr-2 h-4 w-4" aria-hidden />
                  Activation en cours de vérification…
                </Button>
              </>
            ) : (
              <Button
                className="w-full bg-brand hover:bg-brand/90 sm:w-auto"
                onClick={() => void handleBuy()}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ShoppingCart className="mr-2 h-4 w-4" aria-hidden />
                )}
                Acheter le forfait — {price}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
