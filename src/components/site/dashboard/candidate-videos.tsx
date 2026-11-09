"use client";

import * as React from "react";
import {
  Video,
  PlayCircle,
  Clock,
  CheckCircle2,
  Eye,
  Filter,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface VideoView {
  id: string;
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

// ─── Constants ────────────────────────────────────────────────────────────

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

type FilterTab = "all" | "in_progress" | "completed" | "not_started";

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

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getThumbnail(video: CandidateVideo): string | null {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.type === "youtube" && video.embedId) {
    return `https://img.youtube.com/vi/${video.embedId}/hqdefault.jpg`;
  }
  return null;
}

function getVideoStatus(
  video: CandidateVideo
): "not_started" | "in_progress" | "completed" {
  if (!video.view) return "not_started";
  if (video.view.completed || video.view.progressPct >= 80)
    return "completed";
  return "in_progress";
}

function getMp4Src(url: string): string {
  // The stored URL is relative to the project root (uploads/videos/...).
  // Expose it as a root-relative path so the browser can fetch it via the
  // static file server (or download-style API configured upstream).
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return url.startsWith("/") ? url : `/${url}`;
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
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement.");
      }
      const data = (await res.json()) as { videos: CandidateVideo[] };
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
    const c = { all: videos.length, in_progress: 0, completed: 0, not_started: 0 };
    for (const v of videos) {
      const s = getVideoStatus(v);
      if (s === "in_progress") c.in_progress += 1;
      else if (s === "completed") c.completed += 1;
      else c.not_started += 1;
    }
    return c;
  }, [videos]);

  const visibleVideos = React.useMemo(() => {
    if (filter === "all") return videos;
    return videos.filter((v) => getVideoStatus(v) === filter);
  }, [videos, filter]);

  const handleProgressUpdate = React.useCallback(
    (videoId: string, view: VideoView) => {
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, view } : v))
      );
      // Also update the active dialog video if it's the same.
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
          <TabsTrigger
            value="in_progress"
            className="flex-1 sm:flex-initial"
          >
            En cours ({counts.in_progress})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 sm:flex-initial">
            <CheckCircle2 className="h-4 w-4" />
            Terminées ({counts.completed})
          </TabsTrigger>
          <TabsTrigger value="not_started" className="flex-1 sm:flex-initial">
            Non commencées ({counts.not_started})
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
                ? "Aucune vidéo ne vous est assignée pour le moment."
                : filter === "in_progress"
                ? "Aucune vidéo en cours"
                : filter === "completed"
                ? "Aucune vidéo terminée"
                : "Toutes vos vidéos ont été commencées"}
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
          onProgress={handleProgressUpdate}
        />
      )}
    </div>
  );
}

// ─── Video card ────────────────────────────────────────────────────────────

function VideoCard({
  video,
  onPlay,
}: {
  video: CandidateVideo;
  onPlay: () => void;
}) {
  const thumb = getThumbnail(video);
  const status = getVideoStatus(video);
  const progress = video.view?.progressPct ?? 0;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onPlay}
        className="block w-full text-left"
        aria-label={`Lire la vidéo ${video.title}`}
      >
        <div className="relative aspect-video w-full bg-muted">
          {thumb ? (
            <img
              src={thumb}
              alt={video.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Video className="h-10 w-10" />
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
            {status === "completed" ? (
              <Badge className="gap-1 bg-brand/90 text-white hover:bg-brand/90">
                <CheckCircle2 className="h-3 w-3" />
                Terminée
              </Badge>
            ) : status === "in_progress" ? (
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
          {/* Duration */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
      </button>

      <CardContent className="space-y-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-semibold text-foreground">
              {video.title}
            </h3>
            <Badge
              variant="outline"
              className={cn("shrink-0", CATEGORY_STYLE[video.category])}
            >
              {CATEGORY_LABEL[video.category]}
            </Badge>
          </div>
          {video.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {video.description}
            </p>
          )}
        </div>

        {/* Progress bar */}
        {video.view && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Progression
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            {TYPE_LABEL[video.type]}
          </span>
          <span>{formatDateFr(video.createdAt)}</span>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={onPlay}
        >
          <PlayCircle className="h-4 w-4" />
          {status === "not_started" ? "Commencer" : "Reprendre"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── YouTube IFrame API types ─────────────────────────────────────────────

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement | string,
    opts: {
      videoId: string;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      };
      playerVars?: Record<string, unknown>;
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Track whether the YT script has been loaded / is loading.
let ytScriptPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SSR"));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (ytScriptPromise) return ytScriptPromise;
  ytScriptPromise = new Promise<void>((resolve) => {
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
  return ytScriptPromise;
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
  const [progressPct, setProgressPct] = React.useState(
    video.view?.progressPct ?? 0
  );
  const [watchTime, setWatchTime] = React.useState(video.view?.watchTime ?? 0);
  const [completed, setCompleted] = React.useState(
    video.view?.completed ?? false
  );
  const [playerReady, setPlayerReady] = React.useState(false);

  // Refs to the actual player instances.
  const ytPlayerRef = React.useRef<YTPlayer | null>(null);
  const ytContainerRef = React.useRef<HTMLDivElement | null>(null);
  const videoElRef = React.useRef<HTMLVideoElement | null>(null);
  const vimeoPlayerRef = React.useRef<{
    getCurrentTime: () => Promise<number>;
    getDuration: () => Promise<number>;
  } | null>(null);

  // Keep latest values in refs so the interval callback doesn't go stale.
  const watchTimeRef = React.useRef(watchTime);
  const progressPctRef = React.useRef(progressPct);
  const completedRef = React.useRef(completed);
  React.useEffect(() => {
    watchTimeRef.current = watchTime;
  }, [watchTime]);
  React.useEffect(() => {
    progressPctRef.current = progressPct;
  }, [progressPct]);
  React.useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  // ─── Track progress ───────────────────────────────────────────────────
  const trackProgress = React.useCallback(async () => {
    let currentTime = 0;
    let duration = 0;

    if (video.type === "youtube" && ytPlayerRef.current) {
      try {
        currentTime = ytPlayerRef.current.getCurrentTime() || 0;
        duration = ytPlayerRef.current.getDuration() || 0;
      } catch {
        return;
      }
    } else if (video.type === "mp4" && videoElRef.current) {
      currentTime = videoElRef.current.currentTime || 0;
      duration = videoElRef.current.duration || 0;
    } else if (video.type === "vimeo" && vimeoPlayerRef.current) {
      try {
        currentTime = await vimeoPlayerRef.current.getCurrentTime();
        duration = await vimeoPlayerRef.current.getDuration();
      } catch {
        return;
      }
    }

    if (duration <= 0) return;

    const pct = Math.min(100, Math.round((currentTime / duration) * 100));
    const isCompleted = pct >= 80;
    // Watch time accumulates — we send the cumulative time the user has spent.
    // For simplicity, send the max(current stored, current playback time).
    const cumulativeWatchTime = Math.max(
      watchTimeRef.current,
      Math.floor(currentTime)
    );

    setWatchTime(cumulativeWatchTime);
    setProgressPct(pct);
    if (isCompleted && !completedRef.current) {
      setCompleted(true);
      toast({
        title: "Vidéo terminée ✓",
        description: "Félicitations, vous avez complété cette vidéo.",
      });
    }

    try {
      const res = await fetch(`/api/candidate/videos/${video.id}/track`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          watchTime: cumulativeWatchTime,
          progressPct: pct,
          completed: isCompleted,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { view: VideoView };
        onProgress(video.id, data.view);
      }
    } catch {
      // Best-effort: silent failure, the next tick will retry.
    }
  }, [video.id, video.type, onProgress, toast]);

  // 5-second interval tracking
  React.useEffect(() => {
    if (!playerReady) return;
    const interval = setInterval(trackProgress, 5000);
    return () => clearInterval(interval);
  }, [playerReady, trackProgress]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, []);

  // ─── Render player ────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-h-[95vh] max-w-4xl overflow-y-auto p-0"
        showCloseButton={false}
      >
        {/* Top progress bar */}
        <div className="relative">
          <div className="h-1.5 w-full bg-muted">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          {completed && (
            <div className="absolute left-3 top-3 z-10">
              <Badge className="gap-1 bg-brand/95 text-white hover:bg-brand/95">
                <CheckCircle2 className="h-3 w-3" />
                Vidéo terminée ✓
              </Badge>
            </div>
          )}
        </div>

        {/* Player */}
        <div className="relative aspect-video w-full bg-black">
          {video.type === "youtube" && (
            <YouTubePlayer
              video={video}
              containerRef={ytContainerRef}
              onReady={(player) => {
                ytPlayerRef.current = player;
                setPlayerReady(true);
              }}
            />
          )}
          {video.type === "vimeo" && (
            <VimeoPlayer
              video={video}
              onReady={(player) => {
                vimeoPlayerRef.current = player;
                setPlayerReady(true);
              }}
            />
          )}
          {video.type === "mp4" && (
            <video
              ref={videoElRef}
              src={getMp4Src(video.url)}
              controls
              autoPlay
              className="h-full w-full"
              onLoadedMetadata={() => setPlayerReady(true)}
              onPlay={() => setPlayerReady(true)}
            >
              Votre navigateur ne prend pas en charge la lecture de vidéos MP4.
            </video>
          )}
          {!playerReady && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </div>

        {/* Title + description */}
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {video.title}
            </h2>
            <Badge
              variant="outline"
              className={CATEGORY_STYLE[video.category]}
            >
              {CATEGORY_LABEL[video.category]}
            </Badge>
          </div>
          {video.description && (
            <p className="text-sm text-muted-foreground">
              {video.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Video className="h-3.5 w-3.5" />
              {TYPE_LABEL[video.type]}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {Math.floor(watchTime / 60)}m {watchTime % 60}s visionnées
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {progressPct}% de progression
            </span>
          </div>
        </div>

        <DialogFooter className="border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── YouTube player ────────────────────────────────────────────────────────

function YouTubePlayer({
  video,
  containerRef,
  onReady,
}: {
  video: CandidateVideo;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  onReady: (player: YTPlayer) => void;
}) {
  React.useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;

    loadYouTubeAPI()
      .then(() => {
        if (cancelled || !containerRef.current || !video.embedId) return;
        const YT = window.YT;
        if (!YT) return;
        // Clear any previous iframe.
        containerRef.current.innerHTML = "";
        const host = document.createElement("div");
        host.style.width = "100%";
        host.style.height = "100%";
        containerRef.current.appendChild(host);

        player = new YT.Player(host, {
          videoId: video.embedId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            autoplay: 1,
          },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              onReady(e.target);
            },
          },
        });
      })
      .catch(() => {
        // ignore — SSR or script failure
      });

    return () => {
      cancelled = true;
      if (player) {
        try {
          player.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [video.embedId, containerRef, onReady]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="Lecteur YouTube"
    />
  );
}

// ─── Vimeo player ──────────────────────────────────────────────────────────

interface VimeoPlayerAPI {
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
  ready: () => Promise<void>;
}

interface VimeoNamespace {
  Player: new (el: HTMLIFrameElement) => VimeoPlayerAPI;
}

declare global {
  interface Window {
    Vimeo?: VimeoNamespace;
  }
}

let vimeoScriptPromise: Promise<void> | null = null;
function loadVimeoAPI(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SSR"));
  }
  if (window.Vimeo && window.Vimeo.Player) {
    return Promise.resolve();
  }
  if (vimeoScriptPromise) return vimeoScriptPromise;
  vimeoScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      "vimeo-player-api"
    ) as HTMLScriptElement | null;
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "vimeo-player-api";
      tag.src = "https://player.vimeo.com/api/player.js";
      tag.async = true;
      tag.onload = () => resolve();
      tag.onerror = () => reject(new Error("Vimeo API load failed"));
      document.head.appendChild(tag);
    } else if (window.Vimeo && window.Vimeo.Player) {
      resolve();
    } else {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Vimeo API load failed"))
      );
    }
  });
  return vimeoScriptPromise;
}

function VimeoPlayer({
  video,
  onReady,
}: {
  video: CandidateVideo;
  onReady: (player: VimeoPlayerAPI) => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let player: VimeoPlayerAPI | null = null;

    if (!video.embedId) return;
    loadVimeoAPI()
      .then(() => {
        if (cancelled || !iframeRef.current) return;
        const V = window.Vimeo;
        if (!V || !V.Player || !iframeRef.current) return;
        const p = new V.Player(iframeRef.current);
        player = {
          getCurrentTime: () => p.getCurrentTime(),
          getDuration: () => p.getDuration(),
          ready: () => p.ready(),
        };
        p.ready().then(() => {
          if (!cancelled && player) onReady(player);
        });
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, [video.embedId, onReady]);

  if (!video.embedId) return null;
  return (
    <iframe
      ref={iframeRef}
      src={`https://player.vimeo.com/video/${video.embedId}?autoplay=1`}
      className="h-full w-full"
      frameBorder={0}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      title={video.title}
    />
  );
}
