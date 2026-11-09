"use client";

import * as React from "react";
import {
  Plus,
  Briefcase,
  Edit,
  Archive,
  Send,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSiteRouter } from "@/lib/site-router";

/**
 * RecruiterOffers — "Mes offres" dashboard section (LOT 4 — Task 4-c).
 *
 * A recruiter can:
 *   • view all of their company's offers (excluding archived ones);
 *   • create a new offer (Draft or PendingValidation — self-publishing is
 *     rejected, publication is admin-controlled in LOT 5);
 *   • edit an offer's content;
 *   • change an offer's status (Suspendre / Reprendre / Clôturer / Soumettre /
 *     Repasser en brouillon — depending on the current status);
 *   • archive an offer (soft delete);
 *   • jump to the applications of a specific offer.
 *
 * All mutations go through /api/recruiter/offers* which scope every query to
 * the authenticated recruiter's own company.
 */

// ── Types (avoid importing @prisma/client on the client) ─────────────────────

type OfferStatus =
  | "Draft"
  | "PendingValidation"
  | "Published"
  | "Suspended"
  | "Closed"
  | "Archived";

interface Offer {
  id: string;
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
  _count?: { applications: number };
}

interface OffersResponse {
  offers: Offer[];
}

interface OfferResponse {
  offer: Offer;
}

// ── Static data ──────────────────────────────────────────────────────────────

const SECTORS: string[] = [
  "Hôtellerie & Restauration",
  "Agriculture & Agroalimentaire",
  "BTP & Construction",
  "Soins & Santé",
  "Industrie & Mécanique",
  "Logistique & Transport",
  "Tech & Numérique",
  "Commerce & Services",
];

const CONTRACT_TYPES: { value: string; label: string }[] = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Saisonnier", label: "Saisonnier" },
  { value: "Intérim", label: "Intérim" },
  { value: "Apprentissage", label: "Apprentissage" },
  { value: "Autre", label: "Autre" },
];

const ITALIAN_LEVELS: { value: string; label: string }[] = [
  { value: "none", label: "Aucun" },
  { value: "A1", label: "A1 — Débutant" },
  { value: "A2", label: "A2 — Élémentaire" },
  { value: "B1", label: "B1 — Intermédiaire" },
  { value: "B2", label: "B2 — Avancé" },
  { value: "C1", label: "C1 — Autonome" },
  { value: "C2", label: "C2 — Maîtrise" },
];

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
        className: "bg-muted text-muted-foreground",
        icon: Clock,
      };
    case "PendingValidation":
      return {
        label: "En attente de validation",
        className: "bg-amber-100 text-amber-800",
        icon: Send,
      };
    case "Published":
      return {
        label: "Publiée",
        className: "bg-brand-green/15 text-brand-green",
        icon: CheckCircle2,
      };
    case "Suspended":
      return {
        label: "Suspendue",
        className: "bg-orange-100 text-orange-800",
        icon: Pause,
      };
    case "Closed":
      return {
        label: "Clôturée",
        className: "bg-zinc-200 text-zinc-700",
        icon: CheckCircle2,
      };
    case "Archived":
      return {
        label: "Archivée",
        className: "bg-muted text-muted-foreground",
        icon: Archive,
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground",
        icon: Clock,
      };
  }
}

// ── Status change actions ────────────────────────────────────────────────────

interface StatusAction {
  label: string;
  newStatus: "Draft" | "PendingValidation" | "Suspended" | "Closed";
  icon: LucideIcon;
  variant: "outline" | "secondary" | "ghost";
}

function getStatusActions(status: OfferStatus): StatusAction[] {
  switch (status) {
    case "Draft":
      return [
        {
          label: "Soumettre",
          newStatus: "PendingValidation",
          icon: Send,
          variant: "secondary",
        },
      ];
    case "PendingValidation":
      return [
        {
          label: "Repasser en brouillon",
          newStatus: "Draft",
          icon: Edit,
          variant: "ghost",
        },
      ];
    case "Published":
      return [
        {
          label: "Suspendre",
          newStatus: "Suspended",
          icon: Pause,
          variant: "outline",
        },
        {
          label: "Clôturer",
          newStatus: "Closed",
          icon: CheckCircle2,
          variant: "outline",
        },
      ];
    case "Suspended":
      return [
        {
          label: "Reprendre",
          newStatus: "PendingValidation",
          icon: Play,
          variant: "secondary",
        },
        {
          label: "Clôturer",
          newStatus: "Closed",
          icon: CheckCircle2,
          variant: "outline",
        },
      ];
    case "Closed":
      return [
        {
          label: "Reprendre",
          newStatus: "PendingValidation",
          icon: Play,
          variant: "secondary",
        },
      ];
    default:
      return [];
  }
}

// ── Form types ───────────────────────────────────────────────────────────────

interface OfferFormState {
  title: string;
  description: string;
  missions: string;
  sector: string;
  city: string;
  region: string;
  positions: string;
  contractType: string;
  salary: string;
  experienceRequired: string;
  italianLevel: string;
  qualifications: string;
  applicationDeadline: string;
}

const EMPTY_FORM: OfferFormState = {
  title: "",
  description: "",
  missions: "",
  sector: "",
  city: "",
  region: "",
  positions: "1",
  contractType: "CDI",
  salary: "",
  experienceRequired: "",
  italianLevel: "none",
  qualifications: "",
  applicationDeadline: "",
};

function offerToForm(offer: Offer): OfferFormState {
  return {
    title: offer.title,
    description: offer.description,
    missions: offer.missions ?? "",
    sector: offer.sector,
    city: offer.city,
    region: offer.region ?? "",
    positions: String(offer.positions),
    contractType: offer.contractType,
    salary: offer.salary ?? "",
    experienceRequired: offer.experienceRequired ?? "",
    italianLevel: offer.italianLevel ?? "none",
    qualifications: offer.qualifications ?? "",
    applicationDeadline: offer.applicationDeadline
      ? offer.applicationDeadline.split("T")[0]
      : "",
  };
}

function validateForm(form: OfferFormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = "L'intitulé du poste est obligatoire.";
  if (!form.description.trim())
    e.description = "La description est obligatoire.";
  if (!form.sector) e.sector = "Le secteur est obligatoire.";
  if (!form.city.trim()) e.city = "La ville est obligatoire.";
  return e;
}

function buildPayload(
  form: OfferFormState,
  status?: "Draft" | "PendingValidation"
): Record<string, unknown> {
  const positions = parseInt(form.positions, 10);
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim(),
    missions: form.missions.trim() || null,
    sector: form.sector,
    city: form.city.trim(),
    region: form.region.trim() || null,
    positions: Number.isFinite(positions) && positions > 0 ? positions : 1,
    contractType: form.contractType,
    salary: form.salary.trim() || null,
    experienceRequired: form.experienceRequired.trim() || null,
    italianLevel: form.italianLevel === "none" ? null : form.italianLevel,
    qualifications: form.qualifications.trim() || null,
    applicationDeadline: form.applicationDeadline
      ? new Date(`${form.applicationDeadline}T00:00:00`).toISOString()
      : null,
  };
  if (status) {
    payload.status = status;
  }
  return payload;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "draft" | "pending" | "published" | "closed";

const TAB_FILTERS: Record<FilterTab, (o: Offer) => boolean> = {
  all: () => true,
  draft: (o) => o.status === "Draft",
  pending: (o) => o.status === "PendingValidation",
  published: (o) => o.status === "Published" || o.status === "Suspended",
  closed: (o) => o.status === "Closed",
};

// ─── Main component ──────────────────────────────────────────────────────────

export function RecruiterOffers() {
  const { navigate } = useSiteRouter();
  const { toast } = useToast();

  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<FilterTab>("all");

  // Create / edit dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingOffer, setEditingOffer] = React.useState<Offer | null>(null);

  // Archive confirmation state
  const [archivingOffer, setArchivingOffer] = React.useState<Offer | null>(null);
  const [archiving, setArchiving] = React.useState(false);

  // Status change state (optimistic UI feedback)
  const [changingStatusId, setChangingStatusId] = React.useState<string | null>(
    null
  );

  // ── Fetch offers on mount ──────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recruiter/offers", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error || "Échec du chargement de vos offres."
        );
      }
      const data = (await res.json()) as OffersResponse;
      setOffers(data.offers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Open create dialog ─────────────────────────────────────────────────
  const openCreate = () => {
    setEditingOffer(null);
    setFormOpen(true);
  };

  // ── Open edit dialog ───────────────────────────────────────────────────
  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormOpen(true);
  };

  // ── Form success handler ───────────────────────────────────────────────
  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingOffer(null);
    void load();
  };

  // ── Status change ──────────────────────────────────────────────────────
  const handleStatusChange = async (
    offer: Offer,
    action: StatusAction
  ) => {
    setChangingStatusId(offer.id);
    try {
      const res = await fetch(`/api/recruiter/offers/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: action.newStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de la mise à jour du statut.");
      }
      toast({
        title: "Statut mis à jour",
        description: `L'offre « ${offer.title} » est maintenant « ${
          getStatusMeta(action.newStatus).label
        } ».`,
      });
      void load();
    } catch (e) {
      toast({
        title: "Mise à jour impossible",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setChangingStatusId(null);
    }
  };

  // ── Archive offer ──────────────────────────────────────────────────────
  const handleArchive = async () => {
    if (!archivingOffer) return;
    setArchiving(true);
    try {
      const res = await fetch(
        `/api/recruiter/offers/${archivingOffer.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de l'archivage.");
      }
      toast({
        title: "Offre archivée",
        description: `L'offre « ${archivingOffer.title} » a été archivée.`,
      });
      setArchivingOffer(null);
      void load();
    } catch (e) {
      toast({
        title: "Archivage impossible",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
    }
  };

  // ── Navigate to applications with offer filter ────────────────────────
  const goToApplications = (offer: Offer) => {
    navigate("dashboard", { section: "applications", offer: offer.id });
  };

  // ── Counts for tabs ────────────────────────────────────────────────────
  const counts = React.useMemo(() => {
    return {
      all: offers.length,
      draft: offers.filter(TAB_FILTERS.draft).length,
      pending: offers.filter(TAB_FILTERS.pending).length,
      published: offers.filter(TAB_FILTERS.published).length,
      closed: offers.filter(TAB_FILTERS.closed).length,
    };
  }, [offers]);

  const visibleOffers = React.useMemo(() => {
    return offers.filter(TAB_FILTERS[tab]);
  }, [offers, tab]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Mes offres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez et gérez les offres d'emploi de votre entreprise. La
            publication est validée par l'administration COORIZON.
          </p>
        </div>
        <Button
          className="bg-brand text-white hover:bg-brand/90"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Nouvelle offre
        </Button>
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
          {Array.from({ length: 4 }).map((_, i) => (
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
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : offers.length === 0 ? (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy">
              Aucune offre pour le moment
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Créez votre première offre d'emploi pour recevoir des
              candidatures. Vous pourrez l'enregistrer comme brouillon ou la
              soumettre pour validation par l'administration.
            </p>
            <Button
              className="mt-4 bg-brand text-white hover:bg-brand/90"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Créer une offre
            </Button>
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
              <TabsTrigger value="all" className="flex-1">
                Toutes ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="draft" className="flex-1">
                Brouillons ({counts.draft})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">
                En attente ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="published" className="flex-1">
                Publiées ({counts.published})
              </TabsTrigger>
              <TabsTrigger value="closed" className="flex-1">
                Clôturées ({counts.closed})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {visibleOffers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune offre dans cette catégorie.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <Card className="hidden lg:block">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[220px]">Offre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-center">Candidatures</TableHead>
                        <TableHead>Créée le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleOffers.map((offer) => (
                        <OfferTableRow
                          key={offer.id}
                          offer={offer}
                          changingStatus={changingStatusId === offer.id}
                          onEdit={() => openEdit(offer)}
                          onArchive={() => setArchivingOffer(offer)}
                          onStatusChange={(action) =>
                            handleStatusChange(offer, action)
                          }
                          onViewApplications={() => goToApplications(offer)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Mobile cards */}
              <ul className="space-y-4 lg:hidden">
                {visibleOffers.map((offer) => (
                  <li key={offer.id}>
                    <OfferCardMobile
                      offer={offer}
                      changingStatus={changingStatusId === offer.id}
                      onEdit={() => openEdit(offer)}
                      onArchive={() => setArchivingOffer(offer)}
                      onStatusChange={(action) =>
                        handleStatusChange(offer, action)
                      }
                      onViewApplications={() => goToApplications(offer)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {/* Create / edit dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingOffer(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto custom-scrollbar">
          <OfferForm
            offer={editingOffer}
            onClose={() => {
              setFormOpen(false);
              setEditingOffer(null);
            }}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog
        open={!!archivingOffer}
        onOpenChange={(open) => {
          if (!open && !archiving) {
            setArchivingOffer(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver cette offre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {archivingOffer && (archivingOffer._count?.applications ?? 0) > 0 ? (
                <>
                  L'offre « {archivingOffer.title} » compte{" "}
                  {archivingOffer._count?.applications} candidature
                  {(archivingOffer._count?.applications ?? 0) > 1 ? "s" : ""}. Elle
                  sera archivée (masquée de votre liste active) mais les
                  candidatures seront conservées.
                </>
              ) : (
                <>
                  L'offre « {archivingOffer?.title} » sera archivée et masquée
                  de votre liste active. Cette action est réversible par
                  l'administration.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleArchive();
              }}
              disabled={archiving}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {archiving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Archivage…
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Archiver
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────────────────────

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

// ─── Offer actions (shared between table & card) ─────────────────────────────

interface OfferActionsProps {
  offer: Offer;
  changingStatus: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onStatusChange: (action: StatusAction) => void;
  onViewApplications: () => void;
}

function OfferActions({
  offer,
  changingStatus,
  onEdit,
  onArchive,
  onStatusChange,
  onViewApplications,
}: OfferActionsProps) {
  const actions = getStatusActions(offer.status);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        title="Modifier l'offre"
      >
        <Edit className="h-3.5 w-3.5" />
        <span className="lg:sr-only">Modifier</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewApplications}
        title="Voir les candidatures"
      >
        <Users className="h-3.5 w-3.5" />
        <span className="lg:sr-only">Candidatures</span>
      </Button>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          size="sm"
          disabled={changingStatus}
          onClick={() => onStatusChange(action)}
          title={action.label}
        >
          {changingStatus ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <action.icon className="h-3.5 w-3.5" />
          )}
          {action.label}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onArchive}
        title="Archiver l'offre"
        className="text-italian-red hover:bg-italian-red/10 hover:text-italian-red"
      >
        <Archive className="h-3.5 w-3.5" />
        <span className="lg:sr-only">Archiver</span>
      </Button>
    </div>
  );
}

// ─── Desktop table row ───────────────────────────────────────────────────────

function OfferTableRow({
  offer,
  changingStatus,
  onEdit,
  onArchive,
  onStatusChange,
  onViewApplications,
}: OfferActionsProps) {
  const location = [offer.city, offer.region].filter(Boolean).join(", ");
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
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location || "—"}
              </span>
              <span>{offer.sector}</span>
              <span className="rounded bg-muted px-1.5 py-0.5">
                {offer.contractType}
              </span>
              {offer.positions > 1 && (
                <span>{offer.positions} postes</span>
              )}
            </div>
          </div>
        </div>
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
          <OfferActions
            offer={offer}
            changingStatus={changingStatus}
            onEdit={onEdit}
            onArchive={onArchive}
            onStatusChange={onStatusChange}
            onViewApplications={onViewApplications}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Mobile card ─────────────────────────────────────────────────────────────

function OfferCardMobile({
  offer,
  changingStatus,
  onEdit,
  onArchive,
  onStatusChange,
  onViewApplications,
}: OfferActionsProps) {
  const location = [offer.city, offer.region].filter(Boolean).join(", ");
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-navy">{offer.title}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {location || "—"}
            </p>
          </div>
          <StatusBadge status={offer.status} />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">
            {offer.sector}
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
            <Clock className="h-3 w-3" />
            {formatDateFr(offer.createdAt)}
          </span>
        </div>

        {/* Actions */}
        <div className="border-t pt-3">
          <OfferActions
            offer={offer}
            changingStatus={changingStatus}
            onEdit={onEdit}
            onArchive={onArchive}
            onStatusChange={onStatusChange}
            onViewApplications={onViewApplications}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Offer form (create + edit) ──────────────────────────────────────────────

interface OfferFormProps {
  offer: Offer | null;
  onClose: () => void;
  onSuccess: () => void;
}

function OfferForm({ offer, onClose, onSuccess }: OfferFormProps) {
  const { toast } = useToast();
  const isEdit = !!offer;

  const [form, setForm] = React.useState<OfferFormState>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Populate form when editing
  React.useEffect(() => {
    if (offer) {
      setForm(offerToForm(offer));
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [offer]);

  const update = <K extends keyof OfferFormState>(
    key: K,
    value: OfferFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submit = async (status?: "Draft" | "PendingValidation") => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const isDraft = status === "Draft";
    if (status) {
      if (isDraft) {
        setSavingDraft(true);
      } else {
        setSubmitting(true);
      }
    } else {
      setSubmitting(true);
    }

    try {
      const payload = buildPayload(form, status);
      const url = isEdit
        ? `/api/recruiter/offers/${offer!.id}`
        : "/api/recruiter/offers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error || "Échec de l'enregistrement de l'offre."
        );
      }

      const data = (await res.json()) as OfferResponse;
      const isSubmitForValidation = status === "PendingValidation";
      toast({
        title: isEdit && !status
          ? "Offre mise à jour"
          : isEdit && isSubmitForValidation
          ? "Offre soumise pour validation"
          : isDraft
          ? "Brouillon enregistré"
          : "Offre soumise pour validation",
        description: isDraft
          ? `L'offre « ${data.offer.title} » a été enregistrée comme brouillon.`
          : isEdit && !status
          ? `Les modifications de l'offre « ${data.offer.title} » ont été enregistrées.`
          : `L'offre « ${data.offer.title} » sera examinée par l'administration avant publication.`,
      });
      onSuccess();
    } catch (e) {
      toast({
        title: "Enregistrement impossible",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  };

  // For edit mode on offers already published/suspended/closed, only show a
  // single "save edits" button (no status change).
  const showStatusButtons =
    !isEdit ||
    offer!.status === "Draft" ||
    offer!.status === "PendingValidation";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl text-navy">
          {isEdit ? "Modifier l'offre" : "Nouvelle offre"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Mettez à jour les informations de votre offre."
            : "Renseignez les informations de l'offre. Vous pourrez l'enregistrer comme brouillon ou la soumettre pour validation par l'administration."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Title */}
        <FormField
          label="Intitulé du poste"
          required
          error={errors.title}
        >
          <Input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="ex. Chef de partie cuisine italienne"
            maxLength={120}
          />
        </FormField>

        {/* Description */}
        <FormField
          label="Description"
          required
          error={errors.description}
        >
          <Textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Décrivez le poste, le contexte et les conditions…"
            rows={4}
          />
        </FormField>

        {/* Missions */}
        <FormField label="Missions">
          <Textarea
            value={form.missions}
            onChange={(e) => update("missions", e.target.value)}
            placeholder="Listez les missions principales du poste…"
            rows={3}
          />
        </FormField>

        {/* Sector + City */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Secteur"
            required
            error={errors.sector}
          >
            <Select
              value={form.sector}
              onValueChange={(v) => update("sector", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez un secteur" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Ville"
            required
            error={errors.city}
          >
            <Input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="ex. Florence"
              maxLength={80}
            />
          </FormField>
        </div>

        {/* Region + Positions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Région">
            <Input
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
              placeholder="ex. Toscane"
              maxLength={80}
            />
          </FormField>

          <FormField label="Nombre de postes">
            <Input
              type="number"
              min={1}
              value={form.positions}
              onChange={(e) => update("positions", e.target.value)}
            />
          </FormField>
        </div>

        {/* Contract type + Italian level */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Type de contrat">
            <Select
              value={form.contractType}
              onValueChange={(v) => update("contractType", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Niveau d'italien">
            <Select
              value={form.italianLevel}
              onValueChange={(v) => update("italianLevel", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez un niveau" />
              </SelectTrigger>
              <SelectContent>
                {ITALIAN_LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* Salary + Experience */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Salaire">
            <Input
              value={form.salary}
              onChange={(e) => update("salary", e.target.value)}
              placeholder="ex. 1 600 – 1 900 € / mois"
              maxLength={80}
            />
          </FormField>

          <FormField label="Expérience exigée">
            <Input
              value={form.experienceRequired}
              onChange={(e) => update("experienceRequired", e.target.value)}
              placeholder="ex. 2 ans en cuisine italienne"
              maxLength={120}
            />
          </FormField>
        </div>

        {/* Qualifications */}
        <FormField label="Qualifications">
          <Textarea
            value={form.qualifications}
            onChange={(e) => update("qualifications", e.target.value)}
            placeholder="Diplômes, certifications, compétences requises…"
            rows={3}
          />
        </FormField>

        {/* Application deadline */}
        <FormField label="Date limite de candidature">
          <Input
            type="date"
            value={form.applicationDeadline}
            onChange={(e) => update("applicationDeadline", e.target.value)}
          />
        </FormField>
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={savingDraft || submitting}>
          Annuler
        </Button>
        {showStatusButtons ? (
          <>
            <Button
              variant="secondary"
              onClick={() => submit("Draft")}
              disabled={savingDraft || submitting}
            >
              {savingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
              Enregistrer comme brouillon
            </Button>
            <Button
              className="bg-brand text-white hover:bg-brand/90"
              onClick={() => submit("PendingValidation")}
              disabled={savingDraft || submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Soumettre pour validation
            </Button>
          </>
        ) : (
          <Button
            className="bg-brand text-white hover:bg-brand/90"
            onClick={() => submit()}
            disabled={savingDraft || submitting}
          >
            {submitting || savingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Enregistrer les modifications
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

// ─── Form field wrapper ──────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-navy">
        {label}
        {required && <span className="ml-0.5 text-italian-red">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-italian-red">{error}</p>}
    </div>
  );
}
