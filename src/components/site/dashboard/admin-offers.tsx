"use client";

import * as React from "react";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Eye,
  Send,
  Clock,
  Building2,
  Loader2,
  MapPin,
  Calendar,
  Users,
  FileText,
  Globe,
  Award,
  GraduationCap,
  HandCoins,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

/**
 * AdminOffers — back-office section for job offer validation & lifecycle
 * management (LOT 5 — Task 5-c).
 *
 * An admin can:
 *   • browse ALL offers across all companies and filter by status;
 *   • publish a PendingValidation or Draft offer (→ Published);
 *   • reject a PendingValidation offer (→ Draft, returned to the recruiter);
 *   • suspend a Published offer (→ Suspended);
 *   • re-publish a Suspended offer (→ Published);
 *   • close an offer (→ Closed);
 *   • open a detail dialog with the full offer content + company info +
 *     application count.
 *
 * Admins only manage status — offer content stays the recruiter's
 * responsibility. Every mutation goes through PUT /api/admin/offers/[id].
 */

// ── Local types (avoid importing @prisma/client on the client) ──────────────

type OfferStatus =
  | "Draft"
  | "PendingValidation"
  | "Published"
  | "Suspended"
  | "Closed";

interface OfferCompany {
  id: string;
  legalName: string;
  city: string | null;
  sector: string | null;
  region?: string | null;
  country?: string;
}

interface Offer {
  id: string;
  companyId: string;
  title: string;
  description: string;
  missions: string | null;
  sector: string;
  city: string;
  region: string | null;
  positions: number;
  contractType: string;
  salary: string | null;
  experienceRequired: string | null;
  italianLevel: string | null;
  qualifications: string | null;
  applicationDeadline: string | null;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  company?: OfferCompany;
  _count?: { applications: number };
}

interface OfferDetail extends Offer {
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface OffersListResponse {
  offers: Offer[];
  total: number;
  page: number;
  pageSize: number;
}

interface OfferDetailResponse {
  offer: OfferDetail;
}

// ── Status metadata ──────────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

function getStatusMeta(status: OfferStatus): StatusMeta {
  switch (status) {
    case "Draft":
      return {
        label: "Brouillon",
        className: "border-zinc-200 bg-zinc-200 text-zinc-700",
        icon: Clock,
      };
    case "PendingValidation":
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-100 text-amber-800",
        icon: Send,
      };
    case "Published":
      return {
        label: "Publiée",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      };
    case "Suspended":
      return {
        label: "Suspendue",
        className: "border-orange-200 bg-orange-100 text-orange-800",
        icon: Pause,
      };
    case "Closed":
      return {
        label: "Clôturée",
        className: "border-border bg-muted text-muted-foreground",
        icon: CheckCircle2,
      };
    default:
      return {
        label: status,
        className: "border-border bg-muted text-muted-foreground",
        icon: Clock,
      };
  }
}

// ── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "PendingValidation" | "Published" | "Suspended" | "Closed";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "Toutes",
  PendingValidation: "En attente",
  Published: "Publiées",
  Suspended: "Suspendues",
  Closed: "Clôturées",
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatDateFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Main component ───────────────────────────────────────────────────────────

export function AdminOffers() {
  const { toast } = useToast();

  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [changingId, setChangingId] = React.useState<string | null>(null);

  // Detail dialog state
  const [detailOffer, setDetailOffer] = React.useState<OfferDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Suspend confirmation state
  const [suspendOffer, setSuspendOffer] = React.useState<Offer | null>(null);
  const [suspending, setSuspending] = React.useState(false);

  // Close confirmation state
  const [closeOffer, setCloseOffer] = React.useState<Offer | null>(null);
  const [closing, setClosing] = React.useState(false);

  // ── Fetch offers list ───────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/offers", window.location.origin);
      if (tab !== "all") url.searchParams.set("status", tab);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des offres.");
      }
      const data = (await res.json()) as OffersListResponse;
      setOffers(data.offers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Update offer status (PUT) ───────────────────────────────────────
  const updateStatus = async (offer: Offer, status: OfferStatus) => {
    setChangingId(offer.id);
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la mise à jour du statut.");
      }
      toast({
        title: "Statut mis à jour",
        description: `L'offre « ${offer.title} » est maintenant « ${getStatusMeta(
          status
        ).label.toLowerCase()} ».`,
      });
      void load();
      if (detailOffer?.id === offer.id) {
        void refreshDetail(offer.id);
      }
    } catch (e) {
      toast({
        title: "Action impossible",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setChangingId(null);
    }
  };

  // ── Open detail dialog ───────────────────────────────────────────────
  const refreshDetail = React.useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/offers/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement de l'offre.");
      }
      const data = (await res.json()) as OfferDetailResponse;
      setDetailOffer(data.offer);
    } catch (e) {
      toast({
        title: "Détails indisponibles",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  const openDetail = (offer: Offer) => {
    setDetailOpen(true);
    void refreshDetail(offer.id);
  };

  // ── Suspend handler ──────────────────────────────────────────────────
  const handleSuspend = async () => {
    if (!suspendOffer) return;
    setSuspending(true);
    await updateStatus(suspendOffer, "Suspended");
    setSuspending(false);
    setSuspendOffer(null);
  };

  // ── Close handler ────────────────────────────────────────────────────
  const handleClose = async () => {
    if (!closeOffer) return;
    setClosing(true);
    await updateStatus(closeOffer, "Closed");
    setClosing(false);
    setCloseOffer(null);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy">Offres d'emploi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Validez et publiez les offres soumises par les entreprises, suspendez
          ou clôturez les offres actives. L'édition du contenu reste du
          ressort du recruteur.
        </p>
      </header>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-4 w-1/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy">
              Aucune offre dans cette catégorie
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Les offres soumises par les recruteurs pour validation
              apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as FilterTab)}
            className="w-full"
          >
            <TabsList className="flex w-full max-w-2xl flex-wrap">
              {(Object.keys(TAB_LABELS) as FilterTab[]).map((t) => (
                <TabsTrigger key={t} value={t} className="flex-1">
                  {TAB_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Desktop table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Titre</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Secteur</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Candidatures</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <OfferTableRow
                      key={offer.id}
                      offer={offer}
                      changing={changingId === offer.id}
                      onPublish={() => updateStatus(offer, "Published")}
                      onReject={() => updateStatus(offer, "Draft")}
                      onSuspend={() => setSuspendOffer(offer)}
                      onRepublish={() => updateStatus(offer, "Published")}
                      onClose={() => setCloseOffer(offer)}
                      onView={() => openDetail(offer)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-4 lg:hidden">
            {offers.map((offer) => (
              <li key={offer.id}>
                <OfferCardMobile
                  offer={offer}
                  changing={changingId === offer.id}
                  onPublish={() => updateStatus(offer, "Published")}
                  onReject={() => updateStatus(offer, "Draft")}
                  onSuspend={() => setSuspendOffer(offer)}
                  onRepublish={() => updateStatus(offer, "Published")}
                  onClose={() => setCloseOffer(offer)}
                  onView={() => openDetail(offer)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Detail dialog */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailOffer(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <Briefcase className="h-5 w-5 text-brand" />
              {detailOffer?.title ?? "Chargement…"}
            </DialogTitle>
            <DialogDescription>
              Détails de l'offre et de l'entreprise associée.
            </DialogDescription>
          </DialogHeader>

          {detailLoading && !detailOffer ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : detailOffer ? (
            <OfferDetailBody offer={detailOffer} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Suspend confirm */}
      <AlertDialog
        open={!!suspendOffer}
        onOpenChange={(open) => {
          if (!open && !suspending) {
            setSuspendOffer(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-navy">
              <Pause className="h-5 w-5 text-italian-red" />
              Suspendre cette offre ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendOffer && (
                <>
                  L'offre « <strong>{suspendOffer.title}</strong> » sera
                  suspendue et n'apparaîtra plus dans la liste publique. Les
                  candidatures déjà reçues sont conservées. L'action est
                  réversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSuspend();
              }}
              disabled={suspending}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {suspending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suspension…
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Suspendre
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close confirm */}
      <AlertDialog
        open={!!closeOffer}
        onOpenChange={(open) => {
          if (!open && !closing) {
            setCloseOffer(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-navy">
              <XCircle className="h-5 w-5 text-italian-red" />
              Clôturer cette offre ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {closeOffer && (
                <>
                  L'offre « <strong>{closeOffer.title}</strong> » sera
                  clôturée et n'acceptera plus de nouvelles candidatures. Les
                  candidatures en cours restent accessibles au recruteur.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleClose();
              }}
              disabled={closing}
            >
              {closing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Clôture…
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Clôturer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OfferStatus }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <Badge className={`px-2.5 py-1 text-xs font-medium ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

// ── Action buttons (shared between table & card) ─────────────────────────────

interface OfferActionsProps {
  offer: Offer;
  changing: boolean;
  onPublish: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onRepublish: () => void;
  onClose: () => void;
  onView: () => void;
}

function OfferActions({
  offer,
  changing,
  onPublish,
  onReject,
  onSuspend,
  onRepublish,
  onClose,
  onView,
}: OfferActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onView}
        title="Voir les détails"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="lg:sr-only">Détails</span>
      </Button>

      {(offer.status === "PendingValidation" || offer.status === "Draft") && (
        <Button
          size="sm"
          onClick={onPublish}
          disabled={changing}
          className="bg-brand-green text-white hover:bg-brand-green/90"
          title="Publier l'offre"
        >
          {changing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Publier
        </Button>
      )}

      {offer.status === "PendingValidation" && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={changing}
          className="border-italian-red/30 text-italian-red hover:bg-italian-red/10 hover:text-italian-red"
          title="Repasser en brouillon"
        >
          <XCircle className="h-3.5 w-3.5" />
          Rejeter
        </Button>
      )}

      {offer.status === "Published" && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSuspend}
          disabled={changing}
          title="Suspendre l'offre"
        >
          {changing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
          Suspendre
        </Button>
      )}

      {offer.status === "Suspended" && (
        <Button
          size="sm"
          onClick={onRepublish}
          disabled={changing}
          className="bg-brand-green text-white hover:bg-brand-green/90"
          title="Republier l'offre"
        >
          {changing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Republier
        </Button>
      )}

      {(offer.status === "Published" ||
        offer.status === "Suspended" ||
        offer.status === "PendingValidation") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={changing}
          className="text-muted-foreground hover:text-navy"
          title="Clôturer l'offre"
        >
          <XCircle className="h-3.5 w-3.5" />
          <span className="lg:sr-only">Clôturer</span>
        </Button>
      )}
    </div>
  );
}

// ── Desktop table row ────────────────────────────────────────────────────────

function OfferTableRow(props: OfferActionsProps) {
  const { offer } = props;
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-navy">{offer.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5">
                {offer.contractType}
              </span>
              {offer.positions > 1 && <span>{offer.positions} postes</span>}
              {offer.italianLevel && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  IT {offer.italianLevel}
                </span>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-navy">
        {offer.company?.legalName ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {offer.sector}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {offer.city}
        </span>
      </TableCell>
      <TableCell>
        <StatusBadge status={offer.status} />
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex items-center gap-1 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {offer._count?.applications ?? 0}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateFr(offer.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <OfferActions {...props} />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Mobile card ──────────────────────────────────────────────────────────────

function OfferCardMobile(props: OfferActionsProps) {
  const { offer } = props;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-navy">{offer.title}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {offer.company?.legalName ?? "Entreprise"}
            </p>
          </div>
          <StatusBadge status={offer.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">{offer.sector}</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {offer.city}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5">
            {offer.contractType}
          </span>
          {offer.positions > 1 && <span>{offer.positions} postes</span>}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {offer._count?.applications ?? 0} candidature
            {(offer._count?.applications ?? 0) > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateFr(offer.createdAt)}
          </span>
        </div>

        <div className="border-t pt-3">
          <OfferActions {...props} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Offer detail body (dialog content) ───────────────────────────────────────

function OfferDetailBody({ offer }: { offer: OfferDetail }) {
  const location = [offer.city, offer.region].filter(Boolean).join(", ");
  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={offer.status} />
        <span className="text-xs text-muted-foreground">
          Créée le {formatDateFr(offer.createdAt)}
        </span>
        {offer.applicationDeadline && (
          <span className="text-xs text-muted-foreground">
            · Candidatures jusqu'au {formatDateFr(offer.applicationDeadline)}
          </span>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DetailStat
          icon={Users}
          label="Candidatures"
          value={String(offer._count?.applications ?? 0)}
        />
        <DetailStat
          icon={Briefcase}
          label="Postes ouverts"
          value={String(offer.positions)}
        />
        <DetailStat
          icon={Building2}
          label="Entreprise"
          value={offer.company?.legalName ?? "—"}
        />
      </div>

      <Separator />

      {/* Description */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy">Description</h4>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {offer.description}
        </p>
      </section>

      {offer.missions && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-navy">Missions</h4>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {offer.missions}
          </p>
        </section>
      )}

      <Separator />

      {/* Job info */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy">
          Caractéristiques du poste
        </h4>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <DetailField icon={Briefcase} label="Secteur" value={offer.sector} />
          <DetailField icon={MapPin} label="Localisation" value={location || "—"} />
          <DetailField
            icon={FileText}
            label="Type de contrat"
            value={offer.contractType}
          />
          <DetailField
            icon={Users}
            label="Nombre de postes"
            value={String(offer.positions)}
          />
          <DetailField
            icon={HandCoins}
            label="Salaire"
            value={offer.salary}
          />
          <DetailField
            icon={Award}
            label="Expérience requise"
            value={offer.experienceRequired}
          />
          <DetailField
            icon={GraduationCap}
            label="Niveau d'italien"
            value={offer.italianLevel ?? "Non spécifié"}
          />
          <DetailField
            icon={FileText}
            label="Qualifications"
            value={offer.qualifications}
          />
          <DetailField
            icon={Calendar}
            label="Date limite de candidature"
            value={offer.applicationDeadline ? formatDateFr(offer.applicationDeadline) : "—"}
          />
        </dl>
      </section>

      <Separator />

      {/* Company */}
      {offer.company && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Building2 className="h-4 w-4" />
            Entreprise
          </h4>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <DetailField
              icon={Building2}
              label="Raison sociale"
              value={offer.company.legalName}
            />
            <DetailField
              icon={Briefcase}
              label="Secteur"
              value={offer.company.sector}
            />
            <DetailField
              icon={MapPin}
              label="Ville"
              value={offer.company.city}
            />
            <DetailField
              icon={Globe}
              label="Pays"
              value={offer.company.country ?? "Italie"}
            />
          </dl>
        </section>
      )}

      {/* Created by */}
      {offer.createdBy && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Users className="h-4 w-4" />
            Créée par
          </h4>
          <p className="text-sm text-muted-foreground">
            {[offer.createdBy.firstName, offer.createdBy.lastName]
              .filter(Boolean)
              .join(" ") || offer.createdBy.email}{" "}
            ({offer.createdBy.email})
          </p>
        </section>
      )}
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate text-xl font-semibold text-navy">
        {value}
      </div>
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="whitespace-pre-wrap break-words text-sm text-navy">
          {value || "—"}
        </dd>
      </div>
    </div>
  );
}
