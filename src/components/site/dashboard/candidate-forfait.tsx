"use client";

import * as React from "react";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Clock,
  GraduationCap,
  Loader2,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format-currency";
import { useCandidateAccess, type CandidateAccessState } from "@/lib/candidate-access";
import { useSiteRouter } from "@/lib/site-router";

// ─── Shared copy ───────────────────────────────────────────────────────────

const UNLOCK_ITEMS = [
  "Formations en italien",
  "Examens et certificats",
  "Offres d'emploi publiées",
  "Candidatures aux offres",
  "Mon dossier administratif",
  "Médiathèque et vidéos",
] as const;

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PriceBlock({ forfait }: { forfait: CandidateAccessState["forfait"] }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 text-center">
      <Sparkles
        className="absolute -right-3 -top-3 h-16 w-16 text-brand/10"
        aria-hidden
      />
      <p className="text-sm font-semibold text-navy dark:text-foreground">{forfait.name}</p>
      <p className="mt-1 text-4xl font-bold tracking-tight text-brand">
        {formatAmount(forfait.amount, forfait.currency)}
      </p>
      {forfait.durationLabel ? (
        <Badge variant="secondary" className="mt-2">
          {forfait.durationLabel}
        </Badge>
      ) : null}
      {forfait.description ? (
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
          {forfait.description}
        </p>
      ) : null}
    </div>
  );
}

function UnlockedList() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-navy dark:text-foreground">
        Débloqué avec le forfait
      </h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {UNLOCK_ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Check className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Paid state ────────────────────────────────────────────────────────────

function PaidForfait({ access }: { access: CandidateAccessState }) {
  const { navigate } = useSiteRouter();
  const price = formatAmount(access.forfait.amount, access.forfait.currency);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Card className="border-brand-green/30">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <BadgeCheck className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h2 className="text-2xl font-bold text-navy dark:text-foreground">
                  Forfait activé
                </h2>
                <Badge className="bg-brand-green text-white hover:bg-brand-green">
                  Payé
                </Badge>
              </div>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Votre forfait formation a été validé par l&rsquo;administration
                COORIZON. Vous avez accès à l&rsquo;ensemble de votre espace
                candidat.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Montant
              </p>
              <p className="mt-1 text-sm font-bold text-navy dark:text-foreground">{price}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Facture
              </p>
              <p className="mt-1 text-sm font-bold text-navy dark:text-foreground">
                {access.paidRequest?.invoiceNumber ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Validé le
              </p>
              <p className="mt-1 text-sm font-bold text-navy dark:text-foreground">
                {formatDate(access.paidRequest?.paidAt)}
              </p>
            </div>
          </div>

          <UnlockedList />

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-center">
            <Button
              className="bg-brand hover:bg-brand/90"
              onClick={() => navigate("dashboard", { section: "training" })}
            >
              <GraduationCap className="mr-2 h-4 w-4" aria-hidden />
              Accéder à mes formations
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("dashboard", { section: "payments" })}
            >
              <Receipt className="mr-2 h-4 w-4" aria-hidden />
              Voir mes paiements
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Buy / pending state ───────────────────────────────────────────────────

function PurchaseForfait({
  access,
  submitting,
  onBuy,
}: {
  access: CandidateAccessState;
  submitting: boolean;
  onBuy: () => void;
}) {
  const price = formatAmount(access.forfait.amount, access.forfait.currency);
  const pending = access.pendingRequest;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardContent className="space-y-6 p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ShoppingCart className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-navy dark:text-foreground">
                Forfait Formation
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Acquérez le forfait pour débloquer l&rsquo;ensemble de votre
                espace candidat : formations, examens, offres d&rsquo;emploi et
                bien plus.
              </p>
            </div>
          </div>

          {/* Price block */}
          <PriceBlock forfait={access.forfait} />

          {/* Unlocked with the forfait */}
          <UnlockedList />

          {/* CTA zone */}
          <div
            className={cn(
              "flex flex-col items-center gap-3 border-t border-border pt-6",
              submitting && "opacity-80"
            )}
          >
            {pending ? (
              <>
                <Alert className="border-amber-300 bg-amber-50 text-amber-800 [&>svg]:text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  <Clock className="h-4 w-4" aria-hidden />
                  <AlertTitle>Demande en attente de validation admin</AlertTitle>
                  <AlertDescription>
                    Votre demande d&rsquo;acquisition de{" "}
                    {formatAmount(pending.amount, pending.currency)} a été
                    enregistrée le {formatDate(pending.createdAt)}. Elle est en
                    attente de validation par l&rsquo;administration COORIZON.
                    Dès qu&rsquo;elle sera validée, votre accès complet sera
                    activé automatiquement.
                  </AlertDescription>
                </Alert>
                <Button className="w-full bg-brand hover:bg-brand/90 sm:w-auto" disabled>
                  <Clock className="mr-2 h-4 w-4" aria-hidden />
                  En attente de validation…
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-xs text-muted-foreground">
                  Après l&rsquo;achat, votre demande est mise en attente de
                  validation par l&rsquo;administration COORIZON.
                </p>
                <Button
                  className="w-full bg-brand hover:bg-brand/90 sm:w-auto"
                  onClick={onBuy}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Acheter le forfait — {price}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

/**
 * Content of the candidate "Forfait" tab: shows the formation forfait
 * (380 000 FCFA by default) with the purchase action. After purchase the
 * request is "en attente de validation admin"; once the administration
 * validates it the tab shows the activated forfait.
 */
export function CandidateForfait() {
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

  if (loading && !access) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!access) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Receipt className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-2xl font-bold text-navy dark:text-foreground">
              Forfait Formation
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Nous n&rsquo;avons pas pu vérifier votre statut d&rsquo;accès
              pour le moment.
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

  if (access.hasFormationAccess) {
    return <PaidForfait access={access} />;
  }

  return (
    <PurchaseForfait access={access} submitting={submitting} onBuy={() => void handleBuy()} />
  );
}
