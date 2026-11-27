"use client";

import * as React from "react";
import { SiteRouterProvider, useSiteRouter } from "@/lib/site-router";
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
import { AiAssistantWidget } from "./ai-assistant-widget";
import { WhatsAppWidget } from "./whatsapp-widget";

function PageRenderer() {
  const { route } = useSiteRouter();

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

  return (
    <div className="flex min-h-screen flex-col">
      {!isImmersive && <SiteHeader />}
      <main className="flex-1">{page}</main>
      {!isImmersive && <SiteFooter />}
      {isDashboard && <AiAssistantWidget />}
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
