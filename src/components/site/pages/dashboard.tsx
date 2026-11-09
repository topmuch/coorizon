"use client";

import * as React from "react";
import {
  LogOut,
  ShieldCheck,
  User,
  Mail,
  Briefcase,
  GraduationCap,
  Building2,
  Plane,
  Settings,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSiteRouter } from "@/lib/site-router";
import { useSession } from "@/lib/auth/session-provider";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader } from "../sections/page-header";

export function DashboardPage() {
  const { navigate } = useSiteRouter();
  const { user, loading, signOut } = useSession();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate("login");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null; // redirecting to login
  }

  const initials = ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || user.email[0].toUpperCase();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const roleLabel = ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role;
  const isPending = user.status === "Pending";

  const roleIcon: Record<string, React.ElementType> = {
    Candidate: User,
    Recruiter: Briefcase,
    Trainer: GraduationCap,
    RecruitmentAgent: Plane,
    ImmigrationAgent: Plane,
    Admin: Settings,
    SuperAdmin: ShieldCheck,
  };
  const RoleIcon = roleIcon[user.role] ?? User;

  const handleSignOut = async () => {
    await signOut();
    navigate("home");
  };

  return (
    <>
      <PageHeader
        eyebrow="Espace personnel"
        title={`Bonjour, ${user.firstName ?? user.email.split("@")[0]} 👋`}
        description={
          isPending
            ? "Votre compte est en attente de validation par l'administration. Vous recevrez un email dès activation."
            : "Bienvenue dans votre espace COORIZON. Les modules spécifiques à votre rôle seront disponibles dans les prochains lots."
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Identity card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardDescription>Votre profil</CardDescription>
              <CardTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarFallback className="bg-brand/10 text-brand">{initials}</AvatarFallback>
                </Avatar>
                <span className="truncate text-lg">{fullName}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RoleIcon className="h-4 w-4 text-brand" />
                <span className="text-muted-foreground">Rôle :</span>
                <Badge variant="secondary" className="font-semibold">{roleLabel}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-brand-green" />
                <span className="text-muted-foreground">Statut :</span>
                <Badge variant={isPending ? "outline" : "secondary"} className={isPending ? "border-amber-400 text-amber-600" : "border-brand-green/30 text-brand-green"}>
                  {isPending ? "En attente" : "Actif"}
                </Badge>
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
              </Button>
            </CardContent>
          </Card>

          {/* Modules preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardDescription>Modules disponibles</CardDescription>
                <CardTitle>Votre espace {roleLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-6 py-10 text-center">
                    <Clock className="h-8 w-8 text-amber-500" />
                    <h3 className="mt-3 font-semibold text-navy">Compte en attente de validation</h3>
                    <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                      Conformément aux règles COORIZON, les comptes recruteurs sont validés par notre
                      administration avant de pouvoir publier des offres. Vous serez notifié dès activation.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {modulesForRole(user.role).map((m) => (
                      <div
                        key={m.title}
                        className="flex items-start gap-3 rounded-lg border border-border bg-surface/50 p-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                          <m.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-navy">{m.title}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{m.description}</div>
                          <Badge variant="outline" className="mt-2 text-[10px] font-normal text-muted-foreground">
                            {m.lot}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 rounded-lg border border-brand/20 bg-brand/5 p-4 text-sm text-muted-foreground">
                  <strong className="text-navy">LOT 2 — Authentification & rôles.</strong> Votre session est
                  désormais sécurisée et liée à votre rôle <strong>{roleLabel}</strong>. Les modules
                  opérationnels (offres, candidatures, formation, dossier administratif) arriveront dans les
                  lots 3 à 8.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function modulesForRole(role: string) {
  const common = [
    { title: "Mon profil", description: "Complétez vos informations personnelles.", icon: User, lot: "LOT 3" },
    { title: "Messagerie", description: "Échangez avec l'équipe COORIZON.", icon: Mail, lot: "LOT 3" },
  ];
  switch (role) {
    case "Candidate":
      return [
        ...common,
        { title: "Offres d'emploi", description: "Postulez aux offres italiennes.", icon: Briefcase, lot: "LOT 3" },
        { title: "Mes candidatures", description: "Suivez vos candidatures.", icon: Briefcase, lot: "LOT 3" },
        { title: "Mes formations", description: "Cours d'italien A1→C2.", icon: GraduationCap, lot: "LOT 6" },
        { title: "Mon dossier administratif", description: "Suivi immigration.", icon: Plane, lot: "LOT 7" },
      ];
    case "Recruiter":
      return [
        ...common,
        { title: "Profil entreprise", description: "Gérez votre société.", icon: Building2, lot: "LOT 4" },
        { title: "Publication d'offres", description: "Créez vos offres.", icon: Briefcase, lot: "LOT 4" },
        { title: "Candidatures reçues", description: "Présélectionnez les profils.", icon: User, lot: "LOT 4" },
        { title: "Entretiens", description: "Programmez les entretiens.", icon: Clock, lot: "LOT 4" },
      ];
    case "Trainer":
      return [
        ...common,
        { title: "Mes formations", description: "Gérez vos cours.", icon: GraduationCap, lot: "LOT 6" },
        { title: "Apprenants", description: "Suivez les progressions.", icon: User, lot: "LOT 6" },
        { title: "Examens", description: "Créez et corrigez.", icon: ShieldCheck, lot: "LOT 6" },
      ];
    case "RecruitmentAgent":
    case "ImmigrationAgent":
      return [
        ...common,
        { title: "Dossiers assignés", description: "Suivez vos candidats.", icon: User, lot: "LOT 7" },
        { title: "Checklist administrative", description: "Tâches & échéances.", icon: ShieldCheck, lot: "LOT 7" },
        { title: "Documents", description: "Validez les justificatifs.", icon: Building2, lot: "LOT 7" },
      ];
    case "Admin":
    case "SuperAdmin":
      return [
        ...common,
        { title: "Tableau de bord admin", description: "Statistiques globales.", icon: ShieldCheck, lot: "LOT 5" },
        { title: "Gestion candidats", description: "Liste & affectation.", icon: User, lot: "LOT 5" },
        { title: "Validation entreprises", description: "Validez les recruteurs.", icon: Building2, lot: "LOT 5" },
        { title: "Gestion formations", description: "Catalogue & examens.", icon: GraduationCap, lot: "LOT 5" },
      ];
    default:
      return common;
  }
}
