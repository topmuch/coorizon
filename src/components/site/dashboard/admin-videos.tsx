"use client";

import * as React from "react";
import {
  Video,
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  PlayCircle,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  Upload,
  Link2,
  Film,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Search,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

type VideoType = "youtube" | "mp4" | "vimeo";
type VideoCategory =
  | "formation"
  | "tutoriel"
  | "accueil"
  | "personnalise"
  | "autre";

interface UploadedBy {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface AdminVideo {
  id: string;
  title: string;
  description: string | null;
  type: VideoType;
  url: string;
  embedId: string | null;
  duration: number | null;
  category: VideoCategory;
  thumbnailUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  uploadedBy: UploadedBy;
  _count: { views: number; assignments: number };
}

interface AssignmentRow {
  id: string;
  targetType: "candidate" | "course" | "level" | "all";
  targetId: string | null;
  createdAt: string;
  assignedBy: UploadedBy;
}

interface CandidateSearchUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface CourseSearchItem {
  id: string;
  title: string;
}

interface StatsResponse {
  totals: {
    totalVideos: number;
    totalViews: number;
    totalCompletions: number;
    avgCompletionRate: number;
  };
  topVideos: {
    id: string;
    title: string;
    views: number;
    completionRate: number;
  }[];
  viewsByDay: { date: string; views: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────

const VIDEO_TYPES: { value: VideoType; label: string; icon: LucideIcon }[] = [
  { value: "youtube", label: "YouTube", icon: PlayCircle },
  { value: "vimeo", label: "Vimeo", icon: PlayCircle },
  { value: "mp4", label: "Upload MP4", icon: Upload },
];

const CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: "formation", label: "Formation" },
  { value: "tutoriel", label: "Tutoriel" },
  { value: "accueil", label: "Accueil" },
  { value: "personnalise", label: "Personnalisé" },
  { value: "autre", label: "Autre" },
];

const CATEGORY_LABEL: Record<VideoCategory, string> = {
  formation: "Formation",
  tutoriel: "Tutoriel",
  accueil: "Accueil",
  personnalise: "Personnalisé",
  autre: "Autre",
};

const CATEGORY_STYLE: Record<VideoCategory, string> = {
  formation: "bg-brand/10 text-brand border-brand/20",
  tutoriel: "bg-brand-green/10 text-brand-green border-brand-green/20",
  accueil: "bg-primary/10 text-primary border-primary/20",
  personnalise: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  autre: "bg-muted text-muted-foreground border-border",
};

const TYPE_LABEL: Record<VideoType, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  mp4: "MP4",
};

const TYPE_STYLE: Record<VideoType, string> = {
  youtube: "bg-italian-red/10 text-italian-red border-italian-red/20",
  vimeo: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  mp4: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const TARGET_TYPES: {
  value: "all" | "candidate" | "course" | "level";
  label: string;
}[] = [
  { value: "all", label: "Tous les candidats" },
  { value: "candidate", label: "Candidat spécifique" },
  { value: "course", label: "Formation" },
  { value: "level", label: "Niveau" },
];

const TARGET_LABEL: Record<string, string> = {
  all: "Tous les candidats",
  candidate: "Candidat",
  course: "Formation",
  level: "Niveau",
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDayLabel(yyyymmdd: string): string {
  const d = new Date(yyyymmdd + "T00:00:00");
  if (Number.isNaN(d.getTime())) return yyyymmdd;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function fullName(u: UploadedBy | CandidateSearchUser): string {
  const first = u.firstName ?? "";
  const last = u.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || u.email;
}

function getThumbnail(video: AdminVideo): string | null {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.type === "youtube" && video.embedId) {
    return `https://img.youtube.com/vi/${video.embedId}/hqdefault.jpg`;
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────

export function AdminVideos() {
  const [tab, setTab] = React.useState<"videos" | "stats">("videos");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Video className="h-6 w-6 text-brand" />
            Médiathèque
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les vidéos e-learning, leurs assignations et suivez les
            statistiques de visionnage.
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "videos" | "stats")}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="videos" className="flex-1 sm:flex-initial">
            <Video className="h-4 w-4" />
            Vidéos
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 sm:flex-initial">
            <BarChart3 className="h-4 w-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-6">
          <VideosTab />
        </TabsContent>
        <TabsContent value="stats" className="mt-6">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Videos tab ────────────────────────────────────────────────────────────

function VideosTab() {
  const { toast } = useToast();
  const [videos, setVideos] = React.useState<AdminVideo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminVideo | null>(null);
  const [deleting, setDeleting] = React.useState<AdminVideo | null>(null);
  const [assignmentFor, setAssignmentFor] = React.useState<AdminVideo | null>(
    null
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/videos", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement.");
      }
      const data = (await res.json()) as { videos: AdminVideo[] };
      setVideos(data.videos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const totalViews = videos.reduce((s, v) => s + v._count.views, 0);
  const totalAssignments = videos.reduce(
    (s, v) => s + v._count.assignments,
    0
  );
  const publishedCount = videos.filter((v) => v.isPublished).length;

  const handleDelete = async (video: AdminVideo) => {
    try {
      const res = await fetch(`/api/admin/videos/${video.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la suppression.");
      }
      toast({
        title: "Vidéo supprimée",
        description: `« ${video.title} » a été supprimée.`,
      });
      setDeleting(null);
      await load();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {videos.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Total vidéos
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {totalViews}
              </div>
              <div className="text-xs text-muted-foreground">Total vues</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {totalAssignments}
              </div>
              <div className="text-xs text-muted-foreground">
                Assignations
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {publishedCount} publiée{publishedCount > 1 ? "s" : ""} ·{" "}
          {videos.length - publishedCount} brouillon
          {videos.length - publishedCount > 1 ? "s" : ""}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="ml-1">Ajouter une vidéo</span>
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Aucune vidéo
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ajoutez votre première vidéo e-learning pour démarrer la
              médiathèque.
            </p>
            <Button
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Ajouter une vidéo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Videos grid */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onEdit={() => setEditing(v)}
              onDelete={() => setDeleting(v)}
              onAssignments={() => setAssignmentFor(v)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {createOpen && (
        <VideoFormDialog
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <VideoFormDialog
          mode="edit"
          video={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {/* Assignment dialog */}
      {assignmentFor && (
        <AssignmentDialog
          video={assignmentFor}
          onClose={() => setAssignmentFor(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la vidéo</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {deleting?.title} » ?
              Cette action est irréversible. Les fichiers MP4 associés seront
              également supprimés du serveur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && handleDelete(deleting)}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Video card ────────────────────────────────────────────────────────────

function VideoCard({
  video,
  onEdit,
  onDelete,
  onAssignments,
}: {
  video: AdminVideo;
  onEdit: () => void;
  onDelete: () => void;
  onAssignments: () => void;
}) {
  const thumb = getThumbnail(video);
  const TypeIcon = video.type === "mp4" ? Upload : PlayCircle;

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video w-full bg-muted">
        {thumb ? (
          <img
            src={thumb}
            alt={video.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Film className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className={cn("backdrop-blur", TYPE_STYLE[video.type])}
          >
            <TypeIcon className="h-3 w-3" />
            {TYPE_LABEL[video.type]}
          </Badge>
        </div>
        <div className="absolute right-2 top-2">
          {video.isPublished ? (
            <Badge className="gap-1 bg-brand/90 text-white hover:bg-brand/90">
              <CheckCircle2 className="h-3 w-3" />
              Publiée
            </Badge>
          ) : (
            <Badge variant="outline" className="backdrop-blur">
              <Edit className="h-3 w-3" />
              Brouillon
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-semibold text-foreground">
            {video.title}
          </h3>
          {video.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {video.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={CATEGORY_STYLE[video.category]}
          >
            {CATEGORY_LABEL[video.category]}
          </Badge>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {video._count.views} vue{video._count.views > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {video._count.assignments} assign.
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateFr(video.createdAt)}
          </span>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onAssignments}>
            <Users className="h-4 w-4" />
            Assignations
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4" />
            Éditer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Video form dialog (create / edit) ─────────────────────────────────────

interface VideoFormState {
  title: string;
  description: string;
  type: VideoType;
  url: string;
  category: VideoCategory;
  isPublished: boolean;
}

function VideoFormDialog({
  mode,
  video,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  video?: AdminVideo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<VideoFormState>({
    title: video?.title ?? "",
    description: video?.description ?? "",
    type: video?.type ?? "youtube",
    url: video?.url ?? "",
    category: video?.category ?? "formation",
    isPublished: video?.isPublished ?? true,
  });
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEdit = mode === "edit";
  const isUpload = form.type === "mp4" && !isEdit;

  const set = <K extends keyof VideoFormState>(
    key: K,
    value: VideoFormState[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({
        variant: "destructive",
        title: "Titre requis",
        description: "Veuillez renseigner un titre.",
      });
      return;
    }
    if (!isUpload && !form.url.trim()) {
      toast({
        variant: "destructive",
        title: "URL requise",
        description: "Veuillez coller l'URL de la vidéo.",
      });
      return;
    }
    if (isUpload && !file) {
      toast({
        variant: "destructive",
        title: "Fichier requis",
        description: "Veuillez sélectionner un fichier MP4.",
      });
      return;
    }

    setSaving(true);
    try {
      if (isUpload && file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", form.title.trim());
        fd.append("description", form.description.trim());
        fd.append("category", form.category);
        fd.append("isPublished", String(form.isPublished));

        const res = await fetch("/api/admin/videos", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Échec de l'upload.");
        }
      } else if (isEdit) {
        const res = await fetch(`/api/admin/videos/${video!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            url: form.url.trim(),
            category: form.category,
            isPublished: form.isPublished,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Échec de la mise à jour.");
        }
      } else {
        // JSON create (YouTube / Vimeo)
        const res = await fetch("/api/admin/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            type: form.type,
            url: form.url.trim(),
            category: form.category,
            isPublished: form.isPublished,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Échec de la création.");
        }
      }

      toast({
        title: isEdit ? "Vidéo mise à jour" : "Vidéo créée",
        description: `« ${form.title.trim()} » a été ${
          isEdit ? "mise à jour" : "créée"
        } avec succès.`,
      });
      onSaved();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-brand" />
            {isEdit ? "Éditer la vidéo" : "Ajouter une vidéo"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez les informations de la vidéo."
              : "Renseignez les informations de la nouvelle vidéo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vid-title">Titre *</Label>
            <Input
              id="vid-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Présentation COORIZON"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vid-desc">Description</Label>
            <Textarea
              id="vid-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Décrivez le contenu de la vidéo…"
              rows={3}
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="vid-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => set("type", v as VideoType)}
              >
                <SelectTrigger id="vid-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {isUpload ? (
            <div className="space-y-1.5">
              <Label>Fichier MP4 *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {file ? file.name : "Choisir un fichier…"}
              </Button>
              <p className="text-xs text-muted-foreground">
                MP4, WebM ou OGG. 500 Mo max.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="vid-url">
                URL {form.type === "youtube" ? "YouTube" : form.type === "vimeo" ? "Vimeo" : "MP4"} *
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vid-url"
                  value={form.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder={
                    form.type === "youtube"
                      ? "https://www.youtube.com/watch?v=…"
                      : form.type === "vimeo"
                      ? "https://vimeo.com/…"
                      : "https://…/video.mp4"
                  }
                  className="pl-9"
                />
              </div>
              {form.type === "youtube" && (
                <p className="text-xs text-muted-foreground">
                  Collez l'URL complète YouTube (watch?v=, youtu.be, embed,
                  shorts).
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="vid-cat">Catégorie</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v as VideoCategory)}
            >
              <SelectTrigger id="vid-cat" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="vid-pub" className="cursor-pointer">
                Publiée
              </Label>
              <p className="text-xs text-muted-foreground">
                Les vidéos non publiées ne sont pas visibles par les candidats.
              </p>
            </div>
            <Switch
              id="vid-pub"
              checked={form.isPublished}
              onCheckedChange={(v) => set("isPublished", v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Edit className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignment dialog ─────────────────────────────────────────────────────

function AssignmentDialog({
  video,
  onClose,
}: {
  video: AdminVideo;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [assignments, setAssignments] = React.useState<AssignmentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [targetType, setTargetType] = React.useState<
    "all" | "candidate" | "course" | "level"
  >("all");
  const [targetId, setTargetId] = React.useState<string>("");

  // For candidate search
  const [candidateQuery, setCandidateQuery] = React.useState("");
  const [candidates, setCandidates] = React.useState<CandidateSearchUser[]>([]);
  const [searching, setSearching] = React.useState(false);

  // For course select
  const [courses, setCourses] = React.useState<CourseSearchItem[]>([]);

  const loadAssignments = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/videos/${video.id}/assignments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Échec du chargement.");
      const data = (await res.json()) as { assignments: AssignmentRow[] };
      setAssignments(data.assignments);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [video.id]);

  const loadCourses = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/training", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { courses: CourseSearchItem[] };
      setCourses(data.courses);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    loadAssignments();
    loadCourses();
  }, [loadAssignments, loadCourses]);

  // Debounced candidate search
  React.useEffect(() => {
    if (targetType !== "candidate") return;
    if (candidateQuery.trim().length < 2) {
      setCandidates([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const url = `/api/admin/users?role=Candidate&q=${encodeURIComponent(
          candidateQuery.trim()
        )}&pageSize=10`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { users: CandidateSearchUser[] };
        if (!cancelled) setCandidates(data.users);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [candidateQuery, targetType]);

  const handleAdd = async () => {
    let finalTargetId: string | null = null;
    if (targetType === "candidate") {
      if (!targetId) {
        toast({
          variant: "destructive",
          title: "Candidat requis",
          description: "Sélectionnez un candidat dans la liste.",
        });
        return;
      }
      finalTargetId = targetId;
    } else if (targetType === "course") {
      if (!targetId) {
        toast({
          variant: "destructive",
          title: "Formation requise",
          description: "Sélectionnez une formation.",
        });
        return;
      }
      finalTargetId = targetId;
    } else if (targetType === "level") {
      if (!targetId) {
        toast({
          variant: "destructive",
          title: "Niveau requis",
          description: "Sélectionnez un niveau (A1 à C2).",
        });
        return;
      }
      finalTargetId = targetId;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/videos/${video.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetType, targetId: finalTargetId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de l'assignation.");
      }
      toast({
        title: "Assignation ajoutée",
        description: "La vidéo est désormais assignée à la cible sélectionnée.",
      });
      setTargetId("");
      setCandidateQuery("");
      setCandidates([]);
      await loadAssignments();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/admin/videos/${video.id}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la suppression.");
      }
      toast({ title: "Assignation retirée" });
      await loadAssignments();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    }
  };

  const assignmentLabel = (a: AssignmentRow): string => {
    if (a.targetType === "all") return "Tous les candidats";
    if (a.targetType === "level") return `Niveau ${a.targetId}`;
    if (a.targetType === "course") {
      const c = courses.find((x) => x.id === a.targetId);
      return c ? `Formation : ${c.title}` : "Formation";
    }
    if (a.targetType === "candidate") {
      return "Candidat spécifique";
    }
    return TARGET_LABEL[a.targetType] ?? a.targetType;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            Assignations — {video.title}
          </DialogTitle>
          <DialogDescription>
            Définissez à qui cette vidéo est destinée. Une vidéo peut avoir
            plusieurs assignations.
          </DialogDescription>
        </DialogHeader>

        {/* Add form */}
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="as-target">Type de cible</Label>
              <Select
                value={targetType}
                onValueChange={(v) => {
                  setTargetType(v as typeof targetType);
                  setTargetId("");
                  setCandidateQuery("");
                  setCandidates([]);
                }}
              >
                <SelectTrigger id="as-target" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="as-targetid">Cible</Label>
              {targetType === "all" && (
                <Input
                  id="as-targetid"
                  value="Tous les candidats"
                  disabled
                  readOnly
                />
              )}
              {targetType === "level" && (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger id="as-targetid" className="w-full">
                    <SelectValue placeholder="Choisir un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        Niveau {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {targetType === "course" && (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger id="as-targetid" className="w-full">
                    <SelectValue placeholder="Choisir une formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Aucune formation
                      </SelectItem>
                    ) : (
                      courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {targetType === "candidate" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={candidateQuery}
                      onChange={(e) => {
                        setCandidateQuery(e.target.value);
                        setTargetId("");
                      }}
                      placeholder="Rechercher un candidat…"
                      className="pl-9"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {candidates.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-md border bg-background">
                      {candidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setTargetId(c.id);
                            setCandidateQuery(fullName(c));
                            setCandidates([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span className="text-foreground">
                            {fullName(c)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {targetId && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                      Candidat sélectionné
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => {
                          setTargetId("");
                          setCandidateQuery("");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Ajouter l'assignation
            </Button>
          </div>
        </div>

        {/* Current assignments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Assignations actuelles
            </h4>
            <span className="text-xs text-muted-foreground">
              {assignments.length} au total
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Aucune assignation. Cette vidéo n'est visible par aucun candidat
                pour le moment.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-md border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={CATEGORY_STYLE.formation}>
                      {TARGET_LABEL[a.targetType] ?? a.targetType}
                    </Badge>
                    <div className="text-sm">
                      <div className="font-medium text-foreground">
                        {assignmentLabel(a)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Par {fullName(a.assignedBy)} ·{" "}
                        {formatDateFr(a.createdAt)}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemove(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Statistics tab ────────────────────────────────────────────────────────

function StatsTab() {
  const { toast } = useToast();
  const [stats, setStats] = React.useState<StatsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/videos/stats", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des statistiques.");
      }
      const data = (await res.json()) as StatsResponse;
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>{error ?? "Erreur inconnue."}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const maxDay = Math.max(1, ...stats.viewsByDay.map((d) => d.views));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {stats.totals.totalViews}
              </div>
              <div className="text-xs text-muted-foreground">Total vues</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {stats.totals.totalCompletions}
              </div>
              <div className="text-xs text-muted-foreground">
                Vidéos complétées
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {stats.totals.avgCompletionRate}%
              </div>
              <div className="text-xs text-muted-foreground">Taux moyen</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top videos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-brand" />
              Top 5 vidéos les plus vues
            </CardTitle>
            <CardDescription>
              Classement par nombre total de vues.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {stats.topVideos.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-muted-foreground">
                Aucune vue enregistrée pour le moment.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead> Vidéo</TableHead>
                    <TableHead className="text-center">Vues</TableHead>
                    <TableHead className="text-right">
                      Taux complétion
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topVideos.map((v, idx) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/10 text-xs font-semibold text-brand">
                            {idx + 1}
                          </span>
                          <span className="line-clamp-1 font-medium text-foreground">
                            {v.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          {v.views}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            v.completionRate >= 80
                              ? "border-brand/20 bg-brand/10 text-brand"
                              : v.completionRate >= 50
                              ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "border-border bg-muted text-muted-foreground"
                          }
                        >
                          {v.completionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Views by day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-brand" />
              Vues par jour (7 derniers jours)
            </CardTitle>
            <CardDescription>
              Activité de visionnage sur la dernière semaine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 items-end justify-between gap-2">
              {stats.viewsByDay.map((d) => {
                const pct = Math.round((d.views / maxDay) * 100);
                return (
                  <div
                    key={d.date}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-8 rounded-t-md bg-brand transition-all hover:bg-brand/80"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        title={`${d.views} vue${d.views > 1 ? "s" : ""}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDayLabel(d.date)}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {d.views}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary footer */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                {stats.totals.totalVideos} vidéo
                {stats.totals.totalVideos > 1 ? "s" : ""} au total
              </div>
              <div className="text-xs text-muted-foreground">
                Médiathèque COORIZON
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Mis à jour {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
