"use client";

import * as React from "react";
import {
  CalendarClock,
  AlarmClock,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";

// ─── Types ─────────────────────────────────────────────────────────────────

type ImmigrationTaskStatus = "Todo" | "InProgress" | "Done" | "Blocked";

type ImmigrationCaseStatus =
  | "Open"
  | "InProgress"
  | "DocumentsPending"
  | "VisaPending"
  | "Ready"
  | "Closed"
  | "OnHold";

interface AgentCaseListItem {
  id: string;
  status: ImmigrationCaseStatus;
  priority: string;
  openedAt: string;
  candidate: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  taskProgress: { done: number; total: number };
}

interface AgentCasesResponse {
  cases: AgentCaseListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  status: ImmigrationTaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  order: number;
}

interface CaseDetailResponse {
  case: {
    id: string;
    status: ImmigrationCaseStatus;
    tasks: TaskSummary[];
  };
}

interface FlatTask {
  taskId: string;
  title: string;
  description: string | null;
  status: ImmigrationTaskStatus;
  dueDate: string;
  caseId: string;
  candidateName: string;
  caseStatus: ImmigrationCaseStatus;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
  const now = new Date();
  // Strip the time portion so we compare calendar days only.
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t1 = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  return Math.round((t1 - t0) / (1000 * 60 * 60 * 24));
}

function fullName(first: string | null, last: string | null): string {
  return `${first ?? ""} ${last ?? ""}`.trim();
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AgentDeadlines() {
  const { navigate } = useSiteRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [upcoming, setUpcoming] = React.useState<FlatTask[]>([]);
  const [overdue, setOverdue] = React.useState<FlatTask[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Fetch the list of cases assigned to the agent.
        const listRes = await fetch("/api/agent/cases?pageSize=100", {
          credentials: "include",
        });
        if (!listRes.ok) {
          const data = (await listRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Échec du chargement des dossiers.");
        }
        const listData = (await listRes.json()) as AgentCasesResponse;
        const casesList = listData.cases ?? [];

        // 2) Fetch the detail of each case to retrieve its task checklist.
        // The list endpoint only returns taskProgress; tasks themselves come
        // from the [id] endpoint.
        const details = await Promise.all(
          casesList.map(async (c) => {
            try {
              const r = await fetch(`/api/agent/cases/${c.id}`, {
                credentials: "include",
              });
              if (!r.ok) return null;
              const d = (await r.json()) as CaseDetailResponse;
              return { caseItem: c, detail: d.case };
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;

        // 3) Flatten all tasks into a single list, keeping candidate + case context.
        const allTasks: FlatTask[] = [];
        for (const entry of details) {
          if (!entry) continue;
          const { caseItem, detail } = entry;
          for (const task of detail.tasks ?? []) {
            if (!task.dueDate) continue;
            // Only consider tasks that are not yet completed.
            if (task.status === "Done") continue;
            allTasks.push({
              taskId: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              dueDate: task.dueDate,
              caseId: caseItem.id,
              candidateName:
                fullName(
                  caseItem.candidate.firstName,
                  caseItem.candidate.lastName
                ) || caseItem.candidate.email,
              caseStatus: caseItem.status,
            });
          }
        }

        // 4) Split into upcoming (<=7 days) and overdue (<now).
        const up: FlatTask[] = [];
        const od: FlatTask[] = [];
        const now = Date.now();
        for (const t of allTasks) {
          const dueMs = new Date(t.dueDate).getTime();
          if (Number.isNaN(dueMs)) continue;
          if (dueMs < now) {
            od.push(t);
          } else if (daysUntil(t.dueDate) <= 7) {
            up.push(t);
          }
        }

        // Sort each group: upcoming by closest due date asc, overdue by most
        // overdue first (oldest due date first).
        up.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        od.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        if (!cancelled) {
          setUpcoming(up);
          setOverdue(od);
        }
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

  const goToCase = (caseId: string) => {
    navigate("dashboard", { section: "cases", case: caseId });
  };

  if (loading) {
    return <DeadlinesSkeleton />;
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

  const totalOpen = upcoming.length + overdue.length;

  return (
    <div className="space-y-6">
      <Header />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={AlarmClock}
          label="En retard"
          value={overdue.length}
          tone="danger"
        />
        <SummaryCard
          icon={CalendarClock}
          label="À venir (7 jours)"
          value={upcoming.length}
          tone="warning"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Total échéances actives"
          value={totalOpen}
          tone="neutral"
        />
      </div>

      {/* Overdue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlarmClock className="h-5 w-5 text-italian-red" />
            En retard
          </CardTitle>
          <CardDescription>
            Tâches dont l'échéance est dépassée. Traitez-les en priorité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <EmptySection
              icon={CheckCircle2}
              message="Aucune tâche en retard. Vous êtes à jour."
            />
          ) : (
            <ul className="space-y-3">
              {overdue.map((t) => (
                <TaskRow
                  key={t.taskId}
                  task={t}
                  overdue
                  onOpen={() => goToCase(t.caseId)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-brand" />
            À venir (7 jours)
          </CardTitle>
          <CardDescription>
            Échéances prévues dans les 7 prochains jours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptySection
              icon={CheckCircle2}
              message="Aucune échéance prévue dans les 7 prochains jours."
            />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((t) => (
                <TaskRow
                  key={t.taskId}
                  task={t}
                  overdue={false}
                  onOpen={() => goToCase(t.caseId)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Échéances</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Suivez les tâches à venir et en retard sur vos dossiers assignés.
      </p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "danger" | "warning" | "neutral";
}) {
  const toneClasses =
    tone === "danger"
      ? "bg-italian-red/10 text-italian-red"
      : tone === "warning"
      ? "bg-amber-50 text-amber-800"
      : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-navy">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  overdue,
  onOpen,
}: {
  task: FlatTask;
  overdue: boolean;
  onOpen: () => void;
}) {
  const days = daysUntil(task.dueDate);
  const dayLabel = overdue
    ? days === 0
      ? "Aujourd'hui"
      : `${Math.abs(days)} jour${Math.abs(days) > 1 ? "s" : ""} de retard`
    : days === 0
    ? "Aujourd'hui"
    : days === 1
    ? "Demain"
    : `Dans ${days} jours`;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {overdue ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-italian-red" />
        ) : (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-navy">{task.title}</span>
            <Badge className={taskStatusBadgeClass(task.status)}>
              {TASK_STATUS_LABELS[task.status] ?? task.status}
            </Badge>
            {overdue ? (
              <Badge className="bg-italian-red/10 text-italian-red border border-italian-red/30">
                En retard
              </Badge>
            ) : null}
          </div>
          {task.description ? (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {task.candidateName}
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {formatDateFr(task.dueDate)} · {dayLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="shrink-0">
        <Button variant="outline" size="sm" onClick={onOpen}>
          Voir le dossier
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function EmptySection({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Icon className="h-8 w-8 text-brand-green" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function DeadlinesSkeleton() {
  return (
    <div className="space-y-6">
      <Header />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
