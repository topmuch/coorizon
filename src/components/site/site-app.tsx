"use client";

import * as React from "react";
import { SiteRouterProvider, useSiteRouter } from "@/lib/site-router";
import { useSession } from "@/lib/auth/session-provider";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { HomePage } from "./pages/home";
import {
  LoginPage,
  CandidateLoginPage,
  RecruiterLoginPage,
  TrainerLoginPage,
  AgentLoginPage,
  AdminLoginPage,
} from "./pages/auth-shared";
import { RegisterCandidatePage } from "./pages/register-candidate";
import { RegisterRecruiterPage } from "./pages/register-recruiter";
import { JobOffersPage } from "./pages/job-offers";
import { TrainingPage } from "./pages/training";
import { WorkInItalyPage } from "./pages/work-in-italy";
import { PartnersPage } from "./pages/partners";
import { HowItWorksPage } from "./pages/how-it-works";
import { AboutPage } from "./pages/about";
import { FaqPage } from "./pages/faq";
import { ContactPage } from "./pages/contact";
import { DashboardPage } from "./pages/dashboard";
import { PlusCoorizonPage } from "./pages/plus-coorizon";
import {
  MentionsLegalesPage,
  PolitiqueConfidentialitePage,
  ConditionsGeneralesPage,
  CookiesPage,
} from "./pages/legal";
import { AiAssistantWidget } from "./ai-assistant-widget";
import { WhatsAppWidget } from "./whatsapp-widget";
import type { SeoConfig } from "@/lib/platform-settings";

function PageRenderer() {
  const { route } = useSiteRouter();
  const { user } = useSession();

  const page = React.useMemo(() => {
    switch (route) {
      case "home":
        return <HomePage />;
      case "jobs":
        return <JobOffersPage />;
      case "training":
        return <TrainingPage />;
      case "work-in-italy":
        return <WorkInItalyPage />;
      case "partners":
        return <PartnersPage />;
      case "how-it-works":
        return <HowItWorksPage />;
      case "about":
        return <AboutPage />;
      case "faq":
        return <FaqPage />;
      case "contact":
        return <ContactPage />;
      case "login":
        return <LoginPage />;
      case "login-candidate":
        return <CandidateLoginPage />;
      case "login-recruiter":
        return <RecruiterLoginPage />;
      case "login-trainer":
        return <TrainerLoginPage />;
      case "login-agent":
        return <AgentLoginPage />;
      case "login-admin":
        return <AdminLoginPage />;
      case "register-candidate":
        return <RegisterCandidatePage />;
      case "register-recruiter":
        return <RegisterRecruiterPage />;
      case "mentions-legales":
        return <MentionsLegalesPage />;
      case "politique-confidentialite":
        return <PolitiqueConfidentialitePage />;
      case "conditions-generales":
        return <ConditionsGeneralesPage />;
      case "cookies":
        return <CookiesPage />;
      case "plus-coorizon":
        return <PlusCoorizonPage />;
      case "dashboard":
        return <DashboardPage />;
      default:
        return <HomePage />;
    }
  }, [route]);

  // The dashboard and the login pages are full-screen immersive views:
  // the public site header/footer/widgets are hidden there.
  const isDashboard = route === "dashboard";
  const isLogin = route === "login" || route.startsWith("login-");
  const isImmersive = isDashboard || isLogin;

  // The floating AI assistant is available on the dashboards, except for
  // candidates (removed on request — the candidate space stays focused).
  const showAiAssistant = isDashboard && user?.role !== "Candidate";

  return (
    <div className="flex min-h-screen flex-col">
      <SeoMetadata />
      {!isImmersive && <SiteHeader />}
      <main className="flex-1">{page}</main>
      {!isImmersive && <SiteFooter />}
      {showAiAssistant && <AiAssistantWidget />}
      {!isImmersive && <WhatsAppWidget />}
    </div>
  );
}

export function SiteApp() {
  // Suspense is required because SiteRouterProvider uses useSearchParams
  // (Next.js requirement during prerendering).
  return (
    <React.Suspense fallback={null}>
      <SiteRouterProvider>
        <PageRenderer />
      </SiteRouterProvider>
    </React.Suspense>
  );
}

// ─── SEO metadata applier ──────────────────────────────────────────────────

/** Set (or create) a <meta> tag in the document head. */
function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * SeoMetadata — fetches the SEO configuration managed from the SuperAdmin
 * settings (GET /api/settings/seo, public) and applies it to the document:
 * <title>, meta description, meta keywords, Open Graph tags and robots.
 * Values fall back to the SSR defaults defined in layout.tsx.
 */
function SeoMetadata() {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/seo", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { seo?: SeoConfig };
        const seo = data.seo;
        if (cancelled || !seo) return;

        if (seo.metaTitle) document.title = seo.metaTitle;
        if (seo.metaDescription) upsertMeta("name", "description", seo.metaDescription);
        if (seo.metaKeywords) upsertMeta("name", "keywords", seo.metaKeywords);
        const ogTitle = seo.ogTitle || seo.metaTitle;
        const ogDescription = seo.ogDescription || seo.metaDescription;
        if (ogTitle) upsertMeta("property", "og:title", ogTitle);
        if (ogDescription) upsertMeta("property", "og:description", ogDescription);
        upsertMeta("name", "robots", seo.indexable ? "index, follow" : "noindex, nofollow");
      } catch {
        // Metadata stays at the SSR defaults on failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
