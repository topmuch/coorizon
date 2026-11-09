"use client";

import * as React from "react";
import {
  Search,
  MapPin,
  Building2,
  Briefcase,
  Users,
  Clock,
  Send,
  ArrowRight,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSiteRouter } from "@/lib/site-router";
import { sectors } from "@/lib/site-data";

// ─── Types (match the API responses) ────────────────────────────────────────

interface OfferCompany {
  legalName: string;
  city: string | null;
  region: string | null;
  sector: string | null;
}

interface JobOffer {
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
  status: string;
  createdAt: string;
  company: OfferCompany;
}

interface JobsResponse {
  offers: JobOffer[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApplicationSummary {
  id: string;
  jobOfferId: string;
}

interface ApplicationsResponse {
  applications: ApplicationSummary[];
}

// ─── Filter form state ──────────────────────────────────────────────────────

interface FilterState {
  q: string;
  sector: string; // "" = all
  city: string;
  level: string; // "" = all
}

const EMPTY_FILTERS: FilterState = { q: "", sector: "", city: "", level: "" };

const ITALIAN_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Il y a 1 j";
  return `Il y a ${days} j`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CandidateJobs() {
  const { toast } = useToast();
  const { navigate } = useSiteRouter();

  const [form, setForm] = React.useState<FilterState>(EMPTY_FILTERS);
  const [activeFilters, setActiveFilters] =
    React.useState<FilterState>(EMPTY_FILTERS);

  const [offers, setOffers] = React.useState<JobOffer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [appliedSet, setAppliedSet] = React.useState<Set<string>>(new Set());
  const [appliedLoading, setAppliedLoading] = React.useState(true);

  const [detailsOffer, setDetailsOffer] = React.useState<JobOffer | null>(null);
  const [applyOffer, setApplyOffer] = React.useState<JobOffer | null>(null);
  const [coverLetter, setCoverLetter] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Fetch the candidate's existing applications once, on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setAppliedLoading(true);
      try {
        const res = await fetch("/api/candidate/applications", {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as ApplicationsResponse;
          setAppliedSet(new Set(data.applications.map((a) => a.jobOfferId)));
        }
      } catch {
        // best-effort: silently ignore — the apply call will surface 409 anyway
      } finally {
        if (!cancelled) setAppliedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch offers whenever the active filters change.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (activeFilters.q) params.set("q", activeFilters.q);
        if (activeFilters.sector) params.set("sector", activeFilters.sector);
        if (activeFilters.city) params.set("city", activeFilters.city);
        if (activeFilters.level) params.set("level", activeFilters.level);
        params.set("pageSize", "12");

        const res = await fetch(`/api/jobs?${params.toString()}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Échec du chargement des offres.");
        }
        const data = (await res.json()) as JobsResponse;
        setOffers(data.offers);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
          setOffers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFilters]);

  const handleSubmitFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilters(form);
  };

  const handleResetFilters = () => {
    setForm(EMPTY_FILTERS);
    setActiveFilters(EMPTY_FILTERS);
  };

  const openApply = (offer: JobOffer) => {
    setCoverLetter("");
    setApplyOffer(offer);
  };

  const confirmApply = async () => {
    if (!applyOffer) return;
    const offer = applyOffer;
    setSubmitting(true);
    try {
      const res = await fetch("/api/candidate/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobOfferId: offer.id,
          coverLetter: coverLetter.trim() || undefined,
        }),
      });

      if (res.status === 409) {
        toast({
          variant: "destructive",
          title: "Candidature existante",
          description: "Vous avez déjà postulé à cette offre.",
        });
        setAppliedSet((prev) => new Set(prev).add(offer.id));
        setApplyOffer(null);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de l'envoi de la candidature.");
      }

      toast({
        title: "Candidature envoyée !",
        description: `Votre candidature pour « ${offer.title} » a bien été transmise.`,
      });
      setAppliedSet((prev) => new Set(prev).add(offer.id));
      setApplyOffer(null);
      setDetailsOffer(null);
      navigate("dashboard", { section: "applications" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error
            ? e.message
            : "Une erreur est survenue lors de l'envoi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy">Offres d'emploi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parcourez les offres publiées par les entreprises italiennes partenaires
          et postulez en quelques clics.
        </p>
      </header>

      {/* ─── Filter bar ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-navy">
            <Search className="h-4 w-4 text-brand" />
            Recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmitFilters}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="filter-q" className="text-xs text-muted-foreground">
                Mot-clé
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-q"
                  placeholder="Ex : cuisinier, infirmier…"
                  value={form.q}
                  onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="filter-sector"
                className="text-xs text-muted-foreground"
              >
                Secteur
              </Label>
              <Select
                value={form.sector || "__all__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, sector: v === "__all__" ? "" : v }))
                }
              >
                <SelectTrigger id="filter-sector" className="w-full">
                  <SelectValue placeholder="Tous les secteurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les secteurs</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.slug} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="filter-level"
                className="text-xs text-muted-foreground"
              >
                Niveau d'italien
              </Label>
              <Select
                value={form.level || "__all__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, level: v === "__all__" ? "" : v }))
                }
              >
                <SelectTrigger id="filter-level" className="w-full">
                  <SelectValue placeholder="Tous les niveaux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les niveaux</SelectItem>
                  {ITALIAN_LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="filter-city"
                className="text-xs text-muted-foreground"
              >
                Ville / Région
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-city"
                  placeholder="Ex : Rome, Toscane…"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" className="bg-brand text-white hover:bg-brand/90">
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
              >
                Réinitialiser
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── Error banner ──────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ─── Results ───────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-9 w-full" />
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
              Aucune offre ne correspond à votre recherche
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Essayez d'élargir vos critères ou réinitialisez les filtres pour
              voir toutes les offres disponibles.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleResetFilters}
            >
              Réinitialiser les filtres
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {offers.length} offre{offers.length > 1 ? "s" : ""} trouvée
            {offers.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => {
              const alreadyApplied = appliedSet.has(offer.id);
              return (
                <Card
                  key={offer.id}
                  className="flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardHeader className="space-y-1.5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-base leading-snug text-navy">
                        {offer.title}
                      </CardTitle>
                      {alreadyApplied && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-brand-green/10 text-brand-green"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Déjà postulé
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {offer.company.legalName}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="font-normal">
                        {offer.sector}
                      </Badge>
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
                          IT {offer.italianLevel}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-brand" />
                        {offer.city}
                        {offer.region ? `, ${offer.region}` : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-brand" />
                        {offer.positions} poste
                        {offer.positions > 1 ? "s" : ""}
                      </span>
                      {offer.salary && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-brand" />
                          {offer.salary}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-brand" />
                        {timeAgo(offer.createdAt)}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {offer.description}
                    </p>

                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDetailsOffer(offer)}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Voir détails
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-brand text-white hover:bg-brand/90"
                        disabled={alreadyApplied || appliedLoading}
                        onClick={() => openApply(offer)}
                      >
                        {alreadyApplied ? (
                          <>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Postulé
                          </>
                        ) : (
                          <>
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                            Postuler
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Details Dialog ────────────────────────────────── */}
      <Dialog
        open={!!detailsOffer}
        onOpenChange={(open) => !open && setDetailsOffer(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scrollbar">
          {detailsOffer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl text-navy">
                  {detailsOffer.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-brand" />
                    {detailsOffer.company.legalName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand" />
                    {detailsOffer.city}
                    {detailsOffer.region ? `, ${detailsOffer.region}` : ""}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{detailsOffer.sector}</Badge>
                  <Badge
                    variant="outline"
                    className="border-brand/30 text-brand"
                  >
                    {detailsOffer.contractType}
                  </Badge>
                  {detailsOffer.italianLevel && (
                    <Badge
                      variant="outline"
                      className="border-brand-green/30 text-brand-green"
                    >
                      Italien : {detailsOffer.italianLevel}
                    </Badge>
                  )}
                  {detailsOffer.salary && (
                    <Badge variant="outline">{detailsOffer.salary}</Badge>
                  )}
                  <Badge variant="outline">
                    <Users className="mr-1 h-3 w-3" />
                    {detailsOffer.positions} poste
                    {detailsOffer.positions > 1 ? "s" : ""}
                  </Badge>
                </div>

                <DetailSection
                  icon={<FileText className="h-4 w-4 text-brand" />}
                  title="Description"
                >
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {detailsOffer.description}
                  </p>
                </DetailSection>

                {detailsOffer.missions && (
                  <DetailSection
                    icon={<Briefcase className="h-4 w-4 text-brand" />}
                    title="Missions"
                  >
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {detailsOffer.missions}
                    </p>
                  </DetailSection>
                )}

                {detailsOffer.qualifications && (
                  <DetailSection
                    icon={<CheckCircle2 className="h-4 w-4 text-brand" />}
                    title="Qualifications"
                  >
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {detailsOffer.qualifications}
                    </p>
                  </DetailSection>
                )}

                {detailsOffer.experienceRequired && (
                  <DetailSection
                    icon={<Clock className="h-4 w-4 text-brand" />}
                    title="Expérience requise"
                  >
                    <p className="text-sm text-muted-foreground">
                      {detailsOffer.experienceRequired}
                    </p>
                  </DetailSection>
                )}

                {detailsOffer.applicationDeadline && (
                  <Alert className="border-italian-red/30 bg-italian-red/5">
                    <Clock className="h-4 w-4 text-italian-red" />
                    <AlertTitle className="text-italian-red">
                      Date limite de candidature
                    </AlertTitle>
                    <AlertDescription>
                      Avant le{" "}
                      {new Date(detailsOffer.applicationDeadline).toLocaleDateString(
                        "fr-FR",
                        { day: "2-digit", month: "long", year: "numeric" }
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDetailsOffer(null)}
                >
                  Fermer
                </Button>
                <Button
                  className="bg-brand text-white hover:bg-brand/90"
                  disabled={appliedSet.has(detailsOffer.id)}
                  onClick={() => openApply(detailsOffer)}
                >
                  {appliedSet.has(detailsOffer.id) ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Déjà postulé
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-4 w-4" />
                      Postuler
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Apply Dialog ──────────────────────────────────── */}
      <Dialog
        open={!!applyOffer}
        onOpenChange={(open) => {
          if (!submitting) {
            setApplyOffer(null);
            setCoverLetter("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {applyOffer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-navy">
                  Postuler à « {applyOffer.title} »
                </DialogTitle>
                <DialogDescription>
                  {applyOffer.company.legalName} — {applyOffer.city}
                  {applyOffer.region ? `, ${applyOffer.region}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <Label htmlFor="cover-letter" className="text-sm">
                  Lettre de motivation{" "}
                  <span className="text-muted-foreground">(optionnelle)</span>
                </Label>
                <Textarea
                  id="cover-letter"
                  placeholder="Présentez brièvement votre motivation et vos compétences pertinentes pour ce poste…"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Votre profil et votre CV déjà enregistrés seront joints
                  automatiquement à cette candidature.
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => {
                    setApplyOffer(null);
                    setCoverLetter("");
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-brand text-white hover:bg-brand/90"
                  disabled={submitting}
                  onClick={confirmApply}
                >
                  {submitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Confirmer ma candidature
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Local helper: detail section wrapper ───────────────────────────────────

function DetailSection({
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
