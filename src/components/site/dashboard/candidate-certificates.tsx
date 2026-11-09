"use client";

import * as React from "react";
import {
  Award,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  GraduationCap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSiteRouter } from "@/lib/site-router";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────

type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface CertCourse {
  id: string;
  title: string;
  level: CourseLevel;
}

interface Certificate {
  id: string;
  candidateId: string;
  courseId: string;
  certificateNumber: string;
  fullName: string;
  courseName: string;
  level: CourseLevel;
  score: number;
  issueDate: string;
  qrCodeUrl: string | null;
  isRevoked: boolean;
  createdAt: string;
  course?: CertCourse;
}

interface CertificatesResponse {
  certificates: Certificate[];
}

// ─── Level badge styling ─────────────────────────────────────────────────

interface LevelMeta {
  label: string;
  className: string;
}

const LEVEL_META: Record<CourseLevel, LevelMeta> = {
  A1: {
    label: "A1 — Débutant",
    className: "border-transparent bg-emerald-100 text-emerald-800",
  },
  A2: {
    label: "A2 — Élémentaire",
    className: "border-transparent bg-teal-100 text-teal-800",
  },
  B1: {
    label: "B1 — Intermédiaire",
    className: "border-transparent bg-brand-green/15 text-brand-green",
  },
  B2: {
    label: "B2 — Avancé",
    className: "border-transparent bg-amber-100 text-amber-800",
  },
  C1: {
    label: "C1 — Autonome",
    className: "border-transparent bg-orange-100 text-orange-800",
  },
  C2: {
    label: "C2 — Maîtrise",
    className: "border-transparent bg-italian-red/10 text-italian-red",
  },
};

function levelMeta(level: CourseLevel): LevelMeta {
  return LEVEL_META[level] ?? {
    label: level,
    className: "border-transparent bg-muted text-muted-foreground",
  };
}

// ─── Date formatting ─────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "—";
  }
}

// ─── Component ───────────────────────────────────────────────────────────

export function CandidateCertificates() {
  const { toast } = useToast();
  const { navigate } = useSiteRouter();

  const [certificates, setCertificates] = React.useState<Certificate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [printingId, setPrintingId] = React.useState<string | null>(null);

  // ── Load certificates on mount ─────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/certificates", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Impossible de charger vos certificats.");
      }
      const data = (await res.json()) as CertificatesResponse;
      setCertificates(data.certificates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Print handling ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!printingId) return;

    const onAfterPrint = () => setPrintingId(null);
    window.addEventListener("afterprint", onAfterPrint);

    // Allow the DOM to apply the data-print-root attribute before opening
    // the print dialog.
    const timer = window.setTimeout(() => {
      window.print();
    }, 80);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [printingId]);

  const handlePrint = (certId: string) => {
    setPrintingId(certId);
  };

  const handleDownload = (cert: Certificate) => {
    // LOT 6 — print-to-PDF is the supported path. We surface the same flow
    // as the print button but with a distinct toast so the user understands
    // they should choose "Enregistrer au format PDF" in the dialog.
    toast({
      title: "Téléchargement PDF",
      description:
        "Choisissez « Enregistrer au format PDF » dans la boîte d'impression pour télécharger votre attestation.",
    });
    setPrintingId(cert.id);
  };

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-6">
          <Skeleton className="h-[420px] w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print stylesheet — only the active certificate is visible on paper */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          [data-print-root="true"], [data-print-root="true"] * {
            visibility: visible !important;
          }
          [data-print-root="true"] {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          [data-no-print] { display: none !important; }
        }
      `}</style>

      {/* Page header */}
      <header className="space-y-1.5" data-no-print>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-navy">
          <Award className="h-6 w-6 text-brand" aria-hidden />
          Mes attestations
        </h1>
        <p className="text-sm text-muted-foreground">
          Vos attestations de réussite sont générées automatiquement après la
          réussite d&rsquo;un examen. Elles peuvent être imprimées et vérifiées
          par un tiers via le QR code.
        </p>
      </header>

      {/* Empty state */}
      {certificates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Award className="h-8 w-8 text-muted-foreground" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-lg text-navy">
                Aucun certificat pour le moment
              </CardTitle>
              <CardDescription className="max-w-md">
                Les attestations sont délivrées automatiquement dès que vous
                réussissez l&rsquo;examen final d&rsquo;une formation. Passez
                et réussissez un examen pour obtenir votre première attestation.
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate("dashboard", { section: "exams" })}
              className="mt-2"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Accéder à mes examens
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Certificates list */}
          <div className="grid gap-6">
            {certificates.map((cert) => (
              <CertificateCard
                key={cert.id}
                certificate={cert}
                onPrint={() => handlePrint(cert.id)}
                onDownload={() => handleDownload(cert)}
                isPrinting={printingId === cert.id}
              />
            ))}
          </div>

          {/* Disclaimer */}
          <Alert
            className="border-amber-200 bg-amber-50 text-amber-900"
            data-no-print
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">
              Attestations internes — non officielles
            </AlertTitle>
            <AlertDescription className="text-amber-800">
              <p>
                ⚠️ Ces attestations sont internes à COORIZON. Elles ne
                constituent pas des certifications officielles reconnues par les
                institutions (comme le CILS, CELI ou PLIDA). Elles attestent du
                suivi et de la réussite des parcours de la plateforme.
              </p>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}

// ─── Certificate card (diploma style) ────────────────────────────────────

interface CertificateCardProps {
  certificate: Certificate;
  onPrint: () => void;
  onDownload: () => void;
  isPrinting: boolean;
}

function CertificateCard({
  certificate,
  onPrint,
  onDownload,
  isPrinting,
}: CertificateCardProps) {
  const lvl = levelMeta(certificate.level);
  const courseLevel = certificate.course?.level ?? certificate.level;
  const courseLevelMeta = levelMeta(courseLevel);

  return (
    <Card
      data-print-root={isPrinting ? "true" : undefined}
      className={cn(
        "relative overflow-hidden border-2 border-brand/20 shadow-md",
        "bg-gradient-to-br from-white via-white to-brand/[0.03]"
      )}
    >
      {/* Decorative top & bottom bands */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-green via-brand to-navy"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-navy via-brand to-brand-green"
      />

      {/* Subtle guilloché-like pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #17365d 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      <CardHeader className="relative z-10 items-center text-center">
        <div className="flex items-center gap-2 text-brand">
          <GraduationCap className="h-5 w-5" aria-hidden />
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-navy">
            COORIZON
          </span>
        </div>
        <CardTitle className="mt-1 text-xl font-bold uppercase tracking-wide text-navy sm:text-2xl">
          Attestation de réussite
        </CardTitle>
        <CardDescription className="text-xs uppercase tracking-widest text-muted-foreground">
          Formation en langue italienne
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-5">
        <Separator className="bg-brand/20" />

        {/* Body text */}
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            Cette attestation certifie que
          </p>
          <p className="text-xl font-bold text-navy sm:text-2xl">
            {certificate.fullName}
          </p>
          <p className="text-sm text-muted-foreground">
            a suivi et réussi la formation
          </p>
          <p className="text-lg font-semibold text-foreground sm:text-xl">
            {certificate.courseName}
          </p>
          <p className="text-sm text-muted-foreground">
            avec un score de{" "}
            <span className="font-bold text-brand-green">
              {certificate.score} %
            </span>
          </p>
        </div>

        {/* Level + verification badge */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge className={cn("px-3 py-1 text-xs", lvl.className)}>
            Niveau {certificate.level}
          </Badge>
          {certificate.course && (
            <Badge
              variant="outline"
              className={cn("px-3 py-1 text-xs", courseLevelMeta.className)}
            >
              {courseLevelMeta.label}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="gap-1 px-3 py-1 text-xs text-brand-green"
          >
            <CheckCircle2 className="h-3 w-3" />
            Examen réussi
          </Badge>
        </div>

        <Separator className="bg-brand/20" />

        {/* Footer: metadata + QR */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Délivré le
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatDate(certificate.issueDate)}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                N° attestation
              </span>
              <span className="font-mono text-sm font-semibold text-navy">
                {certificate.certificateNumber}
              </span>
            </div>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-1">
            {certificate.qrCodeUrl ? (
              <img
                src={certificate.qrCodeUrl}
                alt="QR code de vérification de l'attestation"
                width={96}
                height={96}
                className="rounded-md border border-border bg-white p-1"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border border-border bg-muted">
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              Vérifiable
            </span>
          </div>
        </div>

        {/* Internal notice (printed on the document itself) */}
        <p className="border-t border-dashed border-border pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          Cette attestation est interne à COORIZON et ne constitue pas une
          certification officielle reconnue par les institutions.
        </p>

        {/* Actions — hidden when printing */}
        <div
          data-no-print
          className="flex flex-wrap items-center justify-center gap-2 pt-2"
        >
          <Button onClick={onPrint} variant="default" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          <Button onClick={onDownload} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
