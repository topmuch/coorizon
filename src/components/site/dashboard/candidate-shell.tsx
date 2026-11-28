"use client";

import * as React from "react";
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Send,
  GraduationCap,
  ClipboardCheck,
  Award,
  Plane,
  CreditCard,
  MessageSquare,
  Bell,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteRouter } from "@/lib/site-router";
import { useSession } from "@/lib/auth/session-provider";
import { useCandidateAccess } from "@/lib/candidate-access";
import { formatAmount } from "@/lib/format-currency";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/permissions";
import { useUnreadNotificationsCount } from "@/hooks/use-unread-notifications";
import { Logo } from "../logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export type DashboardSection =
  | "overview"
  | "profile"
  | "documents"
  | "applications"
  | "training"
  | "exams"
  | "certificates"
  | "immigration"
  | "payments"
  | "messages"
  | "notifications"
  | "settings"
  | "forfait";

export interface NavSection {
  id: DashboardSection;
  label: string;
  icon: LucideIcon;
  lot?: string;
}

export const candidateNav: NavSection[] = [
  { id: "overview", label: "Mon tableau de bord", icon: LayoutDashboard },
  { id: "profile", label: "Mon profil", icon: User },
  { id: "documents", label: "Mes documents", icon: FolderOpen },
  { id: "applications", label: "Mes candidatures", icon: Send },
  { id: "training", label: "Formation", icon: GraduationCap },
  { id: "exams", label: "Mes examens", icon: ClipboardCheck },
  { id: "certificates", label: "Mes certificats", icon: Award },
  { id: "immigration", label: "Mon dossier administratif", icon: Plane },
  { id: "payments", label: "Mes paiements", icon: CreditCard },
  { id: "messages", label: "Messagerie", icon: MessageSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Paramètres", icon: Settings },
];

/**
 * The dedicated "Forfait" tab: always first in the restricted navigation so
 * the purchase action stands out for candidates without full access.
 */
const FORFAIT_NAV: NavSection = { id: "forfait", label: "Forfait", icon: ShoppingCart };

/**
 * Sections accessible to a candidate whose formation forfait has not been
 * bought/validated yet — profile, CV, messaging, notifications, settings,
 * plus the "Forfait" purchase tab. Every other module stays hidden until the
 * administration validates the payment.
 */
export const UNPAID_ALLOWED_SECTIONS: DashboardSection[] = [
  "forfait",
  "profile",
  "messages",
  "notifications",
  "settings",
];

const restrictedNav: NavSection[] = [
  FORFAIT_NAV,
  ...candidateNav.filter((item) =>
    UNPAID_ALLOWED_SECTIONS.includes(item.id)
  ),
];

interface CandidateShellProps {
  section: DashboardSection;
  children: React.ReactNode;
}

export function CandidateShell({ section, children }: CandidateShellProps) {
  const { navigate } = useSiteRouter();
  const { user, signOut } = useSession();
  const { theme, setTheme } = useTheme();
  const { access } = useCandidateAccess();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Candidates without the validated formation forfait see a reduced
  // navigation: profile, CV, messaging, notifications, settings and the
  // Forfait tab. All other modules are hidden until the payment is validated.
  const hasFullAccess = access?.hasFormationAccess ?? true;
  const navItems = hasFullAccess ? candidateNav : restrictedNav;

  // Visual notification: unread count polled so the « Notifications » menu
  // item lights up as soon as a new notification arrives.
  const unreadNotifications = useUnreadNotificationsCount({ refreshKey: section });

  const initials = user
    ? ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || user.email[0].toUpperCase()
    : "";

  const go = (s: DashboardSection) => {
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
            <div className="truncate text-sm font-semibold text-foreground">
              {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : ""}
            </div>
            <Badge variant="secondary" className="mt-0.5 text-[10px] font-normal">
              {user ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role : ""}
            </Badge>
          </div>
        </div>
        {!hasFullAccess && (
          <Badge
            className="mt-2 w-fit border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
            variant="outline"
          >
            Accès limité — forfait requis
          </Badge>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = section === item.id;
            const isForfaitItem = item.id === "forfait" && !hasFullAccess;
            return (
              <li key={item.id}>
                <button
                  onClick={() => go(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isForfaitItem &&
                      !active &&
                      "border border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isForfaitItem && !active && "text-amber-600 dark:text-amber-400")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.id === "notifications" && unreadNotifications > 0 && (
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                        active
                          ? "bg-primary-foreground text-primary"
                          : "bg-italian-red text-white"
                      )}
                      title={`${unreadNotifications} notification${unreadNotifications > 1 ? "s" : ""} non lue${unreadNotifications > 1 ? "s" : ""}`}
                    >
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                  {item.lot && !active && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {item.lot}
                    </span>
                  )}
                  {isForfaitItem && access && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                      )}
                    >
                      {formatAmount(access.forfait.amount, access.forfait.currency)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-3">
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

  const activeItem = navItems.find((n) => n.id === section) ?? candidateNav.find((n) => n.id === section);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b px-5">
          <button onClick={() => navigate("home")} aria-label="Accueil COORIZON">
            <Logo size="sm" />
          </button>
        </div>
        {SidebarContent}
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <button onClick={() => navigate("home")} aria-label="Accueil COORIZON">
          <Logo size="sm" />
        </button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu" className="relative">
              <Menu className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-italian-red"
                  aria-hidden
                />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Menu candidat</SheetTitle>
            <div className="flex h-16 items-center border-b px-5">
              <Logo size="sm" />
            </div>
            {SidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Espace candidat</span>
            <span>/</span>
            <span className="font-medium text-navy dark:text-foreground">{activeItem?.label}</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
