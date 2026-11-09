"use client";

import * as React from "react";
import {
  Users,
  UserCheck,
  XCircle,
  CalendarClock,
  FileText,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Clock,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Building2,
  Globe,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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

interface CandidateProfileSummary {
  desiredJob: string | null;
  sector: string | null;
  city: string | null;
  italianLevel: string | null;
  educationLevel: string | null;
  nationality: string | null;
}

interface CandidateSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  candidateProfile: CandidateProfileSummary | null;
}

interface JobOfferSummary {
  id: string;
  title: string;
  city: string | null;
  sector: string | null;
}

interface InterviewSummary {
  id: string;
  scheduledAt: string;
  durationMin: number;
  location: string | null;
  meetingUrl: string | null;
  status: string;
  note: string | null;
}

interface ApplicationListItem {
  id: string;
  candidateId: string;
  jobOfferId: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  recruiterNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: CandidateSummary;
  jobOffer: JobOfferSummary;
  interviews: InterviewSummary[];
}

interface ApplicationDetail extends ApplicationListItem {
  history: ApplicationHistoryEntry[];
  interviews: InterviewSummary[];
}

interface ApplicationHistoryEntry {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  comment: string | null;
  createdAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
}

interface ApplicationDetailResponse {
  application: ApplicationDetail;
}

interface ApplicationsListResponse {
  applications: ApplicationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Status metadata ──────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  className: string;
  dotClassName: string;
}

function getStatusMeta(status: ApplicationStatus): StatusMeta {
  switch (status) {
    case "Submitted":
      return {
        label: "Candidature envoyée",
        className: "bg-blue-50 text-blue-700 border border-blue-200",
        dotClassName: "bg-blue-500",
      };
    case "Preselected":
      return {
        label: "Présélectionné",
        className: "bg-amber-50 text-amber-800 border border-amber-200",
        dotClassName: "bg-amber-500",
      };
    case "Interview":
      return {
        label: "Entretien",
        className: "bg-brand text-white border border-brand",
        dotClassName: "bg-white",
      };
    case "Offered":
      return {
        label: "Proposition",
        className: "bg-brand-green/15 text-brand-green border border-brand-green/30",
        dotClassName: "bg-brand-green",
      };
    case "Accepted":
      return {
        label: "Acceptée",
        className: "bg-brand-green text-white border border-brand-green",
        dotClassName: "bg-white",
      };
    case "Rejected":
      return {
        label: "Refusée",
        className: "bg-italian-red/10 text-italian-red border border-italian-red/30",
        dotClassName: "bg-italian-red",
      };
    case "Withdrawn":
      return {
        label: "Retirée",
        className: "bg-muted text-muted-foreground border border-border",
        dotClassName: "bg-muted-foreground",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground",
        dotClassName: "bg-muted-foreground",
      };
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Default datetime-local value: tomorrow 10:00, in local time.
function defaultInterviewDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Component ────────────────────────────────────────────────────────────

export function RecruiterApplications() {
  const { params } = useSiteRouter();
  const { toast } = useToast();

  const [applications, setApplications] = React.useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [statusFilter, setStatusFilter] = React.useState<"all" | ApplicationStatus>("all");
  const [offerFilter, setOfferFilter] = React.useState<string>("");
  const initialOfferId = params.get("offerId") ?? "";
  const [appliedOfferId, setAppliedOfferId] = React.useState<string>(initialOfferId);

  // Reject dialog state.
  const [rejectingAppId, setRejectingAppId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Note dialog state.
  const [noteAppId, setNoteAppId] = React.useState<string | null>(null);
  const [noteValue, setNoteValue] = React.useState("");
  const [noteSaving, setNoteSaving] = React.useState(false);

  // Interview dialog state.
  const [interviewAppId, setInterviewAppId] = React.useState<string | null>(null);
  const [interviewForm, setInterviewForm] = React.useState({
    scheduledAt: defaultInterviewDate(),
    durationMin: "30",
    location: "",
    meetingUrl: "",
    note: "",
  });
  const [interviewSaving, setInterviewSaving] = React.useState(false);

  // Details dialog state.
  const [detailsAppId, setDetailsAppId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Fetch list.
  const fetchApplications = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (appliedOfferId.trim()) qs.set("offerId", appliedOfferId.trim());
      qs.set("page", "1");
      qs.set("pageSize", "50");
      const res = await fetch(`/api/recruiter/applications?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des candidatures.");
      }
      const data = (await res.json()) as ApplicationsListResponse;
      setApplications(data.applications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, appliedOfferId]);

  React.useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Fetch application details.
  React.useEffect(() => {
    if (!detailsAppId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await fetch(`/api/recruiter/applications/${detailsAppId}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Candidature introuvable.");
        }
        const data = (await res.json()) as ApplicationDetailResponse;
        if (!cancelled) setDetail(data.application);
      } catch (e) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: e instanceof Error ? e.message : "Une erreur est survenue.",
          });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailsAppId, toast]);

  // Open the rejection dialog.
  const openReject = (appId: string) => {
    setRejectingAppId(appId);
    setRejectionReason("");
  };

  // Submit rejection.
  const submitRejection = async () => {
    if (!rejectingAppId) return;
    if (rejectionReason.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "Motif requis",
        description: "Veuillez indiquer le motif du refus.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/recruiter/applications/${rejectingAppId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Rejected",
          rejectionReason: rejectionReason.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du refus de la candidature.");
      }
      toast({
        title: "Candidature refusée",
        description: "Le candidat a été informé du refus.",
      });
      setRejectingAppId(null);
      await fetchApplications();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Change status (preselect, offer, accept).
  const changeStatus = async (appId: string, status: ApplicationStatus, label: string) => {
    try {
      const res = await fetch(`/api/recruiter/applications/${appId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la mise à jour du statut.");
      }
      toast({ title: "Statut mis à jour", description: label });
      await fetchApplications();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    }
  };

  // Open note dialog.
  const openNote = (app: ApplicationListItem) => {
    setNoteAppId(app.id);
    setNoteValue(app.recruiterNote ?? "");
  };

  // Save note.
  const saveNote = async () => {
    if (!noteAppId) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/recruiter/applications/${noteAppId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterNote: noteValue.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de l'enregistrement de la note.");
      }
      toast({ title: "Note enregistrée", description: "Votre note interne a été mise à jour." });
      setNoteAppId(null);
      await fetchApplications();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setNoteSaving(false);
    }
  };

  // Open interview dialog.
  const openInterview = (appId: string) => {
    setInterviewAppId(appId);
    setInterviewForm({
      scheduledAt: defaultInterviewDate(),
      durationMin: "30",
      location: "",
      meetingUrl: "",
      note: "",
    });
  };

  // Submit interview.
  const submitInterview = async () => {
    if (!interviewAppId) return;
    if (!interviewForm.scheduledAt) {
      toast({
        variant: "destructive",
        title: "Date requise",
        description: "Veuillez choisir une date et une heure.",
      });
      return;
    }
    setInterviewSaving(true);
    try {
      const res = await fetch("/api/recruiter/interviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: interviewAppId,
          scheduledAt: interviewForm.scheduledAt,
          durationMin: Number(interviewForm.durationMin) || 30,
          location: interviewForm.location.trim() || undefined,
          meetingUrl: interviewForm.meetingUrl.trim() || undefined,
          note: interviewForm.note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la planification de l'entretien.");
      }
      toast({
        title: "Entretien programmé",
        description: "Le candidat a été notifié de la planification.",
      });
      setInterviewAppId(null);
      await fetchApplications();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setInterviewSaving(false);
    }
  };

  const applyOfferFilter = () => {
    setAppliedOfferId(offerFilter.trim());
  };

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy">Candidatures reçues</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les candidatures aux offres de votre entreprise, programmez des entretiens et
          faites avancer vos recrutements.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Statut</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | ApplicationStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Submitted">Candidature envoyée</SelectItem>
                <SelectItem value="Preselected">Présélectionné</SelectItem>
                <SelectItem value="Interview">Entretien</SelectItem>
                <SelectItem value="Offered">Proposition</SelectItem>
                <SelectItem value="Accepted">Acceptée</SelectItem>
                <SelectItem value="Rejected">Refusée</SelectItem>
                <SelectItem value="Withdrawn">Retirée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Filtrer par offre (ID)</Label>
            <div className="flex gap-2">
              <Input
                value={offerFilter}
                onChange={(e) => setOfferFilter(e.target.value)}
                placeholder="Identifiant de l'offre"
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyOfferFilter();
                }}
              />
              <Button type="button" variant="secondary" onClick={applyOfferFilter}>
                Filtrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-7 w-32" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy">Aucune candidature</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Aucune candidature ne correspond à vos critères. Lorsqu'un candidat postulera à vos
              offres, sa candidature apparaîtra ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onPreselect={() => changeStatus(app.id, "Preselected", "Candidat présélectionné.")}
              onReject={() => openReject(app.id)}
              onInterview={() => openInterview(app.id)}
              onOffer={() => changeStatus(app.id, "Offered", "Proposition envoyée au candidat.")}
              onAccept={() => changeStatus(app.id, "Accepted", "Candidature acceptée.")}
              onNote={() => openNote(app)}
              onDetails={() => setDetailsAppId(app.id)}
            />
          ))}
        </ul>
      )}

      {/* ─── Rejection dialog ─────────────────────────────── */}
      <Dialog
        open={!!rejectingAppId}
        onOpenChange={(open) => !open && setRejectingAppId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <XCircle className="h-5 w-5 text-italian-red" />
              Refuser la candidature
            </DialogTitle>
            <DialogDescription>
              Indiquez le motif du refus. Il sera conservé dans l'historique de la candidature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motif du refus *</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex. Profil ne correspondant pas aux critères du poste..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingAppId(null)}>
              Annuler
            </Button>
            <Button
              onClick={submitRejection}
              disabled={submitting || rejectionReason.trim().length === 0}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Internal note dialog ─────────────────────────── */}
      <Dialog
        open={!!noteAppId}
        onOpenChange={(open) => !open && setNoteAppId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <MessageSquare className="h-5 w-5 text-brand" />
              Note interne
            </DialogTitle>
            <DialogDescription>
              Cette note est strictement interne à votre entreprise. Le candidat n'y a pas accès.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="recruiter-note">Votre note</Label>
            <Textarea
              id="recruiter-note"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Ex. Très bon profil, à recontacter en priorité..."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteAppId(null)}>
              Annuler
            </Button>
            <Button
              onClick={saveNote}
              disabled={noteSaving}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {noteSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Interview dialog ─────────────────────────────── */}
      <Dialog
        open={!!interviewAppId}
        onOpenChange={(open) => !open && setInterviewAppId(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <CalendarClock className="h-5 w-5 text-brand" />
              Programmer un entretien
            </DialogTitle>
            <DialogDescription>
              Renseignez la date, la durée et le lieu. Le statut de la candidature passera
              automatiquement à « Entretien ».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interview-date">Date et heure *</Label>
              <Input
                id="interview-date"
                type="datetime-local"
                value={interviewForm.scheduledAt}
                onChange={(e) =>
                  setInterviewForm((f) => ({ ...f, scheduledAt: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-duration">Durée (minutes)</Label>
              <Input
                id="interview-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={interviewForm.durationMin}
                onChange={(e) =>
                  setInterviewForm((f) => ({ ...f, durationMin: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-location">Lieu</Label>
              <Input
                id="interview-location"
                value={interviewForm.location}
                onChange={(e) =>
                  setInterviewForm((f) => ({ ...f, location: e.target.value }))
                }
                placeholder="Ex. Bureaux de Milan, salle 2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-url">Lien visio (optionnel)</Label>
              <Input
                id="interview-url"
                type="url"
                value={interviewForm.meetingUrl}
                onChange={(e) =>
                  setInterviewForm((f) => ({ ...f, meetingUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-note">Note (optionnel)</Label>
              <Textarea
                id="interview-note"
                value={interviewForm.note}
                onChange={(e) => setInterviewForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Ex. Préparer le test technique, apporter le portfolio..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewAppId(null)}>
              Annuler
            </Button>
            <Button
              onClick={submitInterview}
              disabled={interviewSaving}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {interviewSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
              )}
              Programmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Details dialog ───────────────────────────────── */}
      <Dialog
        open={!!detailsAppId}
        onOpenChange={(open) => !open && setDetailsAppId(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scrollbar">
          {detailLoading ? (
            <div className="space-y-4 p-1">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : detail ? (
            <ApplicationDetailContent application={detail} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Application card ─────────────────────────────────────────────────────

interface ApplicationCardProps {
  application: ApplicationListItem;
  onPreselect: () => void;
  onReject: () => void;
  onInterview: () => void;
  onOffer: () => void;
  onAccept: () => void;
  onNote: () => void;
  onDetails: () => void;
}

function ApplicationCard({
  application,
  onPreselect,
  onReject,
  onInterview,
  onOffer,
  onAccept,
  onNote,
  onDetails,
}: ApplicationCardProps) {
  const meta = getStatusMeta(application.status);
  const candidate = application.candidate;
  const profile = candidate.candidateProfile;
  const fullName = `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Candidat";
  const initials = (
    (candidate.firstName?.[0] ?? "") + (candidate.lastName?.[0] ?? "")
  ).toUpperCase();

  return (
    <li>
      <Card className="transition-all hover:shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            {/* Header: candidate + status */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                  {initials || <Users className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-navy">{fullName}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{candidate.email}</span>
                    </span>
                    {candidate.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {candidate.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Badge className={`px-3 py-1.5 text-xs font-semibold ${meta.className}`}>
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${meta.dotClassName}`} />
                {meta.label}
              </Badge>
            </div>

            {/* Profile summary */}
            {profile && (
              <div className="flex flex-wrap gap-1.5">
                {profile.desiredJob && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Briefcase className="h-3 w-3 text-brand" />
                    {profile.desiredJob}
                  </Badge>
                )}
                {profile.sector && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Building2 className="h-3 w-3 text-brand" />
                    {profile.sector}
                  </Badge>
                )}
                {profile.city && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <MapPin className="h-3 w-3 text-brand" />
                    {profile.city}
                  </Badge>
                )}
                {profile.italianLevel && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Globe className="h-3 w-3 text-brand" />
                    Italien : {profile.italianLevel}
                  </Badge>
                )}
                {profile.educationLevel && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <GraduationCap className="h-3 w-3 text-brand" />
                    {profile.educationLevel}
                  </Badge>
                )}
                {profile.nationality && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Globe className="h-3 w-3" />
                    {profile.nationality}
                  </Badge>
                )}
              </div>
            )}

            {/* Offer + date */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-brand" />
                <span className="font-medium text-navy">{application.jobOffer.title}</span>
                {application.jobOffer.city && (
                  <span className="text-muted-foreground">— {application.jobOffer.city}</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Postulé le {formatDateFr(application.createdAt)}
              </span>
            </div>

            {/* Internal note preview */}
            {application.recruiterNote && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <span className="font-semibold">Note interne :</span>{" "}
                {application.recruiterNote}
              </div>
            )}

            {/* Rejection reason preview */}
            {application.status === "Rejected" && application.rejectionReason && (
              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold">Motif du refus :</span>{" "}
                {application.rejectionReason}
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Context-dependent primary actions */}
              {application.status === "Submitted" && (
                <>
                  <Button
                    size="sm"
                    onClick={onPreselect}
                    className="bg-brand text-white hover:bg-brand/90"
                  >
                    <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                    Présélectionner
                  </Button>
                  <Button size="sm" variant="outline" onClick={onReject}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5 text-italian-red" />
                    Refuser
                  </Button>
                </>
              )}
              {application.status === "Preselected" && (
                <>
                  <Button
                    size="sm"
                    onClick={onInterview}
                    className="bg-brand text-white hover:bg-brand/90"
                  >
                    <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                    Programmer entretien
                  </Button>
                  <Button size="sm" variant="outline" onClick={onReject}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5 text-italian-red" />
                    Refuser
                  </Button>
                </>
              )}
              {application.status === "Interview" && (
                <>
                  <Button
                    size="sm"
                    onClick={onOffer}
                    className="bg-brand-green text-white hover:bg-brand-green/90"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Faire une proposition
                  </Button>
                  <Button size="sm" variant="outline" onClick={onReject}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5 text-italian-red" />
                    Refuser
                  </Button>
                </>
              )}
              {application.status === "Offered" && (
                <>
                  <Button
                    size="sm"
                    onClick={onAccept}
                    className="bg-brand-green text-white hover:bg-brand-green/90"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Accepter
                  </Button>
                  <Button size="sm" variant="outline" onClick={onReject}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5 text-italian-red" />
                    Refuser
                  </Button>
                </>
              )}

              {/* Always available */}
              <Button size="sm" variant="ghost" onClick={onNote}>
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Note interne
              </Button>
              <Button size="sm" variant="ghost" onClick={onDetails}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Voir détails
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

// ─── Application detail content (dialog body) ─────────────────────────────

function ApplicationDetailContent({ application }: { application: ApplicationDetail }) {
  const meta = getStatusMeta(application.status);
  const profile = application.candidate.candidateProfile;
  const fullName =
    `${application.candidate.firstName ?? ""} ${application.candidate.lastName ?? ""}`.trim() ||
    "Candidat";

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="text-xl text-navy">{fullName}</DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2">
          <Badge className={`px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
            {meta.label}
          </Badge>
          <span className="text-foreground">{application.jobOffer.title}</span>
          {application.jobOffer.city && (
            <span className="text-muted-foreground">— {application.jobOffer.city}</span>
          )}
        </DialogDescription>
      </DialogHeader>

      {/* Candidate contact */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Users className="h-4 w-4 text-brand" />
          Coordonnées du candidat
        </h4>
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-brand" />
            <span className="break-all text-muted-foreground">{application.candidate.email}</span>
          </div>
          {application.candidate.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{application.candidate.phone}</span>
            </div>
          )}
        </div>
      </section>

      {/* Profile summary */}
      {profile && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <GraduationCap className="h-4 w-4 text-brand" />
            Profil du candidat
          </h4>
          <div className="flex flex-wrap gap-1.5 rounded-md border bg-card p-3">
            {profile.desiredJob && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Briefcase className="h-3 w-3 text-brand" />
                {profile.desiredJob}
              </Badge>
            )}
            {profile.sector && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Building2 className="h-3 w-3 text-brand" />
                {profile.sector}
              </Badge>
            )}
            {profile.city && (
              <Badge variant="outline" className="gap-1 text-xs">
                <MapPin className="h-3 w-3 text-brand" />
                {profile.city}
              </Badge>
            )}
            {profile.italianLevel && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Globe className="h-3 w-3 text-brand" />
                Italien : {profile.italianLevel}
              </Badge>
            )}
            {profile.educationLevel && (
              <Badge variant="outline" className="gap-1 text-xs">
                <GraduationCap className="h-3 w-3 text-brand" />
                {profile.educationLevel}
              </Badge>
            )}
            {profile.nationality && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Globe className="h-3 w-3" />
                {profile.nationality}
              </Badge>
            )}
          </div>
        </section>
      )}

      {/* Cover letter */}
      {application.coverLetter && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <FileText className="h-4 w-4 text-brand" />
            Lettre de motivation
          </h4>
          <p className="whitespace-pre-line rounded-md border bg-card p-3 text-sm text-muted-foreground">
            {application.coverLetter}
          </p>
        </section>
      )}

      {/* Internal note */}
      {application.recruiterNote && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <MessageSquare className="h-4 w-4 text-amber-600" />
            Note interne
          </h4>
          <p className="whitespace-pre-line rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {application.recruiterNote}
          </p>
        </section>
      )}

      {/* Interviews */}
      {application.interviews.length > 0 && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <CalendarClock className="h-4 w-4 text-brand" />
            Entretiens
          </h4>
          <ul className="space-y-2">
            {application.interviews.map((iv) => (
              <li
                key={iv.id}
                className="flex flex-col gap-1 rounded-md border bg-card p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-navy">
                    {formatDateTimeFr(iv.scheduledAt)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {iv.status === "Scheduled"
                      ? "Planifié"
                      : iv.status === "Completed"
                        ? "Terminé"
                        : iv.status === "Cancelled"
                          ? "Annulé"
                          : iv.status === "NoShow"
                            ? "Absent"
                            : iv.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {iv.durationMin} min
                  </span>
                  {iv.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {iv.location}
                    </span>
                  )}
                  {iv.meetingUrl && (
                    <a
                      href={iv.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-brand hover:underline"
                    >
                      <ArrowRight className="h-3 w-3" />
                      Lien visio
                    </a>
                  )}
                </div>
                {iv.note && (
                  <p className="mt-1 text-xs text-muted-foreground">{iv.note}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* History timeline */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Clock className="h-4 w-4 text-brand" />
          Historique de la candidature
        </h4>
        <ol className="space-y-3 border-l border-border pl-4">
          {application.history.map((h) => {
            const fromLabel = h.fromStatus ? getStatusMeta(h.fromStatus).label : "Création";
            const toLabel = getStatusMeta(h.toStatus).label;
            const changedByName = h.changedBy
              ? `${h.changedBy.firstName ?? ""} ${h.changedBy.lastName ?? ""}`.trim() ||
                h.changedBy.email
              : "Système";
            return (
              <li key={h.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium text-navy">{fromLabel}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-brand">{toLabel}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTimeFr(h.createdAt)} — par {changedByName}
                </div>
                {h.comment && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{h.comment}</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <DialogFooter>
        <span className="mr-auto text-xs text-muted-foreground">
          Postulé le {formatDateFr(application.createdAt)}
        </span>
      </DialogFooter>
    </div>
  );
}
