"use client";

import * as React from "react";
import { SiteRouterProvider, useSiteRouter } from "@/lib/site-router";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { HomePage } from "./pages/home";
import { LoginPage } from "./pages/auth-shared";
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
      case "register-candidate":
        return <RegisterCandidatePage />;
      case "register-recruiter":
        return <RegisterRecruiterPage />;
      case "dashboard":
        return <DashboardPage />;
      default:
        return <HomePage />;
    }
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{page}</main>
      <SiteFooter />
    </div>
  );
}

export function SiteApp() {
  return (
    <SiteRouterProvider>
      <PageRenderer />
    </SiteRouterProvider>
  );
}
