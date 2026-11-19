"use client";

import * as React from "react";

export type SiteRoute =
  | "home"
  | "jobs"
  | "training"
  | "work-in-italy"
  | "partners"
  | "how-it-works"
  | "about"
  | "faq"
  | "contact"
  | "login"
  | "login-candidate"
  | "login-recruiter"
  | "register-candidate"
  | "register-recruiter"
  | "dashboard";

export interface SiteRouterState {
  route: SiteRoute;
  params: URLSearchParams;
  navigate: (route: SiteRoute, params?: Record<string, string>) => void;
}

const RouterContext = React.createContext<SiteRouterState | null>(null);

const ALLOWED_ROUTES: SiteRoute[] = [
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
  "login-candidate",
  "login-recruiter",
  "register-candidate",
  "register-recruiter",
  "dashboard",
];

/** Map a URL path like "/jobs" or "/dashboard?section=offers" to a route + params */
function parsePath(pathname: string, search: string): { route: SiteRoute; params: URLSearchParams } {
  // Strip leading and trailing slashes
  const cleanPath = pathname.replace(/^\/+|\/+$/g, "");
  // Handle root or empty → home
  if (!cleanPath || cleanPath === "") {
    return { route: "home", params: new URLSearchParams(search) };
  }
  // Map path to route — allow hyphens (e.g. "work-in-italy", "login-candidate")
  const route = cleanPath as SiteRoute;
  if (ALLOWED_ROUTES.includes(route)) {
    return { route, params: new URLSearchParams(search) };
  }
  return { route: "home", params: new URLSearchParams(search) };
}

/** Get current route from the browser URL */
function getCurrentState(): { route: SiteRoute; params: URLSearchParams } {
  if (typeof window === "undefined") {
    return { route: "home", params: new URLSearchParams() };
  }
  return parsePath(window.location.pathname, window.location.search);
}

/** Build a clean URL for a route (e.g. /jobs, /dashboard?section=offers) */
function buildUrl(route: SiteRoute, params?: Record<string, string>): string {
  const path = route === "home" ? "/" : `/${route}`;
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `${path}${query}`;
}

export function SiteRouterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{ route: SiteRoute; params: URLSearchParams }>(
    () => getCurrentState()
  );

  React.useEffect(() => {
    const onPopState = () => {
      setState(getCurrentState());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", onPopState);

    // If the URL has a hash (old-style #/route), redirect to clean URL
    if (window.location.hash && window.location.hash.startsWith("#/")) {
      const hashRaw = window.location.hash.replace(/^#\/?/, "");
      const [hashPath, hashQuery = ""] = hashRaw.split("?");
      const route = (hashPath || "home") as SiteRoute;
      if (ALLOWED_ROUTES.includes(route)) {
        const newUrl = buildUrl(route, hashQuery ? Object.fromEntries(new URLSearchParams(hashQuery)) : undefined);
        window.history.replaceState(null, "", newUrl);
        setState(getCurrentState());
      }
    }

    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = React.useCallback(
    (route: SiteRoute, params?: Record<string, string>) => {
      const url = buildUrl(route, params);
      window.history.pushState(null, "", url);
      setState(getCurrentState());
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const value = React.useMemo<SiteRouterState>(
    () => ({ route: state.route, params: state.params, navigate }),
    [state, navigate]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useSiteRouter() {
  const ctx = React.useContext(RouterContext);
  if (!ctx) throw new Error("useSiteRouter must be used within SiteRouterProvider");
  return ctx;
}

export function useNavigate() {
  return useSiteRouter().navigate;
}
