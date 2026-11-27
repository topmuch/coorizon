"use client";

import * as React from "react";
import { Bell, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface SectionNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

function sectionFromLink(link: string | null): string | null {
  if (!link) return null;
  const m = link.match(/section=([\w]+)/);
  if (m) return m[1];
  const legacy = link.match(/\/admin\/(\w+)/);
  return legacy ? legacy[1] : null;
}

/**
 * Visual notification banner for an admin back-office section: lists the
 * unread in-app notifications targeting this section (new registrations,
 * forfait requests…) and marks them as read once displayed, which clears the
 * red badge in the sidebar.
 */
export function AdminSectionAlerts({
  section,
  className,
}: {
  section: string;
  className?: string;
}) {
  const [items, setItems] = React.useState<SectionNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?unread=true&pageSize=200", {
        credentials: "include",
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { notifications?: SectionNotification[] & { link?: string | null }[] };
      const matching = (data.notifications ?? []).filter(
        (n) => sectionFromLink((n as { link?: string | null }).link ?? null) === section
      );
      setItems(matching);

      if (matching.length > 0) {
        // Mark these notifications as read: the sidebar badge disappears.
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ notificationIds: matching.map((n) => n.id) }),
        }).catch(() => {});
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [section]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Vérification des nouveautés…
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <Alert
      className={cn(
        "border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
        className
      )}
    >
      <Bell className="h-4 w-4" aria-hidden />
      <AlertTitle>
        {items.length} nouveaut{items.length > 1 ? "és" : "é"} à traiter
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-1">
          {items.slice(0, 5).map((n) => (
            <li key={n.id} className="text-xs">
              <span className="font-semibold">{n.title}</span> — {n.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
