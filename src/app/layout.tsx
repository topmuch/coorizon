import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/lib/auth/session-provider";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "COORIZON — Recrutement international, formation en italien & accompagnement",
  description:
    "COORIZON vous accompagne dans votre projet professionnel en Italie : formation linguistique en italien, recrutement international et accompagnement personnalisé. Candidats, entreprises et partenaires d'Afrique de l'Ouest.",
  keywords: [
    "COORIZON",
    "recrutement international",
    "travail en Italie",
    "formation italien",
    "immigration Italie",
    "emploi Italie",
    "Sénégal",
    "Afrique de l'Ouest",
  ],
  authors: [{ name: "COORIZON" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "COORIZON — Votre avenir professionnel commence ici",
    description:
      "Recrutement international, formation en italien et accompagnement à l'immigration vers l'Italie.",
    siteName: "COORIZON",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${display.variable} ${inter.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
