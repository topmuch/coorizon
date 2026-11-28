"use client";

import * as React from "react";

/**
 * useUnreadNotificationsCount — lightweight unread-notification counter for
 * the dashboard shells (visual notification badge in the sidebar).
 *
 * Behaviour:
 *   • Fetches `/api/notifications?countOnly=true` (server returns ONLY the
 *     unread counter — cheap polling endpoint).
 *   • Polls every `intervalMs` (default 45 s) so a new notification lights up
 *     the badge without a page reload.
 *   • Refetches when the browser tab regains focus.
 *   • Refetches whenever `refreshKey` changes — pass the current dashboard
 *     section so the badge refreshes right after the user visits the
 *     Notifications tab (where items get marked as read).
 */
export function useUnreadNotificationsCount(options?: {
  refreshKey?: string | undefined;
  intervalMs?: number;
}): number {
  const refreshKey = options?.refreshKey;
  const intervalMs = options?.intervalMs ?? 45000;
  const [count, setCount] = React.useState(0);

  const fetchCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?countOnly=true", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount?: unknown };
      setCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      // Network hiccup — keep the previous value.
    }
  }, []);

  React.useEffect(() => {
    void fetchCount();

    const intervalId = window.setInterval(() => {
      void fetchCount();
    }, intervalMs);

    const onFocus = () => {
      void fetchCount();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCount, intervalMs, refreshKey]);

  return count;
}
