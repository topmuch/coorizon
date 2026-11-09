"use client";

import * as React from "react";
import { useSiteRouter } from "@/lib/site-router";
import { useSession } from "@/lib/auth/session-provider";
import { CandidateShell, type DashboardSection } from "../dashboard/candidate-shell";
import { CandidateOverview } from "../dashboard/candidate-overview";
import { CandidateProfile } from "../dashboard/candidate-profile";
import { CandidateDocuments } from "../dashboard/candidate-documents";
import { CandidateCv } from "../dashboard/candidate-cv";
import { CandidateJobs } from "../dashboard/candidate-jobs";
import { CandidateApplications } from "../dashboard/candidate-applications";
import { CandidateSettings } from "../dashboard/candidate-settings";
import { ComingSoonCard } from "../dashboard/coming-soon";
import { RecruiterShell, RecruiterPendingScreen, type RecruiterSection } from "../dashboard/recruiter-shell";
import { RecruiterOverview } from "../dashboard/recruiter-overview";
import { RecruiterCompany } from "../dashboard/recruiter-company";
import { RecruiterOffers } from "../dashboard/recruiter-offers";
import { RecruiterApplications } from "../dashboard/recruiter-applications";
import { RecruiterInterviews } from "../dashboard/recruiter-interviews";
import { RecruiterSettings } from "../dashboard/recruiter-settings";
import { AdminShell, type AdminSection } from "../dashboard/admin-shell";
import { AdminOverview } from "../dashboard/admin-overview";
import { AdminUsers } from "../dashboard/admin-users";
import { AdminCompanies } from "../dashboard/admin-companies";
import { AdminOffers } from "../dashboard/admin-offers";
import { AdminApplications } from "../dashboard/admin-applications";
import { AdminCms } from "../dashboard/admin-cms";
import { AdminAudit } from "../dashboard/admin-audit";
import { AdminSettings } from "../dashboard/admin-settings";
import { TrainerShell, type TrainerSection } from "../dashboard/trainer-shell";
import { TrainerOverview } from "../dashboard/trainer-overview";
import { TrainerCourses } from "../dashboard/trainer-courses";
import { TrainerLessons } from "../dashboard/trainer-lessons";
import { TrainerLearners } from "../dashboard/trainer-learners";
import { TrainerExams } from "../dashboard/trainer-exams";
import { TrainerSettings } from "../dashboard/trainer-settings";
import { CandidateMyTraining } from "../dashboard/candidate-my-training";
import { CandidateExams } from "../dashboard/candidate-exams";
import { CandidateCertificates } from "../dashboard/candidate-certificates";

const CANDIDATE_SECTIONS: DashboardSection[] = [
  "overview", "profile", "cv", "documents", "jobs", "applications",
  "training", "exams", "certificates", "immigration", "messages",
  "notifications", "settings",
];

const RECRUITER_SECTIONS: RecruiterSection[] = [
  "overview", "company", "offers", "applications", "interviews", "settings",
];

const ADMIN_SECTIONS: AdminSection[] = [
  "overview", "users", "companies", "offers", "applications",
  "training", "immigration", "payments", "cms", "audit", "settings",
];

const ADMIN_LOT_MAP: Record<string, string> = {
  training: "LOT 6 — Formation en italien",
  immigration: "LOT 7 — Dossiers administratifs & immigration",
  payments: "LOT 8 — Paiements & notifications",
};

const TRAINER_SECTIONS: TrainerSection[] = [
  "overview", "courses", "lessons", "learners", "exams", "settings",
];

const CANDIDATE_LOT_MAP: Record<string, string> = {
  training: "LOT 6 — Formation en italien",
  exams: "LOT 6 — Formation en italien",
  certificates: "LOT 6 — Formation en italien",
  immigration: "LOT 7 — Dossiers administratifs & immigration",
  messages: "LOT 8 — Notifications & messagerie",
  notifications: "LOT 8 — Notifications & messagerie",
};

export function DashboardPage() {
  const { params, navigate } = useSiteRouter();
  const { user, loading } = useSession();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate("login");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // ── Candidate space (LOT 3) ──────────────────────────────────────────
  if (user.role === "Candidate") {
    const section = (params.get("section") as DashboardSection) || "overview";
    const validSection = CANDIDATE_SECTIONS.includes(section) ? section : "overview";

    const renderSection = () => {
      switch (validSection) {
        case "overview":
          return <CandidateOverview />;
        case "profile":
          return <CandidateProfile />;
        case "cv":
          return <CandidateCv />;
        case "documents":
          return <CandidateDocuments />;
        case "jobs":
          return <CandidateJobs />;
        case "applications":
          return <CandidateApplications />;
        case "training":
          return <CandidateMyTraining />;
        case "exams":
          return <CandidateExams />;
        case "certificates":
          return <CandidateCertificates />;
        case "settings":
          return <CandidateSettings />;
        default:
          return <ComingSoonCard lot={CANDIDATE_LOT_MAP[validSection] ?? "Un lot à venir"} />;
      }
    };

    return (
      <CandidateShell section={validSection}>{renderSection()}</CandidateShell>
    );
  }

  // ── Recruiter space (LOT 4) ──────────────────────────────────────────
  if (user.role === "Recruiter") {
    // Pending recruiters (company not yet validated) see a waiting screen.
    if (user.status === "Pending") {
      return <RecruiterPendingScreen />;
    }
    if (user.status !== "Active") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-navy">Compte indisponible</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Votre compte recruteur est actuellement {user.status === "Suspended" ? "suspendu" : "désactivé"}.
              Contactez l'administration COORIZON.
            </p>
          </div>
        </div>
      );
    }

    const section = (params.get("section") as RecruiterSection) || "overview";
    const validSection = RECRUITER_SECTIONS.includes(section) ? section : "overview";

    const renderSection = () => {
      switch (validSection) {
        case "overview":
          return <RecruiterOverview />;
        case "company":
          return <RecruiterCompany />;
        case "offers":
          return <RecruiterOffers />;
        case "applications":
          return <RecruiterApplications />;
        case "interviews":
          return <RecruiterInterviews />;
        case "settings":
          return <RecruiterSettings />;
        default:
          return <RecruiterOverview />;
      }
    };

    return (
      <RecruiterShell section={validSection}>{renderSection()}</RecruiterShell>
    );
  }

  // ── Admin / SuperAdmin space (LOT 5) ──────────────────────────────
  if (user.role === "Admin" || user.role === "SuperAdmin") {
    if (user.status !== "Active") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-navy">Compte indisponible</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Votre compte administrateur est actuellement {user.status === "Suspended" ? "suspendu" : "désactivé"}.
              Contactez un super administrateur.
            </p>
          </div>
        </div>
      );
    }

    const section = (params.get("section") as AdminSection) || "overview";
    const validSection = ADMIN_SECTIONS.includes(section) ? section : "overview";

    const renderSection = () => {
      switch (validSection) {
        case "overview":
          return <AdminOverview />;
        case "users":
          return <AdminUsers />;
        case "companies":
          return <AdminCompanies />;
        case "offers":
          return <AdminOffers />;
        case "applications":
          return <AdminApplications />;
        case "cms":
          return <AdminCms />;
        case "audit":
          return <AdminAudit />;
        case "settings":
          return <AdminSettings />;
        default:
          return <ComingSoonCard lot={ADMIN_LOT_MAP[validSection] ?? "Un lot à venir"} />;
      }
    };

    return (
      <AdminShell section={validSection}>{renderSection()}</AdminShell>
    );
  }

  // ── Trainer space (LOT 6) ──────────────────────────────────────────
  if (user.role === "Trainer") {
    if (user.status !== "Active") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-navy">Compte indisponible</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Votre compte formateur est actuellement {user.status === "Suspended" ? "suspendu" : "en attente"}.
              Contactez l'administration COORIZON.
            </p>
          </div>
        </div>
      );
    }

    const section = (params.get("section") as TrainerSection) || "overview";
    const validSection = TRAINER_SECTIONS.includes(section) ? section : "overview";

    const renderSection = () => {
      switch (validSection) {
        case "overview":
          return <TrainerOverview />;
        case "courses":
          return <TrainerCourses />;
        case "lessons":
          return <TrainerLessons />;
        case "learners":
          return <TrainerLearners />;
        case "exams":
          return <TrainerExams />;
        case "settings":
          return <TrainerSettings />;
        default:
          return <TrainerOverview />;
      }
    };

    return (
      <TrainerShell section={validSection}>{renderSection()}</TrainerShell>
    );
  }

  // ── Other roles (Agents) — placeholder until later lots
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-navy">Espace en préparation</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Votre espace ({user.role}) sera disponible dans un lot à venir. En attendant,
          vous pouvez consulter le site public.
        </p>
      </div>
    </div>
  );
}
