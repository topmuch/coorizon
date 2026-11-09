"use client";

import * as React from "react";
import {
  FileText,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  FileX,
  Lightbulb,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

/**
 * CandidateCv — "Mon CV" dashboard section (LOT 3 — Task 3-c).
 *
 * A focused page for the candidate's most important document: the CV.
 * Reuses the same /api/candidate/documents endpoints (type = "CV").
 */

// ---- Local types ---------------------------------------------------------

type DocumentStatus =
  | "NotProvided"
  | "Pending"
  | "Validated"
  | "Refused"
  | "Expired";

interface CandidateDocument {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

// ---- Helpers -------------------------------------------------------------

interface StatusMeta {
  label: string;
  className: string;
  icon?: LucideIcon;
}

function statusBadge(status: DocumentStatus): StatusMeta {
  switch (status) {
    case "Validated":
      return {
        label: "Validé",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      };
    case "Pending":
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-100 text-amber-800",
        icon: Clock,
      };
    case "Refused":
      return {
        label: "Refusé",
        className: "border-red-200 bg-red-100 text-red-800",
        icon: XCircle,
      };
    case "Expired":
      return {
        label: "Expiré",
        className: "border-red-200 bg-red-100 text-red-800",
        icon: FileX,
      };
    case "NotProvided":
    default:
      return {
        label: "Non fourni",
        className: "bg-muted text-muted-foreground",
      };
  }
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ---- CV tips -------------------------------------------------------------

const CV_TIPS: string[] = [
  "Privilégiez le format PDF pour une mise en page stable et lisible.",
  "La photo est optionnelle, mais elle est appréciée en Italie.",
  "Indiquez clairement votre expérience : dates, employeurs et missions.",
  "Mentionnez votre niveau d'italien et les autres langues parlées, avec leurs certifications.",
  "Vérifiez que vos coordonnées (email, téléphone, adresse) sont à jour.",
];

// ---- Main component ------------------------------------------------------

export function CandidateCv() {
  const { toast } = useToast();
  const [documents, setDocuments] = React.useState<CandidateDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const cv = React.useMemo(
    () => documents.find((d) => d.type === "CV") ?? null,
    [documents]
  );

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/documents", { credentials: "include" });
      if (!res.ok) {
        toast({
          title: "Impossible de charger votre CV",
          description: "Veuillez réessayer dans un instant.",
          variant: "destructive",
        });
        setDocuments([]);
        return;
      }
      const data = (await res.json()) as CandidateDocument[];
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      toast({
        title: "Impossible de charger votre CV",
        description: "Vérifiez votre connexion et réessayez.",
        variant: "destructive",
      });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = React.useCallback(() => {
    if (!cv) return;
    window.open(`/api/candidate/documents/${cv.id}/download`, "_blank", "noopener,noreferrer");
  }, [cv]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
    e.target.value = "";
  };

  const handleUpload = async (file: File) => {
    if (file.size > MAX_SIZE) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le fichier dépasse 10 Mo.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("type", "CV");
      fd.append("file", file);
      const res = await fetch("/api/candidate/documents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({
          title: "Téléversement impossible",
          description: data?.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }

      // "Remplacer" semantics: remove the previous CV (if any) once the
      // new one is safely stored.
      const previous = documents.find((d) => d.type === "CV" && d.id !== data?.id);
      if (previous) {
        try {
          await fetch(`/api/candidate/documents/${previous.id}`, {
            method: "DELETE",
            credentials: "include",
          });
        } catch {
          // best-effort cleanup
        }
      }

      toast({
        title: "CV téléversé",
        description: "Votre CV est en attente de validation par l'équipe COORIZON.",
      });
      await fetchDocuments();
    } catch {
      toast({
        title: "Téléversement impossible",
        description: "Vérifiez votre connexion et réessayez.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!cv) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/candidate/documents/${cv.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({
          title: "Suppression impossible",
          description: data?.error ?? "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "CV supprimé",
        description: "Votre CV a été retiré de votre dossier.",
      });
      await fetchDocuments();
    } catch {
      toast({
        title: "Suppression impossible",
        description: "Vérifiez votre connexion et réessayez.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const badge = cv ? statusBadge(cv.status) : statusBadge("NotProvided");
  const StatusIcon = badge.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Mon CV</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre CV est le document central de votre dossier de candidature.
          Tenez-le à jour pour maximiser vos chances.
        </p>
      </div>

      {/* Privacy notice */}
      <Alert className="border-brand/20 bg-brand/5 text-navy">
        <ShieldCheck className="text-brand" />
        <AlertDescription className="text-sm text-navy">
          Votre CV est <strong>privé et protégé</strong>. Seuls vous et l'équipe
          COORIZON y ont accès.
        </AlertDescription>
      </Alert>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main CV card / empty state */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-6 w-24 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-56" />
                    <Skeleton className="h-3 w-32" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-9 w-28 rounded-md" />
                      <Skeleton className="h-9 w-28 rounded-md" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : cv ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="truncate text-lg font-semibold text-navy">
                        {cv.fileName}
                      </h2>
                      <Badge className={badge.className} variant="outline">
                        {StatusIcon ? <StatusIcon className="h-3 w-3" /> : null}
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Téléversé le {formatDate(cv.createdAt)}</span>
                      {cv.sizeBytes ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{formatBytes(cv.sizeBytes)}</span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Button onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Remplacer
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deleting}
                          >
                            {deleting ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer votre CV ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le document
                              «&nbsp;{cv.fileName}&nbsp;» sera définitivement
                              supprimé de votre dossier.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => void handleDelete()}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="group flex flex-col items-center"
                  aria-label="Téléverser un CV"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand transition-transform group-hover:scale-105">
                    {uploading ? (
                      <RefreshCw className="h-8 w-8 animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8" />
                    )}
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-navy">
                    Téléversez votre CV
                  </h2>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Format PDF ou Word, max 10 Mo. Votre CV sera vérifié par
                    l'équipe COORIZON.
                  </p>
                  <Button className="mt-5" disabled={uploading}>
                    {uploading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Choisir un fichier
                  </Button>
                </button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tips card */}
        <div className="lg:col-span-1">
          <Card className="h-full border-brand/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-navy">Conseils pour un bon CV</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {CV_TIPS.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
