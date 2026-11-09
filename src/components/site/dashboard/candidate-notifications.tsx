"use client";

import * as React from "react";
import {
  Bell,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  Trash2,
  Clock,
  Inbox,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSiteRouter, type SiteRoute } from "@/lib/site-router";

// ─── Types ─────────────────────────────────────────────────────────────────

type NotificationType = "Info" | "Success" | "Warning" | "Error";

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

interface MarkReadResponse {
  updated: number;
}

interface SingleNotificationResponse {
  notification: Notification;
}

type FilterTab = "all" | "unread";

// ─── SiteRoute whitelist (kept in sync with site-router.tsx) ───────────────

const SITE_ROUTES: ReadonlySet<string> = new Set<SiteRoute>([
  "home",
  "jobs",
  "training",
  "work-in-italy",
  "partners",
  "how-it-works",
  "about",
  "faq",
  "contact",
  "login",
  "register-candidate",
  "register-recruiter",
  "dashboard",
]);

/**
 * Parse a notification `link` such as "dashboard?section=applications" into a
 * `{ route, params }` pair suitable for `navigate()`. Returns null if the link
 * is missing or points to an unknown route.
 */
function parseLink(
  link: string | null
): { route: SiteRoute; params?: Record<string, string> } | null {
  if (!link || typeof link !== "string") return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  const [rawRoute, rawQuery = ""] = trimmed.split("?");
  const route = rawRoute?.trim() ?? "";
  if (!route || !SITE_ROUTES.has(route)) return null;
  const params: Record<string, string> = {};
  const search = new URLSearchParams(rawQuery);
  search.forEach((value, key) => {
    if (key) params[key] = value;
  });
  return {
    route: route as SiteRoute,
    params: Object.keys(params).length > 0 ? params : undefined,
  };
}

// ─── Time-ago helper ───────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "À l'instant";
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours} h`;
  if (days < 30) return `Il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Type meta (icon + colors) ─────────────────────────────────────────────

interface TypeMeta {
  icon: React.ReactNode;
  badgeClass: string;
  iconWrapClass: string;
}

function getTypeMeta(type: NotificationType): TypeMeta {
  switch (type) {
    case "Success":
      return {
        icon: <CheckCircle2 className="h-5 w-5" />,
        badgeClass: "bg-brand-green/15 text-brand-green",
        iconWrapClass: "bg-brand-green/10 text-brand-green",
      };
    case "Warning":
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        badgeClass: "bg-amber-100 text-amber-800",
        iconWrapClass: "bg-amber-100 text-amber-700",
      };
    case "Error":
      return {
        icon: <XCircle className="h-5 w-5" />,
        badgeClass: "bg-italian-red/10 text-italian-red",
        iconWrapClass: "bg-italian-red/10 text-italian-red",
      };
    case "Info":
    default:
      return {
        icon: <Info className="h-5 w-5" />,
        badgeClass: "bg-brand/10 text-brand",
        iconWrapClass: "bg-brand/10 text-brand",
      };
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CandidateNotifications() {
  const { navigate } = useSiteRouter();
  const { toast } = useToast();

  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<FilterTab>("all");

  const [markingAll, setMarkingAll] = React.useState(false);
  const [markingId, setMarkingId] = React.useState<string | null>(null);

  // Delete confirmation state
  const [deletingTarget, setDeletingTarget] = React.useState<Notification | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);

  // ─── Fetch notifications ─────────────────────────────────────────────
  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Échec du chargement des notifications."
        );
      }
      const data = (await res.json()) as NotificationsResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // ─── Mark all as read ────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Impossible de marquer les notifications comme lues."
        );
      }
      await (res.json() as Promise<MarkReadResponse>).catch(() => null);
      toast({
        title: "Notifications marquées comme lues",
        description: "Toutes vos notifications ont été marquées comme lues.",
      });
      await fetchNotifications();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error
            ? e.message
            : "Une erreur est survenue.",
      });
    } finally {
      setMarkingAll(false);
    }
  };

  // ─── Mark a single notification as read ──────────────────────────────
  const handleMarkRead = async (id: string) => {
    if (markingId === id) return;
    setMarkingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Impossible de marquer la notification comme lue."
        );
      }
      await (res.json() as Promise<SingleNotificationResponse>).catch(
        () => null
      );
      toast({
        title: "Marquée comme lue",
      });
      await fetchNotifications();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setMarkingId(null);
    }
  };

  // ─── Delete a notification (after confirmation) ──────────────────────
  const handleDelete = async () => {
    if (!deletingTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notifications/${deletingTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Impossible de supprimer la notification."
        );
      }
      toast({
        title: "Notification supprimée",
      });
      setDeletingTarget(null);
      await fetchNotifications();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ─── Click on a notification card / "Voir" button ────────────────────
  const handleClickLink = (notification: Notification) => {
    const parsed = parseLink(notification.link);
    if (!parsed) return;
    navigate(parsed.route, parsed.params);
  };

  // ─── Client-side filter by tab ───────────────────────────────────────
  const visibleNotifications = React.useMemo(() => {
    if (tab === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, tab]);

  const totalUnread = unreadCount;

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy">
            <Bell className="h-6 w-6 text-brand" />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restez informé des mises à jour de vos candidatures, dossiers et
            formations.
          </p>
        </div>
        {totalUnread > 0 && !loading && (
          <Button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="shrink-0 bg-brand text-white hover:bg-brand/90"
          >
            {markingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Marquage…
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Tout marquer comme lu
              </>
            )}
          </Button>
        )}
      </header>

      {/* Unread badge summary */}
      {!loading && !error && totalUnread > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-italian-red/10 text-italian-red">
            {totalUnread} non lue{totalUnread > 1 ? "s" : ""}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Vous avez de nouvelles notifications à consulter.
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        // Empty state
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy">
              Aucune notification
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Vous serez notifié ici dès qu'il y aura du nouveau sur vos
              candidatures, vos dossiers d'immigration ou vos formations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as FilterTab)}
            className="w-full"
          >
            <TabsList className="flex w-full max-w-md">
              <TabsTrigger value="all" className="flex-1">
                Toutes ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">
                Non lues ({totalUnread})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Notifications list */}
          {visibleNotifications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-brand-green" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucune notification non lue. C'est tout bon&nbsp;!
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {visibleNotifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  marking={markingId === n.id}
                  onMarkRead={handleMarkRead}
                  onDelete={(target) => setDeletingTarget(target)}
                  onClickLink={handleClickLink}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer cette notification ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTarget && (
                <>
                  La notification « {deletingTarget.title} » sera définitivement
                  supprimée. Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Notification card ─────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  marking: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (notification: Notification) => void;
  onClickLink: (notification: Notification) => void;
}

function NotificationCard({
  notification,
  marking,
  onMarkRead,
  onDelete,
  onClickLink,
}: NotificationCardProps) {
  const meta = getTypeMeta(notification.type);
  const hasLink = !!parseLink(notification.link);
  const unread = !notification.isRead;

  const handleCardClick = () => {
    if (hasLink) onClickLink(notification);
  };

  return (
    <li>
      <Card
        className={`transition-all ${
          unread ? "border-brand/40 bg-brand/[0.03]" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Type icon */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.iconWrapClass}`}
              aria-hidden
            >
              {meta.icon}
            </div>

            {/* Main content */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3
                  className={`text-base ${
                    unread ? "font-bold text-navy" : "font-semibold text-navy"
                  }`}
                >
                  {notification.title}
                </h3>
                <Badge
                  variant="outline"
                  className={`shrink-0 ${meta.badgeClass}`}
                >
                  {notification.type}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {notification.message}
              </p>

              <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {timeAgo(notification.createdAt)}
              </div>

              {hasLink && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-brand hover:text-brand/80"
                  onClick={handleCardClick}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Voir le détail
                </Button>
              )}
            </div>

            <Separator
              orientation="vertical"
              className="hidden h-auto sm:block"
            />

            {/* Actions */}
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch">
              {unread && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkRead(notification.id)}
                  disabled={marking}
                  className="flex-1 sm:flex-none"
                >
                  {marking ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Marquer comme lu
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(notification)}
                className="flex-1 border-italian-red/30 text-italian-red hover:bg-italian-red/5 hover:text-italian-red sm:flex-none"
                aria-label="Supprimer la notification"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Supprimer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
