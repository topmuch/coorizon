"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Send,
  GraduationCap,
  Plane,
  CreditCard,
  FileText,
  ScrollText,
  Settings,
  ShieldCheck,
  Zap,
  Bot,
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
import { Menu, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export type AdminSection =
  | "overview"
  | "users"
  | "companies"
  | "offers"
  | "applications"
  | "training"
  | "immigration"
  | "payments"
  | "cms"
  | "audit"
  | "automation"
  | "ai"
  | "settings";

export interface AdminNavSection {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  lot?: string;
}

export const adminNav: AdminNavSection[] = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "companies", label: "Entreprises", icon: Building2 },
  { id: "offers", label: "Offres d'emploi", icon: Briefcase },
  { id: "applications", label: "Candidatures", icon: Send },
  { id: "training", label: "Formations", icon: GraduationCap, lot: "LOT 6" },
  { id: "immigration", label: "Immigration", icon: Plane, lot: "LOT 7" },
  { id: "payments", label: "Commercial", icon: CreditCard, lot: "LOT 8" },
  { id: "cms", label: "Contenu (CMS)", icon: FileText },
  { id: "audit", label: "Journaux d'audit", icon: ScrollText },
  { id: "automation", label: "Automatisations", icon: Zap },
  { id: "ai", label: "Assistant IA", icon: Bot },
  { id: "settings", label: "Paramètres", icon: Settings },
];

interface AdminShellProps {
  section: AdminSection;
  children: React.ReactNode;
}

export function AdminShell({ section, children }: AdminShellProps) {
  const { navigate } = useSiteRouter();
  const { user, signOut } = useSession();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const initials = user
    ? ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || user.email[0].toUpperCase()
    : "";

  const go = (s: AdminSection) => {
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
            <AvatarFallback className="bg-navy/10 text-navy">{initials}</AvatarFallback>
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
          {adminNav.map((item) => {
            const active = section === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => go(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-navy text-white"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.lot && !active && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {item.lot}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {theme === "dark" ? "Mode clair" : "Mode sombre"}
        </Button>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );

  const activeItem = adminNav.find((n) => n.id === section);

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b px-5">
          <button onClick={() => navigate("home")} aria-label="Accueil COORIZON" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="rounded bg-navy px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Admin</span>
          </button>
        </div>
        {SidebarContent}
      </aside>

      <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <button onClick={() => navigate("home")} aria-label="Accueil COORIZON" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="rounded bg-navy px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Admin</span>
        </button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Menu administrateur</SheetTitle>
            <div className="flex h-16 items-center border-b px-5">
              <Logo size="sm" />
            </div>
            {SidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-navy" />
            <span>Back-office</span>
            <span>/</span>
            <span className="font-medium text-navy">{activeItem?.label}</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
