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
  | "register-candidate"
  | "register-recruiter"
  | "dashboard";

export interface SiteRouterState {
  route: SiteRoute;
  params: URLSearchParams;
  navigate: (route: SiteRoute, params?: Record<string, string>) => void;
}

const RouterContext = React.createContext<SiteRouterState | null>(null);

function parseHash(): { route: SiteRoute; params: URLSearchParams } {
  if (typeof window === "undefined") {
    return { route: "home", params: new URLSearchParams() };
  }
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const route = (path || "home") as SiteRoute;
  const allowed: SiteRoute[] = [
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
  ];
  return {
    route: allowed.includes(route) ? route : "home",
    params: new URLSearchParams(query),
  };
}

export function SiteRouterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{ route: SiteRoute; params: URLSearchParams }>(
    () => parseHash()
  );

  React.useEffect(() => {
    const onHashChange = () => {
      setState(parseHash());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/home");
    }
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = React.useCallback(
    (route: SiteRoute, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : "";
      window.location.hash = `/${route}${query}`;
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
