"use client";

import * as React from "react";
import { MessageCircle, X, ChevronRight, Headphones, CreditCard, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppNumber {
  service: string;
  number: string;
  label: string;
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "Service Client": Headphones,
  "Facturation": CreditCard,
  "Formation": GraduationCap,
};

const PRESET_MESSAGES: Record<string, string> = {
  "Service Client": "Bonjour, j'ai une question concernant COORIZON.",
  "Facturation": "Bonjour, j'ai une question concernant la facturation.",
  "Formation": "Bonjour, je souhaite des informations sur les formations en italien.",
};

export function WhatsAppWidget() {
  const [open, setOpen] = React.useState(false);
  const [numbers, setNumbers] = React.useState<WhatsAppNumber[]>([
    { service: "Service Client", number: "221710907070", label: "Service Client" },
    { service: "Facturation", number: "221710907071", label: "Facturation" },
    { service: "Formation", number: "221710907072", label: "Formation" },
  ]);

  React.useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((d) => { if (d.numbers) setNumbers(d.numbers); })
      .catch(() => {});
  }, []);

  const handleClick = (num: WhatsAppNumber) => {
    const msg = PRESET_MESSAGES[num.service] || "Bonjour, je vous contacte depuis COORIZON.";
    const url = `https://wa.me/${num.number}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
        aria-label="Contactez-nous sur WhatsApp"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-[#25D366]" />
          </span>
        )}
      </button>

      {/* Popup menu */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 bg-[#25D366] px-4 py-3">
            <MessageCircle className="h-6 w-6 text-white" />
            <div>
              <div className="text-sm font-bold text-white">COORIZON</div>
              <div className="text-xs text-white/80">Choisissez un service</div>
            </div>
          </div>

          {/* Service options */}
          <div className="divide-y">
            {numbers.map((num) => {
              const Icon = SERVICE_ICONS[num.service] || Headphones;
              return (
                <button
                  key={num.service}
                  onClick={() => handleClick(num)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
                    <Icon className="h-4 w-4 text-[#25D366]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{num.label}</div>
                    <div className="text-xs text-muted-foreground">+{num.number}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
            Réponse sous 24h ouvrées
          </div>
        </div>
      )}
    </>
  );
}
