"use client";

import * as React from "react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users,
  ClipboardCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteRouter } from "@/lib/site-router";
import { useSession } from "@/lib/auth/session-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/permissions";
import { Logo } from "../logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, LogOut } from "lucide-react";

export type TrainerSection =
  | "overview"
  | "courses"
  | "lessons"
  | "learners"
  | "exams"
  | "settings";

export interface TrainerNavSection {
  id: TrainerSection;
  label: string;
  icon: LucideIcon;
}

export const trainerNav: TrainerNavSection[] = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "courses", label: "Mes formations", icon: GraduationCap },
  { id: "lessons", label: "Leçons & contenu", icon: BookOpen },
  { id: "learners", label: "Apprenants", icon: Users },
  { id: "exams", label: "Examens & résultats", icon: ClipboardCheck },
  { id: "settings", label: "Paramètres", icon: Settings },
];

interface TrainerShellProps {
  section: TrainerSection;
  children: React.ReactNode;
}

export function TrainerShell({ section, children }: TrainerShellProps) {
  const { navigate } = useSiteRouter();
  const { user, signOut } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const initials = user
    ? ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || user.email[0].toUpperCase()
    : "";

  const go = (s: TrainerSection) => {
    setMobileOpen(false);
    navigate("dashboard", { section: s });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("home");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-brand/10 text-brand">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-navy">
              {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : ""}
            </div>
            <Badge variant="secondary" className="mt-0.5 text-[10px] font-normal">
              {user ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role : ""}
            </Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <ul className="space-y-0.5">
          {trainerNav.map((item) => {
            const active = section === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => go(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-brand text-white"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-3">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );

  const activeItem = trainerNav.find((n) => n.id === section);

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b px-5">
          <button onClick={() => navigate("home")} aria-label="Accueil COORIZON" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Formateur</span>
          </button>
        </div>
        {SidebarContent}
      </aside>

      <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <button onClick={() => navigate("home")} aria-label="Accueil COORIZON" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Formateur</span>
        </button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Menu formateur</SheetTitle>
            <div className="flex h-16 items-center border-b px-5">
              <Logo size="sm" />
            </div>
            {SidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Espace formateur</span>
            <span>/</span>
            <span className="font-medium text-navy">{activeItem?.label}</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
