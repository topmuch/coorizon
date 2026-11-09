"use client";

import * as React from "react";
import {
  Video,
  Plus,
  Trash2,
  Youtube,
  Film,
  Users,
  Eye,
  BarChart3,
  Clock,
  CheckCircle2,
  Upload,
  Link2,
  PlayCircle,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

type VideoType = "youtube" | "vimeo" | "mp4";
type VideoCategory =
  | "formation"
  | "tutoriel"
  | "accueil"
  | "personnalise"
  | "autre";
type TargetType = "all" | "candidate" | "course" | "level";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface AdminVideo {
  id: string;
  title: string;
  description: string | null;
  type: VideoType;
  url: string;
  embedId: string | null;
  category: VideoCategory;
  thumbnailUrl: string | null;
  duration: number | null;
  isPublished: boolean;
  createdAt: string;
  _count: { assignments: number; views: number };
}

interface VideoListResponse {
  videos: AdminVideo[];
}

interface VideoAssignment {
  id: string;
  videoId: string;
  targetType: TargetType;
  targetId: string | null;
  createdAt: string;
}

interface AssignmentsResponse {
  assignments: VideoAssignment[];
}

interface TopVideoStat {
  id: string;
  title: string;
  views: number;
  completions: number;
  rate: number;
}

interface StatsResponse {
  stats: {
    totalVideos: number;
    totalViews: number;
    totalCompletions: number;
    avgCompletionRate: number;
    topVideos: TopVideoStat[];
    leastVideos: { id: string; title: string; views: number }[];
    dailyData: { date: string; count: number }[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<VideoType, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  mp4: "MP4",
};

const TYPE_BADGE_CLASS: Record<VideoType, string> = {
  youtube:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  vimeo:
    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  mp4:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
};

const CATEGORY_LABEL: Record<VideoCategory, string> = {
  formation: "Formation",
  tutoriel: "Tutoriel",
  accueil: "Accueil",
  personnalise: "Personnalisé",
  autre: "Autre",
};

const CATEGORY_BADGE_CLASS: Record<VideoCategory, string> = {
  formation: "bg-brand/10 text-brand border-brand/20",
  tutoriel: "bg-brand-green/10 text-brand-green border-brand-green/20",
  accueil: "bg-primary/10 text-primary border-primary/20",
  personnalise:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  autre: "bg-muted text-muted-foreground border-border",
};

const TARGET_LABEL: Record<TargetType, string> = {
  all: "Tous les candidats",
  candidate: "Candidat spécifique",
  course: "Cours",
  level: "Niveau",
};

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getThumbnail(video: AdminVideo): string | null {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.type === "youtube" && video.embedId) {
    return `https://img.youtube.com/vi/${video.embedId}/mqdefault.jpg`;
  }
  return null;
}

function typeIcon(type: VideoType, className?: string): React.ReactNode {
  if (type === "youtube") return <Youtube className={className} />;
  if (type === "mp4") return <Film className={className} />;
  return <PlayCircle className={className} />;
}

// ─── Main component ───────────────────────────────────────────────────────

export function AdminVideos() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Video className="h-6 w-6 text-brand" />
            Bibliothèque vidéo
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les vidéos e-learning, leurs assignations et suivez les
            statistiques de visionnage.
          </p>
        </div>
      </header>

      <Tabs defaultValue="videos" className="w-full">
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
        <TabsContent value="videos" className="mt-4">
          <VideosTab />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Videos tab ───────────────────────────────────────────────────────────

function VideosTab() {
  const { toast } = useToast();
  const [videos, setVideos] = React.useState<AdminVideo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [assignTarget, setAssignTarget] = React.useState<AdminVideo | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = React.useState<AdminVideo | null>(
    null
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/videos", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec du chargement des vidéos.");
      }
      const data = (await res.json()) as VideoListResponse;
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

  const handleTogglePublished = React.useCallback(
    async (video: AdminVideo, next: boolean) => {
      // Optimistic update
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id ? { ...v, isPublished: next } : v
        )
      );
      try {
        const res = await fetch(`/api/admin/videos/${video.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isPublished: next }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Échec de la mise à jour.");
        }
        toast({
          title: next ? "Vidéo publiée" : "Vidéo masquée",
          description: video.title,
        });
      } catch (e) {
        // Revert
        setVideos((prev) =>
          prev.map((v) =>
            v.id === video.id ? { ...v, isPublished: !next } : v
          )
        );
        toast({
          variant: "destructive",
          title: "Erreur",
          description:
            e instanceof Error ? e.message : "Une erreur est survenue.",
        });
      }
    },
    [toast]
  );

  const handleDelete = React.useCallback(async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      const res = await fetch(`/api/admin/videos/${target.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de la suppression.");
      }
      setVideos((prev) => prev.filter((v) => v.id !== target.id));
      toast({
        title: "Vidéo supprimée",
        description: target.title,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, toast]);

  const handleCreated = React.useCallback(() => {
    setAddOpen(false);
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {loading
            ? "Chargement…"
            : `${videos.length} vidéo${videos.length > 1 ? "s" : ""} au total`}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter une vidéo
          </Button>
        </div>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-video w-full rounded-none" />
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Aucune vidéo pour le moment
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ajoutez votre première vidéo e-learning pour commencer à former
              vos candidats.
            </p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Ajouter une vidéo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Videos grid */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onAssign={() => setAssignTarget(v)}
              onDelete={() => setDeleteTarget(v)}
              onTogglePublished={(next) => handleTogglePublished(v, next)}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <AddVideoDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
      />

      {/* Assign dialog */}
      {assignTarget && (
        <AssignDialog
          video={assignTarget}
          onClose={() => setAssignTarget(null)}
          onChanged={load}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette vidéo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La vidéo{" "}
              <strong className="text-foreground">
                {deleteTarget?.title}
              </strong>{" "}
              ainsi que toutes ses assignations et statistiques de visionnage
              seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
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

// ─── Video card ───────────────────────────────────────────────────────────

function VideoCard({
  video,
  onAssign,
  onDelete,
  onTogglePublished,
}: {
  video: AdminVideo;
  onAssign: () => void;
  onDelete: () => void;
  onTogglePublished: (next: boolean) => void;
}) {
  const thumb = getThumbnail(video);
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Thumbnail */}
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
            {typeIcon(video.type, "h-10 w-10")}
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge
            variant="outline"
            className={cn("backdrop-blur", TYPE_BADGE_CLASS[video.type])}
          >
            {typeIcon(video.type, "h-3 w-3 mr-1")}
            {TYPE_LABEL[video.type]}
          </Badge>
        </div>
        {!video.isPublished && (
          <div className="absolute left-2 top-2">
            <Badge variant="outline" className="backdrop-blur">
              <Clock className="h-3 w-3" />
              Brouillon
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Title + category */}
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 font-semibold leading-snug text-foreground">
            {video.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={CATEGORY_BADGE_CLASS[video.category]}
            >
              {CATEGORY_LABEL[video.category]}
            </Badge>
            {video.isPublished ? (
              <Badge className="gap-1 bg-brand/90 text-white hover:bg-brand/90">
                <CheckCircle2 className="h-3 w-3" />
                Publiée
              </Badge>
            ) : (
              <Badge variant="secondary">Non publiée</Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {video.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Assignations">
            <Users className="h-3.5 w-3.5" />
            {video._count.assignments}
          </span>
          <span className="flex items-center gap-1" title="Vues">
            <Eye className="h-3.5 w-3.5" />
            {video._count.views}
          </span>
          <span className="ml-auto text-[10px]">
            {formatDateFr(video.createdAt)}
          </span>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`pub-${video.id}`}
              className="text-xs text-muted-foreground"
            >
              Publié
            </Label>
            <Switch
              id={`pub-${video.id}`}
              checked={video.isPublished}
              onCheckedChange={onTogglePublished}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={onAssign}>
              <Users className="h-3.5 w-3.5" />
              Assigner
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add video dialog ─────────────────────────────────────────────────────

interface AddFormState {
  title: string;
  description: string;
  type: VideoType;
  category: VideoCategory;
  url: string;
  file: File | null;
}

const EMPTY_ADD_FORM: AddFormState = {
  title: "",
  description: "",
  type: "youtube",
  category: "formation",
  url: "",
  file: null,
};

function AddVideoDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<AddFormState>(EMPTY_ADD_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setForm(EMPTY_ADD_FORM);
    }
  }, [open]);

  const isUrlType = form.type === "youtube" || form.type === "vimeo";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ variant: "destructive", title: "Le titre est requis." });
      return;
    }
    if (isUrlType && !form.url.trim()) {
      toast({ variant: "destructive", title: "L'URL est requise." });
      return;
    }
    if (form.type === "mp4" && !form.file) {
      toast({
        variant: "destructive",
        title: "Veuillez sélectionner un fichier vidéo.",
      });
      return;
    }

    setSubmitting(true);
    try {
      let res: Response;
      if (form.type === "mp4" && form.file) {
        const fd = new FormData();
        fd.append("title", form.title.trim());
        fd.append("description", form.description.trim());
        fd.append("type", "mp4");
        fd.append("category", form.category);
        fd.append("file", form.file);
        res = await fetch("/api/admin/videos", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
      } else {
        res = await fetch("/api/admin/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            type: form.type,
            category: form.category,
            url: form.url.trim(),
          }),
        });
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de la création.");
      }
      toast({
        title: "Vidéo ajoutée",
        description: form.title.trim(),
      });
      onCreated();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand" />
            Ajouter une vidéo
          </DialogTitle>
          <DialogDescription>
            Ajoutez une vidéo YouTube, Vimeo ou un fichier MP4 à la
            bibliothèque e-learning.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="vid-title">Titre</Label>
            <Input
              id="vid-title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Ex. Présentation de l'Italie"
              maxLength={120}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="vid-desc">Description</Label>
            <Textarea
              id="vid-desc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Brève description du contenu de la vidéo…"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vid-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as VideoType }))
                }
              >
                <SelectTrigger id="vid-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">
                    <span className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-600" />
                      YouTube
                    </span>
                  </SelectItem>
                  <SelectItem value="vimeo">
                    <span className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-sky-600" />
                      Vimeo
                    </span>
                  </SelectItem>
                  <SelectItem value="mp4">
                    <span className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-amber-600" />
                      Fichier MP4
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vid-cat">Catégorie</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as VideoCategory }))
                }
              >
                <SelectTrigger id="vid-cat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formation">Formation</SelectItem>
                  <SelectItem value="tutoriel">Tutoriel</SelectItem>
                  <SelectItem value="accueil">Accueil</SelectItem>
                  <SelectItem value="personnalise">Personnalisé</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* URL or file input */}
          {isUrlType ? (
            <div className="space-y-1.5">
              <Label htmlFor="vid-url">
                {form.type === "youtube"
                  ? "URL YouTube"
                  : "URL Vimeo"}
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vid-url"
                  value={form.url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder={
                    form.type === "youtube"
                      ? "https://www.youtube.com/watch?v=…"
                      : "https://vimeo.com/…"
                  }
                  className="pl-9"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Fichier vidéo MP4</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setForm((prev) => ({ ...prev, file: f }));
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {form.file ? (
                  <span className="truncate">{form.file.name}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Choisir un fichier MP4 (max 500 Mo)
                  </span>
                )}
              </Button>
              {form.file && (
                <p className="text-xs text-muted-foreground">
                  {(form.file.size / (1024 * 1024)).toFixed(1)} Mo
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Ajout…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign dialog ────────────────────────────────────────────────────────

function AssignDialog({
  video,
  onClose,
  onChanged,
}: {
  video: AdminVideo;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [assignments, setAssignments] = React.useState<VideoAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [targetType, setTargetType] = React.useState<TargetType>("all");
  const [targetId, setTargetId] = React.useState("");
  const [level, setLevel] = React.useState<Level>("A1");
  const [adding, setAdding] = React.useState(false);

  const loadAssignments = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/videos/${video.id}/assignments`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Échec du chargement.");
      const data = (await res.json()) as AssignmentsResponse;
      setAssignments(data.assignments);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [video.id]);

  React.useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleAdd = async () => {
    let payloadTargetId: string | null = null;
    if (targetType === "candidate") {
      if (!targetId.trim()) {
        toast({
          variant: "destructive",
          title: "ID candidat requis.",
        });
        return;
      }
      payloadTargetId = targetId.trim();
    } else if (targetType === "course") {
      if (!targetId.trim()) {
        toast({ variant: "destructive", title: "ID cours requis." });
        return;
      }
      payloadTargetId = targetId.trim();
    } else if (targetType === "level") {
      payloadTargetId = level;
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/admin/videos/${video.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType,
          targetId: payloadTargetId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de l'assignation.");
      }
      toast({ title: "Assignation ajoutée" });
      setTargetId("");
      setTargetType("all");
      setLevel("A1");
      await loadAssignments();
      onChanged();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      const res = await fetch(
        `/api/admin/videos/${video.id}/assignments/${assignmentId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Échec de la suppression.");
      setAssignments((prev) =>
        prev.filter((a) => a.id !== assignmentId)
      );
      toast({ title: "Assignation retirée" });
      onChanged();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    }
  };

  const describeAssignment = (a: VideoAssignment): string => {
    if (a.targetType === "all") return TARGET_LABEL.all;
    if (a.targetType === "level")
      return `Niveau ${a.targetId ?? ""}`;
    if (a.targetType === "course")
      return `Cours ${a.targetId ?? ""}`;
    return `Candidat ${a.targetId ?? ""}`;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            Assignations
          </DialogTitle>
          <DialogDescription>
            Définissez qui peut voir{" "}
            <strong className="text-foreground">{video.title}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Current assignments */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Assignations actuelles
          </Label>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Aucune assignation. Cette vidéo n'est visible par personne.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {describeAssignment(a)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateFr(a.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemove(a.id)}
                    title="Retirer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        {/* Add assignment */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Ajouter une assignation
          </Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tgt-type" className="text-xs">
                Type de cible
              </Label>
              <Select
                value={targetType}
                onValueChange={(v) => setTargetType(v as TargetType)}
              >
                <SelectTrigger id="tgt-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les candidats</SelectItem>
                  <SelectItem value="candidate">
                    Candidat spécifique
                  </SelectItem>
                  <SelectItem value="course">Cours</SelectItem>
                  <SelectItem value="level">Niveau</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "candidate" && (
              <div className="space-y-1.5">
                <Label htmlFor="tgt-id" className="text-xs">
                  ID du candidat
                </Label>
                <Input
                  id="tgt-id"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="userId"
                />
              </div>
            )}
            {targetType === "course" && (
              <div className="space-y-1.5">
                <Label htmlFor="tgt-course" className="text-xs">
                  ID du cours
                </Label>
                <Input
                  id="tgt-course"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="courseId"
                />
              </div>
            )}
            {targetType === "level" && (
              <div className="space-y-1.5">
                <Label htmlFor="tgt-level" className="text-xs">
                  Niveau
                </Label>
                <Select
                  value={level}
                  onValueChange={(v) => setLevel(v as Level)}
                >
                  <SelectTrigger id="tgt-level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Ajouter l'assignation
          </Button>
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

// ─── Stats tab ────────────────────────────────────────────────────────────

function StatsTab() {
  const { toast } = useToast();
  const [stats, setStats] = React.useState<StatsResponse["stats"] | null>(
    null
  );
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
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec du chargement des statistiques.");
      }
      const data = (await res.json()) as StatsResponse;
      setStats(data.stats);
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
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

  const maxDaily = Math.max(1, ...stats.dailyData.map((d) => d.count));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble des performances e-learning
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Video className="h-5 w-5" />}
          label="Total vidéos"
          value={stats.totalVideos}
          tone="brand"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Total vues"
          value={stats.totalViews}
          tone="sky"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Complétions"
          value={stats.totalCompletions}
          tone="green"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Taux moyen"
          value={`${stats.avgCompletionRate}%`}
          tone="gold"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Top videos */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-brand" />
              Top 5 vidéos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topVideos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune donnée de visionnage pour le moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead className="text-right">Vues</TableHead>
                      <TableHead className="text-right">
                        Complétions
                      </TableHead>
                      <TableHead className="w-32">Taux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topVideos.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {v.title}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {v.views}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {v.completions}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={v.rate}
                              className="h-2 flex-1"
                            />
                            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                              {v.rate}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7-day chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-brand" />
              Vues (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-between gap-2">
              {stats.dailyData.map((d) => {
                const h = Math.round((d.count / maxDaily) * 100);
                return (
                  <div
                    key={d.date}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-brand/70 transition-all hover:bg-brand"
                        style={{
                          height: `${Math.max(4, h)}%`,
                        }}
                        title={`${d.count} vue(s)`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {d.date}
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────

const STAT_TONE: Record<
  "brand" | "sky" | "green" | "gold",
  { icon: string; bar: string }
> = {
  brand: {
    icon: "bg-brand/10 text-brand",
    bar: "bg-brand",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    bar: "bg-sky-500",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  gold: {
    icon: "bg-brand-green/10 text-brand-green",
    bar: "bg-brand-green",
  },
};

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "brand" | "sky" | "green" | "gold";
}) {
  const t = STAT_TONE[tone];
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1", t.bar)} />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              t.icon
            )}
          >
            {icon}
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
