"use client";

import * as React from "react";
import {
  CalendarClock,
  MapPin,
  Video,
  Clock,
  Users,
  ArrowRight,
  Mail,
  Phone,
  Briefcase,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useSiteRouter } from "@/lib/site-router";

// ─── Types ─────────────────────────────────────────────────────────────────

interface InterviewCandidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

interface InterviewOffer {
  id: string;
  title: string;
  city: string | null;
}

interface InterviewApplication {
  jobOffer: InterviewOffer;
}

interface Interview {
  id: string;
  applicationId: string;
  candidateId: string;
  scheduledAt: string;
  durationMin: number;
  location: string | null;
  meetingUrl: string | null;
  status: string;
  note: string | null;
  candidate: InterviewCandidate;
  application: InterviewApplication;
}

interface InterviewsResponse {
  interviews: Interview[];
}

// ─── Date helpers ─────────────────────────────────────────────────────────

function formatDateTimeFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function isUpcoming(iv: Interview): boolean {
  if (iv.status === "Scheduled") {
    return new Date(iv.scheduledAt).getTime() >= Date.now();
  }
  return false;
}

function interviewStatusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "Scheduled":
      return { label: "Planifié", className: "bg-brand text-white" };
    case "Completed":
      return { label: "Terminé", className: "bg-brand-green/15 text-brand-green" };
    case "Cancelled":
      return { label: "Annulé", className: "bg-italian-red/10 text-italian-red" };
    case "NoShow":
      return { label: "Absent", className: "bg-amber-100 text-amber-800" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export function RecruiterInterviews() {
  const { navigate } = useSiteRouter();

  const [interviews, setInterviews] = React.useState<Interview[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");

  // Fetch interviews on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/recruiter/interviews", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Échec du chargement des entretiens.");
        }
        const data = (await res.json()) as InterviewsResponse;
        if (!cancelled) setInterviews(data.interviews);
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

  const upcoming = React.useMemo(
    () =>
      interviews
        .filter((iv) => isUpcoming(iv))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [interviews]
  );

  const past = React.useMemo(
    () =>
      interviews
        .filter((iv) => !isUpcoming(iv))
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [interviews]
  );

  const visible = tab === "upcoming" ? upcoming : past;

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy">Entretiens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivez les entretiens programmés avec les candidats et consultez l'historique de vos
          rencontres passées.
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
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <CalendarClock className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy">Aucun entretien programmé</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Vous n'avez pas encore planifié d'entretien. Allez dans vos candidatures pour
              présélectionner un profil et programmer un entretien.
            </p>
            <Button
              className="mt-4 bg-brand text-white hover:bg-brand/90"
              onClick={() => navigate("dashboard", { section: "applications" })}
            >
              <Users className="mr-2 h-4 w-4" />
              Voir les candidatures
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")} className="w-full">
            <TabsList className="flex w-full max-w-md">
              <TabsTrigger value="upcoming" className="flex-1">
                À venir ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1">
                Passés ({past.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {visible.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {tab === "upcoming"
                    ? "Aucun entretien à venir."
                    : "Aucun entretien passé."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-4">
              {visible.map((iv) => (
                <InterviewCard key={iv.id} interview={iv} upcoming={tab === "upcoming"} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ─── Interview card ───────────────────────────────────────────────────────

function InterviewCard({
  interview,
  upcoming,
}: {
  interview: Interview;
  upcoming: boolean;
}) {
  const candidate = interview.candidate;
  const offer = interview.application.jobOffer;
  const fullName =
    `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Candidat";
  const initials = (
    (candidate.firstName?.[0] ?? "") + (candidate.lastName?.[0] ?? "")
  ).toUpperCase();
  const statusMeta = interviewStatusLabel(interview.status);

  return (
    <li>
      <Card className={`transition-all hover:shadow-sm ${upcoming ? "border-brand/20" : ""}`}>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                  {initials || <Users className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-navy">{fullName}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-brand" />
                    <span className="truncate font-medium text-navy">{offer.title}</span>
                    {offer.city && (
                      <span className="text-muted-foreground">— {offer.city}</span>
                    )}
                  </p>
                </div>
              </div>
              <Badge className={`px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}>
                {statusMeta.label}
              </Badge>
            </div>

            {/* Date / duration */}
            <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-brand" />
                <span className="font-medium text-navy">{formatDateTimeFr(interview.scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" />
                <span className="text-muted-foreground">{interview.durationMin} minutes</span>
              </div>
              {interview.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand" />
                  <span className="text-muted-foreground">{interview.location}</span>
                </div>
              )}
              {interview.meetingUrl && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-brand" />
                  <a
                    href={interview.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-brand hover:underline"
                  >
                    Lien visio
                  </a>
                </div>
              )}
            </div>

            {/* Candidate contact */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {candidate.email}
              </span>
              {candidate.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {candidate.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {offer.city ?? "Lieu non précisé"}
              </span>
            </div>

            {interview.note && (
              <>
                <Separator />
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold">Note :</span> {interview.note}
                </p>
              </>
            )}

            {interview.meetingUrl && upcoming && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  asChild
                  className="bg-brand text-white hover:bg-brand/90"
                >
                  <a href={interview.meetingUrl} target="_blank" rel="noreferrer">
                    <Video className="mr-1.5 h-3.5 w-3.5" />
                    Rejoindre l'entretien
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
