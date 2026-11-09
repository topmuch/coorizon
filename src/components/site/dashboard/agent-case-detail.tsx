"use client";

import * as React from "react";
import {
  ArrowLeft,
  FolderOpen,
  User,
  Building2,
  Briefcase,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Calendar,
  ShieldAlert,
  ListChecks,
  Save,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// ── Local types (avoid importing @prisma/client on the client) ─────────────

type CaseStatus =
  | "Open"
  | "InProgress"
  | "DocumentsPending"
  | "VisaPending"
  | "Ready"
  | "Closed"
  | "OnHold";

type TaskStatus = "Todo" | "InProgress" | "Done" | "Blocked";

type DocumentStatus =
  | "NotProvided"
  | "Pending"
  | "Validated"
  | "Refused"
  | "Expired";

type DocumentType =
  | "CV"
  | "Passport"
  | "IDCard"
  | "Diploma"
  | "WorkCertificate"
  | "Certificate"
  | "CoverLetter"
  | "CompanyRegistration"
  | "TaxId"
  | "IDDocument"
  | "Other";

interface CandidateProfileLite {
  id: string | null;
  nationality: string | null;
  residenceCountry: string | null;
  city: string | null;
  dateOfBirth: Date | string | null;
  desiredJob: string | null;
  sector: string | null;
  educationLevel: string | null;
  italianLevel: string | null;
}

interface CandidateDocumentLite {
  id: string;
  type: DocumentType;
  fileName: string;
  status: DocumentStatus;
  createdAt: string;
}

interface CandidateLite {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  candidateProfile: CandidateProfileLite | null;
  candidateDocuments: CandidateDocumentLite[];
}

interface AgentLite {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface CompanyLite {
  id: string;
  legalName: string;
  city: string | null;
  sector: string | null;
}

interface JobOfferLite {
  id: string;
  title: string;
  city: string | null;
  contractType: string;
}

interface TaskLite {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  assigneeId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string | null; lastName: string | null } | null;
}

interface CaseLite {
  id: string;
  candidateId: string;
  agentId: string | null;
  companyId: string | null;
  jobOfferId: string | null;
  status: CaseStatus;
  priority: string;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: CandidateLite;
  agent: AgentLite | null;
  company: CompanyLite | null;
  jobOffer: JobOfferLite | null;
  tasks: TaskLite[];
}

interface CaseResponse {
  case: CaseLite;
}

// ── Static config & labels ─────────────────────────────────────────────────

const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  Open: "Ouvert",
  InProgress: "En cours",
  DocumentsPending: "Documents en attente",
  VisaPending: "Visa en attente",
  Ready: "Prêt",
  Closed: "Clôturé",
  OnHold: "En pause",
};

const CASE_STATUS_ORDER: CaseStatus[] = [
  "Open",
  "InProgress",
  "DocumentsPending",
  "VisaPending",
  "Ready",
  "Closed",
  "OnHold",
];

interface CaseStatusMeta {
  label: string;
  className: string;
}

function caseStatusMeta(status: CaseStatus): CaseStatusMeta {
  switch (status) {
    case "Open":
      return {
        label: CASE_STATUS_LABELS.Open,
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
    case "InProgress":
      return {
        label: CASE_STATUS_LABELS.InProgress,
        className: "border-sky-200 bg-sky-100 text-sky-800",
      };
    case "DocumentsPending":
      return {
        label: CASE_STATUS_LABELS.DocumentsPending,
        className: "border-amber-200 bg-amber-100 text-amber-800",
      };
    case "VisaPending":
      return {
        label: CASE_STATUS_LABELS.VisaPending,
        className: "border-orange-200 bg-orange-100 text-orange-800",
      };
    case "Ready":
      return {
        label: CASE_STATUS_LABELS.Ready,
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
      };
    case "Closed":
      return {
        label: CASE_STATUS_LABELS.Closed,
        className: "border-emerald-300 bg-emerald-200 text-emerald-900",
      };
    case "OnHold":
      return {
        label: CASE_STATUS_LABELS.OnHold,
        className: "border-zinc-200 bg-zinc-100 text-zinc-700",
      };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  Todo: "À faire",
  InProgress: "En cours",
  Done: "Terminée",
  Blocked: "Bloquée",
};

const TASK_STATUS_ORDER: TaskStatus[] = ["Todo", "InProgress", "Done", "Blocked"];

interface TaskStatusMeta {
  label: string;
  className: string;
}

function taskStatusMeta(status: TaskStatus): TaskStatusMeta {
  switch (status) {
    case "Todo":
      return {
        label: TASK_STATUS_LABELS.Todo,
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
    case "InProgress":
      return {
        label: TASK_STATUS_LABELS.InProgress,
        className: "border-sky-200 bg-sky-100 text-sky-800",
      };
    case "Done":
      return {
        label: TASK_STATUS_LABELS.Done,
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
      };
    case "Blocked":
      return {
        label: TASK_STATUS_LABELS.Blocked,
        className: "border-red-200 bg-red-100 text-red-800",
      };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

const PRIORITY_LABELS: Record<string, string> = {
  Normal: "Normal",
  Haute: "Haute",
  Urgente: "Urgente",
};

function priorityMeta(priority: string): { label: string; className: string } {
  switch (priority) {
    case "Urgente":
      return {
        label: "Urgente",
        className: "border-red-200 bg-red-100 text-red-800",
      };
    case "Haute":
      return {
        label: "Haute",
        className: "border-orange-200 bg-orange-100 text-orange-800",
      };
    case "Normal":
    default:
      return {
        label: "Normal",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  CV: "CV",
  Passport: "Passeport",
  IDCard: "Pièce d'identité",
  Diploma: "Diplôme",
  WorkCertificate: "Certificat de travail",
  Certificate: "Attestation",
  CoverLetter: "Lettre de motivation",
  CompanyRegistration: "Extrait de registre",
  TaxId: "Code fiscal",
  IDDocument: "Pièce d'identité",
  Other: "Autre",
};

function docStatusMeta(status: DocumentStatus): { label: string; className: string } {
  switch (status) {
    case "Validated":
      return {
        label: "Validé",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
      };
    case "Pending":
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-100 text-amber-800",
      };
    case "Refused":
      return {
        label: "Refusé",
        className: "border-red-200 bg-red-100 text-red-800",
      };
    case "Expired":
      return {
        label: "Expiré",
        className: "border-red-200 bg-red-100 text-red-800",
      };
    case "NotProvided":
    default:
      return {
        label: "Non fourni",
        className: "bg-muted text-muted-foreground",
      };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function fullName(first: string | null, last: string | null, fallback: string): string {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name.length > 0 ? name : fallback;
}

// ── Main component ─────────────────────────────────────────────────────────

export function AgentCaseDetail() {
  const { params, navigate } = useSiteRouter();
  const { toast } = useToast();
  const caseId = params.get("case");

  const [data, setData] = React.useState<CaseLite | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Notes editor.
  const [notesDraft, setNotesDraft] = React.useState("");
  const [notesPristine, setNotesPristine] = React.useState(true);
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Status change flow (with confirmation gate for Ready / Closed).
  const [pendingStatus, setPendingStatus] = React.useState<CaseStatus | null>(null);
  const [confirmedOfficial, setConfirmedOfficial] = React.useState(false);
  const [savingStatus, setSavingStatus] = React.useState(false);

  // Task dialogs.
  const [addTaskOpen, setAddTaskOpen] = React.useState(false);
  const [editTask, setEditTask] = React.useState<TaskLite | null>(null);
  const [deleteTask, setDeleteTask] = React.useState<TaskLite | null>(null);
  const [busyTaskId, setBusyTaskId] = React.useState<string | null>(null);

  // Redirect to the cases list if no case id is present.
  React.useEffect(() => {
    if (!caseId) {
      navigate("dashboard", { section: "cases" });
    }
  }, [caseId, navigate]);

  const fetchCase = React.useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/cases/${encodeURIComponent(caseId)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 403) {
          setError("Ce dossier ne vous est pas assigné.");
        } else if (res.status === 404) {
          setError("Dossier introuvable.");
        } else {
          setError(payload.error ?? "Impossible de charger le dossier.");
        }
        return;
      }
      const payload = (await res.json()) as CaseResponse;
      setData(payload.case);
      setNotesDraft(payload.case.notes ?? "");
      setNotesPristine(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  React.useEffect(() => {
    void fetchCase();
  }, [fetchCase]);

  // ── Case status change ──────────────────────────────────────────────────

  const handleStatusSelect = (value: string) => {
    if (!data) return;
    const next = value as CaseStatus;
    if (next === data.status) return;
    if (next === "Ready" || next === "Closed") {
      // Open the confirmation dialog. Do NOT call the API yet.
      setPendingStatus(next);
      setConfirmedOfficial(false);
    } else {
      void commitStatusChange(next, false);
    }
  };

  const commitStatusChange = async (next: CaseStatus, confirmed: boolean) => {
    if (!caseId || !data) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/agent/cases/${encodeURIComponent(caseId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: next, confirmation: confirmed }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Modification impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }
      const payload = (await res.json()) as CaseResponse;
      setData(payload.case);
      toast({
        title: "Statut mis à jour",
        description: `Le dossier est désormais « ${caseStatusMeta(next).label} ».`,
      });
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSavingStatus(false);
      setPendingStatus(null);
      setConfirmedOfficial(false);
    }
  };

  // ── Priority change ─────────────────────────────────────────────────────

  const handlePriorityChange = async (value: string) => {
    if (!caseId || !data) return;
    if (value === data.priority) return;
    try {
      const res = await fetch(`/api/agent/cases/${encodeURIComponent(caseId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priority: value }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Modification impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }
      const payload = (await res.json()) as CaseResponse;
      setData(payload.case);
      toast({
        title: "Priorité mise à jour",
        description: `Nouvelle priorité : ${PRIORITY_LABELS[value] ?? value}.`,
      });
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
    }
  };

  // ── Notes save ──────────────────────────────────────────────────────────

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesDraft(e.target.value);
    setNotesPristine(e.target.value === (data?.notes ?? ""));
  };

  const handleNotesSave = async () => {
    if (!caseId || !data || notesPristine) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/agent/cases/${encodeURIComponent(caseId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Enregistrement impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }
      const payload = (await res.json()) as CaseResponse;
      setData(payload.case);
      setNotesPristine(true);
      toast({ title: "Notes enregistrées" });
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Tasks: create / toggle / status / edit / delete ─────────────────────

  const handleTaskToggleDone = async (task: TaskLite) => {
    if (!caseId) return;
    const nextStatus: TaskStatus = task.status === "Done" ? "Todo" : "Done";
    setBusyTaskId(task.id);
    try {
      const res = await fetch(`/api/agent/tasks/${encodeURIComponent(task.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Action impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }
      const payload = (await res.json()) as { task: TaskLite };
      setData((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? payload.task : t)) }
          : prev
      );
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleTaskStatusChange = async (task: TaskLite, value: string) => {
    const next = value as TaskStatus;
    if (next === task.status) return;
    setBusyTaskId(task.id);
    try {
      const res = await fetch(`/api/agent/tasks/${encodeURIComponent(task.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Modification impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }
      const payload = (await res.json()) as { task: TaskLite };
      setData((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? payload.task : t)) }
          : prev
      );
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleTaskCreated = async (input: {
    title: string;
    description: string;
    dueDate: string;
  }) => {
    if (!caseId) return;
    try {
      const res = await fetch(
        `/api/agent/cases/${encodeURIComponent(caseId)}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: input.title,
            description: input.description || undefined,
            dueDate: input.dueDate || undefined,
            order: data ? data.tasks.length : 0,
          }),
        }
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Création impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return false;
      }
      const payload = (await res.json()) as { task: TaskLite };
      setData((prev) =>
        prev ? { ...prev, tasks: [...prev.tasks, payload.task] } : prev
      );
      toast({ title: "Tâche ajoutée", description: input.title });
      return true;
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleTaskEdited = async (
    task: TaskLite,
    input: { title: string; description: string; dueDate: string }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/agent/tasks/${encodeURIComponent(task.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: input.title,
          description: input.description || null,
          dueDate: input.dueDate || null,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Modification impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return false;
      }
      const payload = (await res.json()) as { task: TaskLite };
      setData((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? payload.task : t)) }
          : prev
      );
      toast({ title: "Tâche modifiée" });
      return true;
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleTaskDelete = async (task: TaskLite) => {
    setBusyTaskId(task.id);
    try {
      const res = await fetch(`/api/agent/tasks/${encodeURIComponent(task.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Suppression impossible",
          description: payload.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }
      setData((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== task.id) } : prev
      );
      toast({ title: "Tâche supprimée" });
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Veuillez réessayer dans un instant.",
        variant: "destructive",
      });
    } finally {
      setBusyTaskId(null);
      setDeleteTask(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return <CaseDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => navigate("dashboard", { section: "cases" })} />
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="mt-4 text-sm text-muted-foreground">
              {error ?? "Impossible de charger le dossier."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("dashboard", { section: "cases" })}
            >
              Retour aux dossiers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMeta = caseStatusMeta(data.status);
  const priority = priorityMeta(data.priority);

  const doneCount = data.tasks.filter((t) => t.status === "Done").length;
  const total = data.tasks.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate("dashboard", { section: "cases" })} />

      {/* Persistent critical warning */}
      <Alert className="border-amber-300 bg-amber-50 text-amber-900">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">
          Règle importante — confirmation officielle
        </AlertTitle>
        <AlertDescription className="text-amber-800">
          Ne déclarez jamais une autorisation ou un visa comme obtenu sans
          confirmation officielle des autorités compétentes. Les statuts
          «&nbsp;Prêt&nbsp;» et «&nbsp;Clôturé&nbsp;» ne peuvent être activés
          qu&apos;après une confirmation explicite de votre part.
        </AlertDescription>
      </Alert>

      {/* Header card: identity + status + priority */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5" />
                Dossier d&apos;immigration
              </div>
              <CardTitle className="text-xl text-navy sm:text-2xl">
                {fullName(
                  data.candidate.firstName,
                  data.candidate.lastName,
                  data.candidate.email
                )}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {data.candidate.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Ouvert le {formatDate(data.openedAt)}
                </span>
                {data.closedAt && (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Clôturé le {formatDate(data.closedAt)}
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Badge className={`px-3 py-1 text-sm ${statusMeta.className}`}>
                {statusMeta.label}
              </Badge>
              <Badge className={`px-2 py-1 text-xs ${priority.className}`}>
                Priorité&nbsp;: {priority.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Statut du dossier
              </Label>
              <Select
                value={data.status}
                onValueChange={handleStatusSelect}
                disabled={savingStatus}
              >
                <SelectTrigger className="w-full" aria-label="Statut du dossier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_STATUS_ORDER.map((s) => {
                    const meta = caseStatusMeta(s);
                    return (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-2 w-2 rounded-full border ${meta.className}`}
                          />
                          {meta.label}
                          {(s === "Ready" || s === "Closed") && (
                            <span className="text-amber-600">⚠</span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {(data.status === "Ready" || data.status === "Closed") && (
                <p className="text-xs text-emerald-700">
                  Ce dossier a été marqué comme «&nbsp;{statusMeta.label}&nbsp;»
                  après confirmation officielle.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Priorité
              </Label>
              <Select value={data.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-full" aria-label="Priorité">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Normal", "Haute", "Urgente"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Candidate info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-navy">
              <User className="h-4 w-4" /> Candidat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateInfo candidate={data.candidate} />
          </CardContent>
        </Card>

        {/* Job & company */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-navy">
              <Briefcase className="h-4 w-4" /> Emploi &amp; entreprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.jobOffer || data.company ? (
              <JobCompanyInfo jobOffer={data.jobOffer} company={data.company} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune offre ni entreprise rattachée à ce dossier.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-navy">
            <FileText className="h-4 w-4" /> Documents du candidat
          </CardTitle>
          <CardDescription>
            Liste en lecture seule — téléchargement non disponible pour le LOT 7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsList documents={data.candidate.candidateDocuments} />
        </CardContent>
      </Card>

      {/* Checklist (tasks) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base text-navy">
                <ListChecks className="h-4 w-4" /> Checklist du dossier
              </CardTitle>
              <CardDescription>
                {total > 0
                  ? `${doneCount}/${total} tâche${total > 1 ? "s" : ""} terminée${
                      doneCount > 1 ? "s" : ""
                    }`
                  : "Aucune tâche pour l'instant."}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddTaskOpen(true)}>
              <Plus className="h-4 w-4" /> Ajouter une tâche
            </Button>
          </div>
          {total > 0 && (
            <div className="mt-2 space-y-1.5">
              <Progress value={progressPct} className="h-2" />
              <p className="text-right text-xs text-muted-foreground">
                {progressPct}% complété
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Circle className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucune tâche. Ajoutez votre première étape de suivi.
                </p>
              </div>
            ) : (
              data.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  busy={busyTaskId === task.id}
                  onToggleDone={() => void handleTaskToggleDone(task)}
                  onStatusChange={(v) => void handleTaskStatusChange(task, v)}
                  onEdit={() => setEditTask(task)}
                  onDelete={() => setDeleteTask(task)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-navy">
            <FileText className="h-4 w-4" /> Notes internes
          </CardTitle>
          <CardDescription>
            Visibles par vous et les autres agents autorisés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notesDraft}
            onChange={handleNotesChange}
            placeholder="Ajoutez vos notes de suivi…"
            rows={6}
            className="resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {notesPristine
                ? "À jour."
                : "Modifications non enregistrées."}
            </p>
            <Button
              size="sm"
              onClick={() => void handleNotesSave()}
              disabled={notesPristine || savingNotes}
            >
              {savingNotes ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add task dialog */}
      <AddTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        onSubmit={async (input) => {
          const ok = await handleTaskCreated(input);
          if (ok) setAddTaskOpen(false);
        }}
      />

      {/* Edit task dialog */}
      <EditTaskDialog
        task={editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
        onSubmit={async (input) => {
          if (!editTask) return false;
          const ok = await handleTaskEdited(editTask, input);
          if (ok) setEditTask(null);
          return ok;
        }}
      />

      {/* Delete task confirmation */}
      <AlertDialog
        open={deleteTask !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTask(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTask
                ? `« ${deleteTask.title} » sera définitivement supprimée de la checklist.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={busyTaskId === deleteTask?.id}
              onClick={() => {
                if (deleteTask) void handleTaskDelete(deleteTask);
              }}
            >
              {busyTaskId === deleteTask?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status confirmation dialog (Ready / Closed) */}
      <Dialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null);
            setConfirmedOfficial(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-900">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Confirmation requise
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de passer ce dossier au statut
              «&nbsp;<strong>{pendingStatus ? caseStatusMeta(pendingStatus).label : ""}</strong>&nbsp;».
              Avez-vous reçu la confirmation officielle que
              l&apos;autorisation / visa a été obtenue ?
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Ne cochez cette case que si vous disposez d&apos;une confirmation
              écrite des autorités compétentes. Toute fausse déclaration est
              votre responsabilité.
            </AlertDescription>
          </Alert>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox
              checked={confirmedOfficial}
              onCheckedChange={(v) => setConfirmedOfficial(v === true)}
              className="mt-0.5"
            />
            <span className="text-foreground">
              Je confirme avoir reçu la confirmation officielle de
              l&apos;obtention du visa / de l&apos;autorisation.
            </span>
          </label>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              disabled={!confirmedOfficial || savingStatus}
              onClick={() => {
                if (pendingStatus) void commitStatusChange(pendingStatus, true);
              }}
            >
              {savingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="text-muted-foreground">
      <ArrowLeft className="h-4 w-4" /> Retour aux dossiers
    </Button>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm text-foreground">
          {value === null || value === undefined || value === ""
            ? "—"
            : value}
        </div>
      </div>
    </div>
  );
}

function CandidateInfo({ candidate }: { candidate: CandidateLite }) {
  const p = candidate.candidateProfile;
  return (
    <div className="divide-y">
      <InfoRow
        icon={User}
        label="Nom complet"
        value={fullName(candidate.firstName, candidate.lastName, candidate.email)}
      />
      <InfoRow icon={User} label="Email" value={candidate.email} />
      <InfoRow
        icon={User}
        label="Nationalité"
        value={p?.nationality ?? null}
      />
      <InfoRow
        icon={User}
        label="Pays de résidence"
        value={p?.residenceCountry ?? null}
      />
      <InfoRow icon={User} label="Ville" value={p?.city ?? null} />
      <InfoRow
        icon={Calendar}
        label="Date de naissance"
        value={p?.dateOfBirth ? formatDate(String(p.dateOfBirth)) : null}
      />
      <InfoRow
        icon={Briefcase}
        label="Poste recherché"
        value={p?.desiredJob ?? null}
      />
      <InfoRow icon={Briefcase} label="Secteur" value={p?.sector ?? null} />
      <InfoRow
        icon={User}
        label="Niveau d'études"
        value={p?.educationLevel ?? null}
      />
      <InfoRow
        icon={User}
        label="Niveau d'italien"
        value={p?.italianLevel ?? null}
      />
    </div>
  );
}

function JobCompanyInfo({
  jobOffer,
  company,
}: {
  jobOffer: JobOfferLite | null;
  company: CompanyLite | null;
}) {
  return (
    <div className="space-y-4">
      {jobOffer && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" /> Offre d&apos;emploi
          </div>
          <div className="rounded-lg border bg-surface p-3">
            <div className="text-sm font-medium text-navy">{jobOffer.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {jobOffer.city ?? "—"} · {jobOffer.contractType}
            </div>
          </div>
        </div>
      )}
      {company && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Entreprise
          </div>
          <div className="rounded-lg border bg-surface p-3">
            <div className="text-sm font-medium text-navy">
              {company.legalName}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {[company.city, company.sector].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>
      )}
      {!jobOffer && !company && (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function DocumentsList({ documents }: { documents: CandidateDocumentLite[] }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucun document téléversé par le candidat.
      </div>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {documents.map((doc) => {
        const meta = docStatusMeta(doc.status);
        return (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {doc.fileName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {DOC_TYPE_LABELS[doc.type] ?? doc.type} ·{" "}
                  {formatDate(doc.createdAt)}
                </div>
              </div>
            </div>
            <Badge className={`shrink-0 ${meta.className}`}>{meta.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}

function TaskRow({
  task,
  busy,
  onToggleDone,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: TaskLite;
  busy: boolean;
  onToggleDone: () => void;
  onStatusChange: (value: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = taskStatusMeta(task.status);
  const overdue = task.status !== "Done" && isOverdue(task.dueDate);
  return (
    <div className="rounded-lg border p-3 transition-colors hover:bg-accent/30">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggleDone}
          disabled={busy}
          aria-label={
            task.status === "Done"
              ? "Marquer comme à faire"
              : "Marquer comme terminée"
          }
          className="mt-0.5 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {task.status === "Done" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-medium ${
                task.status === "Done"
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {task.title}
            </span>
            <Badge className={`text-[10px] ${meta.className}`}>{meta.label}</Badge>
            {overdue && (
              <Badge className="border-red-200 bg-red-100 text-[10px] text-red-800">
                <Clock className="h-3 w-3" /> En retard
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 ${overdue ? "text-red-700" : ""}`}>
                <Calendar className="h-3 w-3" />
                Échéance&nbsp;: {formatDate(task.dueDate)}
              </span>
            )}
            {task.completedAt && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Terminée le {formatDate(task.completedAt)}
              </span>
            )}
            {task.assignee && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {fullName(
                  task.assignee.firstName,
                  task.assignee.lastName,
                  "Agent"
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Select
            value={task.status}
            onValueChange={onStatusChange}
            disabled={busy}
          >
            <SelectTrigger size="sm" className="h-8 w-[130px]" aria-label="Statut de la tâche">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
            aria-label="Modifier la tâche"
            disabled={busy}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Supprimer la tâche"
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Dialogs ────────────────────────────────────────────────────────────────

interface TaskFormValues {
  title: string;
  description: string;
  dueDate: string;
}

function useTaskForm(initial: TaskFormValues) {
  const [title, setTitle] = React.useState(initial.title);
  const [description, setDescription] = React.useState(initial.description);
  const [dueDate, setDueDate] = React.useState(initial.dueDate);

  React.useEffect(() => {
    setTitle(initial.title);
    setDescription(initial.description);
    setDueDate(initial.dueDate);
  }, [initial.title, initial.description, initial.dueDate]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    dueDate,
    setDueDate,
    values: { title, description, dueDate },
  };
}

function AddTaskDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: TaskFormValues) => Promise<boolean>;
}) {
  const form = useTaskForm({ title: "", description: "", dueDate: "" });
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    form.setTitle("");
    form.setDescription("");
    form.setDueDate("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Ajouter une tâche
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle étape dans la checklist du dossier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Titre</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => form.setTitle(e.target.value)}
              placeholder="Ex. Dépôt de la demande de nulla osta"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description (optionnelle)</Label>
            <Textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              rows={3}
              placeholder="Précisions, références, liens…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Date d&apos;échéance (optionnelle)</Label>
            <Input
              id="task-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => form.setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            disabled={form.title.trim().length === 0 || submitting}
            onClick={async () => {
              setSubmitting(true);
              const ok = await onSubmit({
                title: form.title.trim(),
                description: form.description.trim(),
                dueDate: form.dueDate,
              });
              setSubmitting(false);
              if (ok) reset();
            }}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTaskDialog({
  task,
  onOpenChange,
  onSubmit,
}: {
  task: TaskLite | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: TaskFormValues) => Promise<boolean>;
}) {
  const open = task !== null;
  const initial: TaskFormValues = React.useMemo(
    () => ({
      title: task?.title ?? "",
      description: task?.description ?? "",
      dueDate: toInputDate(task?.dueDate ?? null),
    }),
    [task]
  );
  const form = useTaskForm(initial);
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" /> Modifier la tâche
          </DialogTitle>
          <DialogDescription>
            Mettez à jour le titre, la description et l&apos;échéance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Titre</Label>
            <Input
              id="edit-title"
              value={form.title}
              onChange={(e) => form.setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-due">Date d&apos;échéance</Label>
            <Input
              id="edit-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => form.setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            disabled={form.title.trim().length === 0 || submitting}
            onClick={async () => {
              setSubmitting(true);
              await onSubmit({
                title: form.title.trim(),
                description: form.description.trim(),
                dueDate: form.dueDate,
              });
              setSubmitting(false);
            }}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function CaseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
