"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, ChevronDown, Briefcase, GraduationCap, Plane, Building2, CircleHelp, Info, Mail } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useSiteRouter, type SiteRoute } from "@/lib/site-router";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  route: SiteRoute;
  icon: React.ElementType;
  description?: string;
}

const mainNav: NavItem[] = [
  { label: "Nos offres d'emploi", route: "jobs", icon: Briefcase, description: "Postes disponibles auprès d'entreprises italiennes partenaires." },
  { label: "Formation en italien", route: "training", icon: GraduationCap, description: "Parcours A1 à C2 avec examens et attestations." },
  { label: "Travailler en Italie", route: "work-in-italy", icon: Plane, description: "Tout savoir sur l'emploi et la mobilité en Italie." },
  { label: "Nos entreprises", route: "partners", icon: Building2, description: "Découvrez les entreprises qui recrutent." },
  { label: "Comment ça marche", route: "how-it-works", icon: CircleHelp, description: "Le parcours candidat étape par étape." },
  { label: "À propos", route: "about", icon: Info, description: "La mission et l'équipe COORIZON." },
  { label: "FAQ", route: "faq", icon: CircleHelp, description: "Questions fréquentes." },
  { label: "Contact", route: "contact", icon: Mail, description: "Écrivez à notre équipe." },
];

export function SiteHeader() {
  const { route, navigate } = useSiteRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleNav = (r: SiteRoute) => {
    setMobileOpen(false);
    navigate(r);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => handleNav("home")}
          className="flex items-center transition-opacity hover:opacity-80"
          aria-label="Accueil COORIZON"
        >
          <Logo />
        </button>

        {/* Desktop nav */}
        <NavigationMenu className="hidden xl:flex max-w-none">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(route === "jobs" && "text-brand")}
                onClick={() => handleNav("jobs")}
              >
                Emplois
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavCard item={mainNav[0]} onNavigate={handleNav} />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(route === "training" && "text-brand")}
                onClick={() => handleNav("training")}
              >
                Formation
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavCard item={mainNav[1]} onNavigate={handleNav} />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), route === "work-in-italy" && "text-brand")}
                onClick={() => handleNav("work-in-italy")}
              >
                Travailler en Italie
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), route === "partners" && "text-brand")}
                onClick={() => handleNav("partners")}
              >
                Entreprises
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), route === "how-it-works" && "text-brand")}
                onClick={() => handleNav("how-it-works")}
              >
                Comment ça marche
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), route === "about" && "text-brand")}
                onClick={() => handleNav("about")}
              >
                À propos
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), route === "faq" && "text-brand")}
                onClick={() => handleNav("faq")}
              >
                FAQ
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), route === "contact" && "text-brand")}
                onClick={() => handleNav("contact")}
              >
                Contact
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center gap-2 xl:flex">
          <Button variant="ghost" onClick={() => handleNav("login")}>
            Connexion
          </Button>
          <Button onClick={() => handleNav("register-candidate")} className="bg-brand hover:bg-brand/90">
            Je suis candidat
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="xl:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px]">
              <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b pb-4">
                  <Logo size="sm" />
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Fermer">
                      <ChevronDown className="h-5 w-5 rotate-180" />
                    </Button>
                  </SheetClose>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                  <ul className="space-y-1">
                    {mainNav.map((item) => (
                      <li key={item.route}>
                        <button
                          onClick={() => handleNav(item.route)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent",
                            route === item.route && "bg-accent text-brand"
                          )}
                        >
                          <item.icon className="h-4 w-4 text-brand" />
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="space-y-2 border-t pt-4">
                  <Button variant="outline" className="w-full" onClick={() => handleNav("login")}>
                    Connexion
                  </Button>
                  <Button className="w-full bg-brand hover:bg-brand/90" onClick={() => handleNav("register-candidate")}>
                    Je suis candidat
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => handleNav("register-recruiter")}>
                    Je suis recruteur
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function NavCard({ item, onNavigate }: { item: NavItem; onNavigate: (r: SiteRoute) => void }) {
  return (
    <button
      onClick={() => onNavigate(item.route)}
      className="flex w-[260px] items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
        <item.icon className="h-4 w-4" />
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-semibold text-foreground">{item.label}</div>
        {item.description && (
          <div className="text-xs leading-relaxed text-muted-foreground">{item.description}</div>
        )}
      </div>
    </button>
  );
}
