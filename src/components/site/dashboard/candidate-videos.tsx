"use client";

import * as React from "react";
import {
  Video,
  PlayCircle,
  Youtube,
  Film,
  Clock,
  CheckCircle2,
  Eye,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface VideoView {
  watchTime: number;
  progressPct: number;
  completed: boolean;
  lastWatchedAt: string;
}

interface CandidateVideo {
  id: string;
  title: string;
  description: string | null;
  type: VideoType;
  url: string;
  embedId: string | null;
  category: VideoCategory;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string;
  view: VideoView | null;
}

interface VideosResponse {
  videos: CandidateVideo[];
}

interface TrackResponse {
  view: VideoView;
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

type FilterTab = "all" | "formation" | "tutoriel" | "accueil" | "autre";

// Estimated duration (seconds) used to guess progress for embed-only videos
// where we can't read the player's currentTime.
const ESTIMATED_DURATION = 300;

// ─── Helpers ──────────────────────────────────────────────────────────────

function typeIcon(type: VideoType, className?: string): React.ReactNode {
  if (type === "youtube") return <Youtube className={className} />;
  if (type === "mp4") return <Film className={className} />;
  return <PlayCircle className={className} />;
}

function getThumbnail(video: CandidateVideo): string | null {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.type === "youtube" && video.embedId) {
    return `https://img.youtube.com/vi/${video.embedId}/mqdefault.jpg`;
  }
  return null;
}

function isCompleted(v: CandidateVideo): boolean {
  return !!v.view?.completed || (v.view?.progressPct ?? 0) >= 80;
}

function matchesFilter(v: CandidateVideo, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "autre") return v.category === "autre" || v.category === "personnalise";
  return v.category === tab;
}

// ─── Main component ───────────────────────────────────────────────────────

export function CandidateVideos() {
  const { toast } = useToast();
  const [videos, setVideos] = React.useState<CandidateVideo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [active, setActive] = React.useState<CandidateVideo | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/videos", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec du chargement des vidéos.");
      }
      const data = (await res.json()) as VideosResponse;
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

  const counts = React.useMemo(() => {
    const c: Record<FilterTab, number> = {
      all: 0,
      formation: 0,
      tutoriel: 0,
      accueil: 0,
      autre: 0,
    };
    for (const v of videos) {
      c.all += 1;
      if (v.category === "formation") c.formation += 1;
      else if (v.category === "tutoriel") c.tutoriel += 1;
      else if (v.category === "accueil") c.accueil += 1;
      else c.autre += 1;
    }
    return c;
  }, [videos]);

  const visibleVideos = React.useMemo(
    () => videos.filter((v) => matchesFilter(v, filter)),
    [videos, filter]
  );

  // Update a video's view (used by the player dialog to reflect progress).
  const handleProgress = React.useCallback(
    (videoId: string, view: VideoView) => {
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, view } : v))
      );
      setActive((prev) =>
        prev && prev.id === videoId ? { ...prev, view } : prev
      );
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Video className="h-6 w-6 text-brand" />
            Mes vidéos
          </h1>
          <p className="text-sm text-muted-foreground">
            Visionnez les vidéos e-learning qui vous sont assignées. Votre
            progression est enregistrée automatiquement.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </header>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterTab)}
        className="w-full"
      >
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-initial">
            <Filter className="h-4 w-4" />
            Toutes ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="formation" className="flex-1 sm:flex-initial">
            Formation ({counts.formation})
          </TabsTrigger>
          <TabsTrigger value="tutoriel" className="flex-1 sm:flex-initial">
            Tutoriel ({counts.tutoriel})
          </TabsTrigger>
          <TabsTrigger value="accueil" className="flex-1 sm:flex-initial">
            Accueil ({counts.accueil})
          </TabsTrigger>
          <TabsTrigger value="autre" className="flex-1 sm:flex-initial">
            Autres ({counts.autre})
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && visibleVideos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {filter === "all"
                ? "Aucune vidéo ne vous a été assignée."
                : "Aucune vidéo dans cette catégorie"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {filter === "all"
                ? "Revenez plus tard — de nouvelles vidéos e-learning vous seront proposées par votre formateur."
                : "Changez de filtre pour voir vos autres vidéos."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Videos grid */}
      {!loading && !error && visibleVideos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleVideos.map((v) => (
            <VideoCard key={v.id} video={v} onPlay={() => setActive(v)} />
          ))}
        </div>
      )}

      {/* Player dialog */}
      {active && (
        <VideoPlayerDialog
          video={active}
          onClose={() => setActive(null)}
          onProgress={handleProgress}
        />
      )}
    </div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────

function VideoCard({
  video,
  onPlay,
}: {
  video: CandidateVideo;
  onPlay: () => void;
}) {
  const thumb = getThumbnail(video);
  const completed = isCompleted(video);
  const progress = video.view?.progressPct ?? 0;

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onPlay}
        className="relative block aspect-video w-full bg-muted text-left"
        aria-label={`Regarder « ${video.title} »`}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={video.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Film className="h-10 w-10" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <PlayCircle className="h-8 w-8 text-brand" />
          </div>
        </div>
        {/* Status badge */}
        <div className="absolute right-2 top-2">
          {completed ? (
            <Badge className="gap-1 bg-brand/90 text-white hover:bg-brand/90">
              <CheckCircle2 className="h-3 w-3" />
              Vue
            </Badge>
          ) : progress > 0 ? (
            <Badge className="gap-1 bg-amber-500/90 text-white hover:bg-amber-500/90">
              <Clock className="h-3 w-3" />
              En cours
            </Badge>
          ) : (
            <Badge variant="outline" className="backdrop-blur">
              Nouvelle
            </Badge>
          )}
        </div>
      </button>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Title + type badge */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-semibold leading-snug text-foreground">
              {video.title}
            </h3>
            <Badge
              variant="outline"
              className={cn("shrink-0", TYPE_BADGE_CLASS[video.type])}
            >
              {typeIcon(video.type, "h-3 w-3 mr-1")}
              {TYPE_LABEL[video.type]}
            </Badge>
          </div>
          {video.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {video.description}
            </p>
          )}
        </div>

        {/* Category badge */}
        <div>
          <Badge
            variant="outline"
            className={CATEGORY_BADGE_CLASS[video.category]}
          >
            {CATEGORY_LABEL[video.category]}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Progression
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Button size="sm" className="w-full" onClick={onPlay}>
          <PlayCircle className="h-4 w-4" />
          Regarder
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Player dialog ────────────────────────────────────────────────────────

function VideoPlayerDialog({
  video,
  onClose,
  onProgress,
}: {
  video: CandidateVideo;
  onClose: () => void;
  onProgress: (videoId: string, view: VideoView) => void;
}) {
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Local tracking state, seeded from existing view.
  const [watchTime, setWatchTime] = React.useState<number>(
    video.view?.watchTime ?? 0
  );
  const [progressPct, setProgressPct] = React.useState<number>(
    video.view?.progressPct ?? 0
  );
  const [completed, setCompleted] = React.useState<boolean>(
    isCompleted(video)
  );
  const [marking, setMarking] = React.useState(false);

  // Keep latest values in refs so the interval callback reads fresh data.
  const watchTimeRef = React.useRef(watchTime);
  const progressRef = React.useRef(progressPct);
  watchTimeRef.current = watchTime;
  progressRef.current = progressPct;

  const sendProgress = React.useCallback(
    async (opts?: { completed?: boolean }) => {
      const payload: {
        watchTime?: number;
        progressPct?: number;
        completed?: boolean;
      } = {
        watchTime: watchTimeRef.current,
        progressPct: progressRef.current,
      };
      if (opts?.completed) payload.completed = true;

      try {
        const res = await fetch(`/api/candidate/videos/${video.id}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
        const data = (await res.json()) as TrackResponse;
        onProgress(video.id, data.view);
        if (data.view.completed) setCompleted(true);
      } catch {
        // Silently ignore — tracking is best-effort.
      }
    },
    [video.id, onProgress]
  );

  // Tick every 10s: increment watchTime + estimate progress, then POST.
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      // For MP4, try to read real progress from the video element.
      const el = videoRef.current;
      let nextWatch = watchTimeRef.current + 10;
      let nextProgress = progressRef.current;
      if (el && video.type === "mp4" && el.duration > 0) {
        nextWatch = Math.floor(el.currentTime);
        nextProgress = Math.min(
          100,
          Math.round((el.currentTime / el.duration) * 100)
        );
      } else {
        // Estimate progress for embedded players we can't introspect.
        nextProgress = Math.min(
          95,
          Math.round((nextWatch / ESTIMATED_DURATION) * 100)
        );
      }
      watchTimeRef.current = nextWatch;
      progressRef.current = nextProgress;
      setWatchTime(nextWatch);
      setProgressPct(nextProgress);
      void sendProgress();
    }, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [sendProgress, video.type]);

  const handleMarkCompleted = async () => {
    setMarking(true);
    try {
      const res = await fetch(`/api/candidate/videos/${video.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de la mise à jour.");
      }
      const data = (await res.json()) as TrackResponse;
      onProgress(video.id, data.view);
      setCompleted(true);
      setProgressPct(100);
      toast({
        title: "Vidéo marquée comme terminée",
        description: video.title,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setMarking(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <PlayCircle className="h-5 w-5 shrink-0 text-brand" />
            <span className="truncate">{video.title}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Lecteur vidéo — {video.title}
          </DialogDescription>
        </DialogHeader>

        {/* Player — MP4 plays inline, YouTube/Vimeo redirect to external site */}
        {video.type === "mp4" ? (
          <div className="overflow-hidden rounded-md border bg-black">
            <video
              ref={videoRef}
              src={video.url}
              controls
              className="w-full aspect-video"
              preload="metadata"
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            {/* Thumbnail with play button → opens YouTube/Vimeo in new tab */}
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block aspect-video w-full bg-black"
            >
              {getThumbnail(video) ? (
                <img
                  src={getThumbnail(video) || ""}
                  alt={video.title}
                  className="h-full w-full object-cover opacity-90"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  {typeIcon(video.type, "h-10 w-10")}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform hover:scale-110">
                  {video.type === "youtube" ? (
                    <Youtube className="h-8 w-8 text-white" />
                  ) : (
                    <PlayCircle className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
            </a>
            <div className="flex items-center justify-center gap-2 bg-muted/50 px-4 py-3">
              <Button
                size="sm"
                onClick={() => window.open(video.url, "_blank", "noopener,noreferrer")}
              >
                {video.type === "youtube" ? <Youtube className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                Regarder sur {video.type === "youtube" ? "YouTube" : "Vimeo"}
              </Button>
              <span className="text-xs text-muted-foreground">
                S'ouvre dans un nouvel onglet
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        {video.description && (
          <p className="text-sm text-muted-foreground">{video.description}</p>
        )}

        <Separator />

        {/* Progress + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Visionné :</span>
              <span className="font-semibold tabular-nums">
                {progressPct}%
              </span>
              {completed && (
                <Badge className="ml-2 gap-1 bg-brand/90 text-white hover:bg-brand/90">
                  <CheckCircle2 className="h-3 w-3" />
                  Terminée
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {Math.floor(watchTime / 60)}:
              {String(watchTime % 60).padStart(2, "0")} de visionnage
            </div>
          </div>

          <Button
            onClick={handleMarkCompleted}
            disabled={marking || completed}
            variant={completed ? "secondary" : "default"}
          >
            {marking ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {completed ? "Déjà terminée" : "Marquer comme terminé"}
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
