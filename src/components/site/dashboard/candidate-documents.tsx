"use client";

import * as React from "react";
import {
  FileText,
  FileCheck,
  Upload,
  Download,
  Trash2,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  FileX,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
 * CandidateDocuments — "Mes documents" dashboard section (LOT 3 — Task 3-c).
 *
 * Lets a candidate manage the 7 document types required by the cahier des
 * charges: CV, passeport, carte d'identité, diplômes, attestations de
 * travail, certificats et lettre de motivation.
 *
 * Documents are private and protected. Every action goes through the
 * /api/candidate/documents endpoints which enforce ownership server-side.
 */

// ---- Local types (avoid importing @prisma/client on the client) ----------

type DocumentType =
  | "CV"
  | "Passport"
  | "IDCard"
  | "Diploma"
  | "WorkCertificate"
  | "Certificate"
  | "CoverLetter";

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

// ---- Static configuration ------------------------------------------------

interface DocTypeMeta {
  type: DocumentType;
  label: string;
  description: string;
  icon: LucideIcon;
}

const DOC_TYPES: DocTypeMeta[] = [
  {
    type: "CV",
    label: "CV",
    description: "Votre curriculum vitae à jour.",
    icon: FileText,
  },
  {
    type: "Passport",
    label: "Passeport",
    description: "Passeport en cours de validité.",
    icon: FileCheck,
  },
  {
    type: "IDCard",
    label: "Carte d'identité",
    description: "Pièce d'identité nationale.",
    icon: FileCheck,
  },
  {
    type: "Diploma",
    label: "Diplômes",
    description: "Diplômes et certifications obtenus.",
    icon: FileText,
  },
  {
    type: "WorkCertificate",
    label: "Attestations de travail",
    description: "Attestations de vos employeurs précédents.",
    icon: FileCheck,
  },
  {
    type: "Certificate",
    label: "Certificats",
    description: "Certificats de formation et de compétences.",
    icon: FileText,
  },
  {
    type: "CoverLetter",
    label: "Lettre de motivation",
    description: "Lettre de motivation personnalisée.",
    icon: FileText,
  },
];

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

// ---- Main component ------------------------------------------------------

export function CandidateDocuments() {
  const { toast } = useToast();
  const [documents, setDocuments] = React.useState<CandidateDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploadingType, setUploadingType] = React.useState<DocumentType | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/documents", { credentials: "include" });
      if (!res.ok) {
        toast({
          title: "Impossible de charger vos documents",
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
        title: "Impossible de charger vos documents",
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

  const handleDownload = React.useCallback((id: string) => {
    window.open(`/api/candidate/documents/${id}/download`, "_blank", "noopener,noreferrer");
  }, []);

  const handleDelete = React.useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/candidate/documents/${id}`, {
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
          title: "Document supprimé",
          description: "Le document a été retiré de votre dossier.",
        });
        await fetchDocuments();
      } catch {
        toast({
          title: "Suppression impossible",
          description: "Vérifiez votre connexion et réessayez.",
          variant: "destructive",
        });
      } finally {
        setDeletingId(null);
      }
    },
    [fetchDocuments, toast]
  );

  const handleUpload = React.useCallback(
    async (type: DocumentType, file: File) => {
      if (file.size > MAX_SIZE) {
        toast({
          title: "Fichier trop volumineux",
          description: "Le fichier dépasse 10 Mo.",
          variant: "destructive",
        });
        return;
      }
      setUploadingType(type);
      try {
        // Upload the new document first — if it fails, the previous one
        // (if any) is left untouched.
        const fd = new FormData();
        fd.append("type", type);
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

        // "Remplacer" semantics: remove the previous document of this type
        // (the freshly uploaded one is now the most recent).
        const previous = documents.find((d) => d.type === type && d.id !== data?.id);
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
          title: "Document téléversé",
          description: "Votre document est en attente de validation par l'équipe COORIZON.",
        });
        await fetchDocuments();
      } catch {
        toast({
          title: "Téléversement impossible",
          description: "Vérifiez votre connexion et réessayez.",
          variant: "destructive",
        });
      } finally {
        setUploadingType(null);
      }
    },
    [documents, fetchDocuments, toast]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Mes documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les justificatifs requis pour votre dossier de candidature.
        </p>
      </div>

      {/* Privacy notice */}
      <Alert className="border-brand/20 bg-brand/5 text-navy">
        <ShieldCheck className="text-brand" />
        <AlertDescription className="text-sm text-navy">
          Vos documents sont <strong>privés et protégés</strong>. Seuls vous et
          l'équipe COORIZON (pour validation) y ont accès.
        </AlertDescription>
      </Alert>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DOC_TYPES.map((meta) => (
            <Card key={meta.type}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-20 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-8 w-24 rounded-md" />
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DOC_TYPES.map((meta) => {
            const doc =
              documents.find((d) => d.type === meta.type) ?? null;
            return (
              <DocumentTypeCard
                key={meta.type}
                meta={meta}
                document={doc}
                uploading={uploadingType === meta.type}
                deleting={deletingId === doc?.id}
                onUpload={handleUpload}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Document type card --------------------------------------------------

interface DocumentTypeCardProps {
  meta: DocTypeMeta;
  document: CandidateDocument | null;
  uploading: boolean;
  deleting: boolean;
  onUpload: (type: DocumentType, file: File) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

function DocumentTypeCard({
  meta,
  document,
  uploading,
  deleting,
  onUpload,
  onDelete,
  onDownload,
}: DocumentTypeCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const Icon = meta.icon;
  const status = document ? document.status : "NotProvided";
  const badge = statusBadge(status);
  const StatusIcon = badge.icon;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(meta.type, file);
    // reset so selecting the same file again re-triggers onChange
    e.target.value = "";
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-navy">{meta.label}</h3>
              <Badge className={badge.className} variant="outline">
                {StatusIcon ? <StatusIcon className="h-3 w-3" /> : null}
                {badge.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>

            {document && (
              <>
                <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs font-medium text-foreground">
                    {document.fileName}
                  </span>
                  {document.sizeBytes ? (
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {formatBytes(document.sizeBytes)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Téléversé le {formatDate(document.createdAt)}
                </p>
              </>
            )}

            <Separator className="my-3" />

            <div className="flex flex-wrap items-center gap-2">
              {document && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(document.id)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleting}
                      >
                        {deleting ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le document
                          «&nbsp;{document.fileName}&nbsp;» sera définitivement
                          supprimé de votre dossier.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => onDelete(document.id)}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <Button
                size="sm"
                variant={document ? "ghost" : "default"}
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className={document ? "text-brand hover:bg-brand/10 hover:text-brand" : ""}
              >
                {uploading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {document ? "Remplacer" : "Téléverser"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
