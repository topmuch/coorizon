"use client";

import * as React from "react";
import { Mail, Phone, MapPin, Linkedin, Facebook, Instagram, Send } from "lucide-react";
import { Logo } from "./logo";
import { useSiteRouter, type SiteRoute } from "@/lib/site-router";

interface FooterLink {
  label: string;
  route: SiteRoute;
}

const candidateLinks: FooterLink[] = [
  { label: "Formation en italien", route: "training" },
  { label: "Travailler en Italie", route: "work-in-italy" },
  { label: "Comment ça marche", route: "how-it-works" },
  { label: "Inscription candidat", route: "register-candidate" },
];

const companyLinks: FooterLink[] = [
  { label: "Inscription entreprise", route: "register-recruiter" },
  { label: "À propos", route: "about" },
  { label: "FAQ", route: "faq" },
  { label: "Contact", route: "contact" },
];

export function SiteFooter() {
  const { navigate } = useSiteRouter();

  return (
    <footer className="mt-auto border-t border-white/10 bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
              COORIZON est une plateforme de recrutement international, de formation en langue italienne et
              d'accompagnement à l'immigration professionnelle vers l'Italie, dédiée aux talents du Sénégal
              et d'Afrique de l'Ouest.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <SocialIcon href="#" label="LinkedIn"><Linkedin className="h-4 w-4" /></SocialIcon>
              <SocialIcon href="#" label="Facebook"><Facebook className="h-4 w-4" /></SocialIcon>
              <SocialIcon href="#" label="Instagram"><Instagram className="h-4 w-4" /></SocialIcon>
              <SocialIcon href="#" label="Telegram"><Send className="h-4 w-4" /></SocialIcon>
            </div>
          </div>

          {/* Candidates */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Candidats</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {candidateLinks.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => navigate(l.route)}
                    className="text-white/80 transition-colors hover:text-white"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Companies */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Entreprises</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => navigate(l.route)}
                    className="text-white/80 transition-colors hover:text-white"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                <span className="text-white/80">Sicap Liberté 4 N°5260, Dakar — Sénégal</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                <span className="text-white/80">+221 71 090 70 70</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                <span className="text-white/80">contact@coorizon.com</span>
              </li>
            </ul>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/80">
                Besoin d'aide ? Notre équipe vous répond sous 24h ouvrées.
              </p>
              <button
                onClick={() => navigate("contact")}
                className="mt-2 text-sm font-semibold text-white underline-offset-4 hover:underline"
              >
                Écrire à l'équipe →
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white md:flex-row">
          <p>© {new Date().getFullYear()} COORIZON. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              onClick={() => navigate("mentions-legales")}
              className="underline-offset-4 transition-colors hover:text-brand-green hover:underline"
            >
              Mentions légales
            </button>
            <button
              onClick={() => navigate("politique-confidentialite")}
              className="underline-offset-4 transition-colors hover:text-brand-green hover:underline"
            >
              Politique de confidentialité
            </button>
            <button
              onClick={() => navigate("conditions-generales")}
              className="underline-offset-4 transition-colors hover:text-brand-green hover:underline"
            >
              Conditions générales
            </button>
            <button
              onClick={() => navigate("cookies")}
              className="underline-offset-4 transition-colors hover:text-brand-green hover:underline"
            >
              Cookies
            </button>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-white">
          COORIZON est une plateforme d'accompagnement. Aucune offre d'emploi, attestation ou visa n'est garanti.
          Les décisions de recrutement relèvent des entreprises ; les décisions administratives relèvent des
          autorités compétentes. Les attestations de formation sont internes et ne constituent pas des
          certifications officielles.
        </p>
      </div>
    </footer>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-brand-green hover:bg-brand-green hover:text-white"
    >
      {children}
    </a>
  );
}
