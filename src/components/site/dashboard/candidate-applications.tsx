"use client";

import * as React from "react";
import {
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  MapPin,
  Building2,
  Briefcase,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";

// ─── Types ─────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | "Submitted"
  | "Preselected"
  | "Interview"
  | "Offered"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";

interface AppCompany {
  legalName: string;
  city: string | null;
}

interface AppJobOffer {
  id: string;
  title: string;
  sector: string;
  city: string;
  region: string | null;
  contractType: string;
  company: AppCompany;
}

interface Application {
  id: string;
  jobOfferId: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  recruiterNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  jobOffer: AppJobOffer;
}

interface ApplicationsResponse {
  applications: Application[];
}

interface OfferCompany extends AppCompany {
  region: string | null;
  sector: string | null;
  website?: string | null;
}

interface OfferDetails {
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
  createdAt: string;
  company: OfferCompany;
}

interface OfferResponse {
  offer: OfferDetails;
}

type FilterTab = "all" | "pending" | "rejected";

// ─── Status badge helper ────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  className: string;
  icon: React.ReactNode;
}

function getStatusMeta(status: ApplicationStatus): StatusMeta {
  switch (status) {
    case "Submitted":
      return {
        label: "Candidature envoyée",
        className: "bg-brand/10 text-brand",
        icon: <Send className="mr-1.5 h-3.5 w-3.5" />,
      };
    case "Preselected":
      return {
        label: "Présélectionné",
        className: "bg-amber-100 text-amber-800",
        icon: <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />,
      };
    case "Interview":
      return {
        label: "Entretien programmé",
        className: "bg-brand text-white",
        icon: <CalendarClock className="mr-1.5 h-3.5 w-3.5" />,
      };
    case "Offered":
      return {
        label: "Proposition reçue",
        className: "bg-brand-green/15 text-brand-green",
        icon: <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />,
      };
    case "Accepted":
      return {
        label: "Acceptée",
        className: "bg-brand-green text-white",
        icon: <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />,
      };
    case "Rejected":
      return {
        label: "Refusée",
        className: "bg-italian-red/10 text-italian-red",
        icon: <XCircle className="mr-1.5 h-3.5 w-3.5" />,
      };
    case "Withdrawn":
      return {
        label: "Retirée",
        className: "bg-muted text-muted-foreground",
        icon: <XCircle className="mr-1.5 h-3.5 w-3.5" />,
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground",
        icon: null,
      };
  }
}

const PENDING_STATUSES: ApplicationStatus[] = [
  "Submitted",
  "Preselected",
  "Interview",
  "Offered",
];

// ─── Date helpers ───────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CandidateApplications() {
  const { navigate } = useSiteRouter();

  const [applications, setApplications] = React.useState<Application[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<FilterTab>("all");

  // Offer details dialog state
  const [viewingJobOfferId, setViewingJobOfferId] = React.useState<string | null>(
    null
  );
  const [offer, setOffer] = React.useState<OfferDetails | null>(null);
  const [offerLoading, setOfferLoading] = React.useState(false);
  const [offerError, setOfferError] = React.useState<string | null>(null);

  // Fetch applications on mount
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/candidate/applications", {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            data.error || "Échec du chargement de vos candidatures."
          );
        }
        const data = (await res.json()) as ApplicationsResponse;
        setApplications(data.applications);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch offer details when the user opens "Voir l'offre"
  React.useEffect(() => {
    if (!viewingJobOfferId) {
      setOffer(null);
      setOfferError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setOfferLoading(true);
      setOfferError(null);
      setOffer(null);
      try {
        const res = await fetch(`/api/jobs/${viewingJobOfferId}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Offre introuvable.");
        }
        const data = (await res.json()) as OfferResponse;
        if (!cancelled) setOffer(data.offer);
      } catch (e) {
        if (!cancelled) {
          setOfferError(
            e instanceof Error ? e.message : "Une erreur est survenue."
          );
        }
      } finally {
        if (!cancelled) setOfferLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewingJobOfferId]);

  const closeOfferDialog = () => {
    setViewingJobOfferId(null);
    setOffer(null);
    setOfferError(null);
  };

  // Client-side filter by tab
  const visibleApplications = React.useMemo(() => {
    if (tab === "pending") {
      return applications.filter((a) =>
        PENDING_STATUSES.includes(a.status)
      );
    }
    if (tab === "rejected") {
      return applications.filter((a) => a.status === "Rejected");
    }
    return applications;
  }, [applications, tab]);

  const counts = React.useMemo(() => {
    const pending = applications.filter((a) =>
      PENDING_STATUSES.includes(a.status)
    ).length;
    const rejected = applications.filter(
      (a) => a.status === "Rejected"
    ).length;
    return { all: applications.length, pending, rejected };
  }, [applications]);

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy">Mes candidatures</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivez l'état de vos candidatures et les réponses des recruteurs.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-4 w-1/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Send className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy">
              Vous n'avez pas encore postulé
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Parcourez les offres d'emploi disponibles et postulez en quelques
              clics. Vos candidatures apparaîtront ici avec leur statut.
            </p>
            <Button
              className="mt-4 bg-brand text-white hover:bg-brand/90"
              onClick={() => navigate("dashboard", { section: "jobs" })}
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Voir les offres
              <ArrowRight className="ml-1.5 h-4 w-4" />
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
            <TabsList className="flex w-full max-w-md flex-wrap">
              <TabsTrigger value="all" className="flex-1">
                Toutes ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">
                En cours ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex-1">
                Refusées ({counts.rejected})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {visibleApplications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune candidature dans cette catégorie.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-4">
              {visibleApplications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onViewOffer={() => setViewingJobOfferId(app.jobOfferId)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {/* ─── Offer details dialog ──────────────────────────── */}
      <Dialog
        open={!!viewingJobOfferId}
        onOpenChange={(open) => !open && closeOfferDialog()}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scrollbar">
          {offerLoading ? (
            <div className="space-y-4 p-1">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : offerError ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{offerError}</AlertDescription>
            </Alert>
          ) : offer ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl text-navy">
                  {offer.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-brand" />
                    {offer.company.legalName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand" />
                    {offer.city}
                    {offer.region ? `, ${offer.region}` : ""}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{offer.sector}</Badge>
                  <Badge
                    variant="outline"
                    className="border-brand/30 text-brand"
                  >
                    {offer.contractType}
                  </Badge>
                  {offer.italianLevel && (
                    <Badge
                      variant="outline"
                      className="border-brand-green/30 text-brand-green"
                    >
                      Italien : {offer.italianLevel}
                    </Badge>
                  )}
                  {offer.salary && (
                    <Badge variant="outline">{offer.salary}</Badge>
                  )}
                </div>

                <OfferSection
                  icon={<FileText className="h-4 w-4 text-brand" />}
                  title="Description"
                >
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {offer.description}
                  </p>
                </OfferSection>

                {offer.missions && (
                  <OfferSection
                    icon={<Briefcase className="h-4 w-4 text-brand" />}
                    title="Missions"
                  >
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {offer.missions}
                    </p>
                  </OfferSection>
                )}

                {offer.qualifications && (
                  <OfferSection
                    icon={<CheckCircle2 className="h-4 w-4 text-brand" />}
                    title="Qualifications"
                  >
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {offer.qualifications}
                    </p>
                  </OfferSection>
                )}

                {offer.experienceRequired && (
                  <OfferSection
                    icon={<Clock className="h-4 w-4 text-brand" />}
                    title="Expérience requise"
                  >
                    <p className="text-sm text-muted-foreground">
                      {offer.experienceRequired}
                    </p>
                  </OfferSection>
                )}

                {offer.applicationDeadline && (
                  <Alert className="border-italian-red/30 bg-italian-red/5">
                    <Clock className="h-4 w-4 text-italian-red" />
                    <AlertTitle className="text-italian-red">
                      Date limite de candidature
                    </AlertTitle>
                    <AlertDescription>
                      Avant le {formatDateLong(offer.applicationDeadline)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeOfferDialog}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Application card ───────────────────────────────────────────────────────

function ApplicationCard({
  application,
  onViewOffer,
}: {
  application: Application;
  onViewOffer: () => void;
}) {
  const meta = getStatusMeta(application.status);
  const job = application.jobOffer;
  const location = [job.city, job.region].filter(Boolean).join(", ");

  return (
    <li>
      <Card className="transition-all hover:shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: identity */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-navy">
                    {job.title}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-brand" />
                    <span className="truncate">{job.company.legalName}</span>
                  </p>
                </div>
                <Badge
                  className={`px-3 py-1 text-xs font-semibold ${meta.className}`}
                >
                  {meta.icon}
                  {meta.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand" />
                    {location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-brand" />
                  {job.contractType}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-brand" />
                  {job.sector}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Postulé le {formatDateFr(application.createdAt)}
              </div>

              {/* Status-specific notes */}
              {application.status === "Rejected" &&
                application.rejectionReason && (
                  <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Motif du refus : {application.rejectionReason}
                  </p>
                )}

              {application.status === "Interview" && (
                <Alert className="mt-2 border-brand/30 bg-brand/5 py-2">
                  <CalendarClock className="h-4 w-4 text-brand" />
                  <AlertDescription className="text-sm text-brand">
                    Un entretien est programmé — voir vos notifications pour le
                    détail.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex shrink-0 flex-row gap-2 lg:flex-col lg:items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewOffer}
                className="flex-1 lg:flex-none"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Voir l'offre
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

// ─── Local helper: offer detail section ─────────────────────────────────────

function OfferSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}
