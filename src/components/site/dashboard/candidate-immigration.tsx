"use client";

import * as React from "react";
import {
  Plane,
  User,
  Building2,
  Briefcase,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ListChecks,
  Calendar,
  Mail,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Types ─────────────────────────────────────────────────────────────────

type ImmigrationCaseStatus =
  | "Open"
  | "InProgress"
  | "DocumentsPending"
  | "VisaPending"
  | "Ready"
  | "Closed"
  | "OnHold";

type ImmigrationTaskStatus = "Todo" | "InProgress" | "Done" | "Blocked";

interface AgentSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface CompanySummary {
  id: string;
  legalName: string;
  city: string | null;
}

interface JobOfferSummary {
  id: string;
  title: string;
  city: string | null;
}

interface ImmigrationTask {
  id: string;
  title: string;
  description: string | null;
  status: ImmigrationTaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  order: number;
}

interface ImmigrationCase {
  id: string;
  status: ImmigrationCaseStatus;
  priority: string;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  agent: AgentSummary | null;
  company: CompanySummary | null;
  jobOffer: JobOfferSummary | null;
  tasks: ImmigrationTask[];
}

interface CaseResponse {
  case: ImmigrationCase | null;
}

// ─── Status metadata ───────────────────────────────────────────────────────

const STATUS_LABELS: Record<ImmigrationCaseStatus, string> = {
  Open: "Ouvert",
  InProgress: "En cours",
  DocumentsPending: "Documents en attente",
  VisaPending: "Visa en attente",
  Ready: "Prêt",
  Closed: "Clôturé",
  OnHold: "En pause",
};

function caseStatusBadgeClass(status: ImmigrationCaseStatus): string {
  switch (status) {
    case "Open":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "InProgress":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "DocumentsPending":
      return "bg-orange-50 text-orange-800 border border-orange-200";
    case "VisaPending":
      return "bg-purple-50 text-purple-800 border border-purple-200";
    case "Ready":
      return "bg-brand-green/15 text-brand-green border border-brand-green/30";
    case "Closed":
      return "bg-muted text-muted-foreground border border-border";
    case "OnHold":
      return "bg-muted text-muted-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

const TASK_STATUS_LABELS: Record<ImmigrationTaskStatus, string> = {
  Todo: "À faire",
  InProgress: "En cours",
  Done: "Terminée",
  Blocked: "Bloquée",
};

function taskStatusBadgeClass(status: ImmigrationTaskStatus): string {
  switch (status) {
    case "Todo":
      return "bg-muted text-muted-foreground border border-border";
    case "InProgress":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Done":
      return "bg-brand-green/15 text-brand-green border border-brand-green/30";
    case "Blocked":
      return "bg-italian-red/10 text-italian-red border border-italian-red/30";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

const PRIORITY_LABELS: Record<string, string> = {
  Normal: "Normal",
  Haute: "Haute",
  Urgente: "Urgente",
};

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "Urgente":
      return "bg-italian-red/10 text-italian-red border border-italian-red/30";
    case "Haute":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "Normal":
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

// ─── Date helpers ──────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CandidateImmigration() {
  const [immigrationCase, setImmigrationCase] = React.useState<ImmigrationCase | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/candidate/immigration", {
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            data.error || "Échec du chargement de votre dossier administratif."
          );
        }
        const data = (await res.json()) as CaseResponse;
        if (!cancelled) setImmigrationCase(data.case);
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

  if (loading) {
    return <CandidateImmigrationSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!immigrationCase) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plane className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-navy">
              Aucun dossier administratif
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Vous n'avez pas encore de dossier d'immigration. Un agent COORIZON
              créera votre dossier dès que votre parcours de recrutement
              avancera. Vous serez notifié à ce moment-là.
            </p>
          </CardContent>
        </Card>
        <Disclaimer />
      </div>
    );
  }

  const tasks = immigrationCase.tasks ?? [];
  const doneCount = tasks.filter((t) => t.status === "Done").length;
  const totalCount = tasks.length;
  const progressPct =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <Header />

      {/* Case header card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Plane className="h-5 w-5 text-brand" />
                Mon dossier administratif
              </CardTitle>
              <CardDescription>
                Ouvert le {formatDateFr(immigrationCase.openedAt)}
                {immigrationCase.closedAt
                  ? ` · Clôturé le ${formatDateFr(immigrationCase.closedAt)}`
                  : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={caseStatusBadgeClass(immigrationCase.status)}>
                {STATUS_LABELS[immigrationCase.status] ?? immigrationCase.status}
              </Badge>
              <Badge className={priorityBadgeClass(immigrationCase.priority)}>
                Priorité&nbsp;: {PRIORITY_LABELS[immigrationCase.priority] ?? immigrationCase.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Agent info + Job/Company cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard
          icon={User}
          title="Votre agent"
          description="Personne en charge de votre dossier."
        >
          {immigrationCase.agent ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-navy">
                  {immigrationCase.agent.firstName ?? ""}{" "}
                  {immigrationCase.agent.lastName ?? ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${immigrationCase.agent.email}`}
                  className="text-brand hover:underline"
                >
                  {immigrationCase.agent.email}
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun agent n'est actuellement assigné à votre dossier. Un agent
              sera bientôt désigné.
            </p>
          )}
        </InfoCard>

        {immigrationCase.jobOffer || immigrationCase.company ? (
          <InfoCard
            icon={Briefcase}
            title="Poste & entreprise"
            description="Offre d'emploi liée à votre dossier."
          >
            <div className="space-y-2 text-sm">
              {immigrationCase.jobOffer && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-navy">
                    {immigrationCase.jobOffer.title}
                  </span>
                </div>
              )}
              {immigrationCase.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-navy">
                    {immigrationCase.company.legalName}
                  </span>
                </div>
              )}
              {(immigrationCase.jobOffer?.city ||
                immigrationCase.company?.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {immigrationCase.jobOffer?.city ??
                      immigrationCase.company?.city}
                  </span>
                </div>
              )}
            </div>
          </InfoCard>
        ) : null}
      </div>

      {/* Checklist card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-brand" />
            Étapes du dossier
          </CardTitle>
          <CardDescription>
            Suivi informatif des étapes administratives. Lecture seule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalCount > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {doneCount}/{totalCount} étapes terminées
                  </span>
                  <span className="font-medium text-navy">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
              <Separator />
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <TaskStatusIcon status={task.status} />
                      <div className="space-y-1">
                        <div className="font-medium text-navy">{task.title}</div>
                        {task.description ? (
                          <p className="text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <Badge className={taskStatusBadgeClass(task.status)}>
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                      {task.dueDate ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDateFr(task.dueDate)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune étape n'a été ajoutée à votre dossier pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes card */}
      {immigrationCase.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-brand" />
              Notes de votre agent
            </CardTitle>
            <CardDescription>
              Informations et instructions laissées par votre agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {immigrationCase.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Disclaimer />
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Dossier administratif</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Suivez l'avancement de votre parcours d'immigration vers l'Italie.
      </p>
    </div>
  );
}

function Disclaimer() {
  return (
    <Alert>
      <ShieldCheck className="h-4 w-4 text-brand" />
      <AlertDescription>
        <strong>Avertissement important&nbsp;:</strong> COORIZON ne garantit
        aucun visa ou autorisation. Les décisions relèvent des autorités
        consulaires et gouvernementales italiennes. Les statuts affichés ici
        sont informatifs et ne constituent pas une décision officielle.
      </AlertDescription>
    </Alert>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-brand" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TaskStatusIcon({ status }: { status: ImmigrationTaskStatus }) {
  switch (status) {
    case "Done":
      return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />;
    case "InProgress":
      return <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />;
    case "Blocked":
      return <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-italian-red" />;
    case "Todo":
    default:
      return <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />;
  }
}

function CandidateImmigrationSkeleton() {
  return (
    <div className="space-y-6">
      <Header />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
