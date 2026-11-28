"use client";

import * as React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Send,
  Search,
  Eye,
  Users,
  Building2,
  Calendar,
  Mail,
  Briefcase,
  MapPin,
  FileText,
  MessageSquare,
  XCircle,
  AlertCircle,
  Inbox,
  Plus,
  ArrowRight,
  Download,
  Home,
  Phone,
  GraduationCap,
  Plane,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// ─── Types ─────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | "Submitted"
  | "Preselected"
  | "Interview"
  | "Offered"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";

interface CandidateProfileSummary {
  desiredJob: string | null;
  sector: string | null;
  city: string | null;
  profession: string | null;
  department: string | null;
  preferredItalianRegion: string | null;
  educationLevel: string | null;
  italianLevel: string | null;
}

interface CandidateSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  candidateProfile: CandidateProfileSummary | null;
}

interface CompanySummary {
  id: string;
  legalName: string;
}

interface JobOfferSummary {
  id: string;
  title: string;
  city: string | null;
  company: CompanySummary;
}

interface ApplicationListItem {
  id: string;
  candidateId: string;
  jobOfferId: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  recruiterNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: CandidateSummary;
  jobOffer: JobOfferSummary;
}

interface ApplicationsListResponse {
  applications: ApplicationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Status metadata ───────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  className: string;
  dotClassName: string;
}

function getStatusMeta(status: ApplicationStatus): StatusMeta {
  switch (status) {
    case "Submitted":
      return {
        label: "Candidature envoyée",
        className: "bg-blue-50 text-blue-700 border border-blue-200",
        dotClassName: "bg-blue-500",
      };
    case "Preselected":
      return {
        label: "Présélectionné",
        className: "bg-amber-50 text-amber-800 border border-amber-200",
        dotClassName: "bg-amber-500",
      };
    case "Interview":
      return {
        label: "Entretien",
        className: "bg-brand text-white border border-brand",
        dotClassName: "bg-white",
      };
    case "Offered":
      return {
        label: "Proposition",
        className: "bg-brand-green/15 text-brand-green border border-brand-green/30",
        dotClassName: "bg-brand-green",
      };
    case "Accepted":
      return {
        label: "Acceptée",
        className: "bg-brand-green text-white border border-brand-green",
        dotClassName: "bg-white",
      };
    case "Rejected":
      return {
        label: "Refusée",
        className: "bg-italian-red/10 text-italian-red border border-italian-red/30",
        dotClassName: "bg-italian-red",
      };
    case "Withdrawn":
      return {
        label: "Retirée",
        className: "bg-muted text-muted-foreground border border-border",
        dotClassName: "bg-muted-foreground",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground border border-border",
        dotClassName: "bg-muted-foreground",
      };
  }
}

// ─── Date helpers ──────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function fullNameOf(c: { firstName: string | null; lastName: string | null }): string {
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Candidat";
}

/** jsPDF standard fonts use WinAnsi: replace unsupported glyphs (→, –, ’). */
function pdfSafe(value: string | null | undefined): string {
  if (value == null) return "";
  return value
    .replaceAll("\u2192", "->")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2019", "'")
    .replaceAll("\u00A0", " ");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "candidat";
}

// ─── Constants ─────────────────────────────────────────────────────────────

import { SENEGAL_REGIONS } from "@/lib/senegal-data";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "Submitted", label: "Candidature envoyée" },
  { value: "Preselected", label: "Présélectionné" },
  { value: "Interview", label: "Entretien" },
  { value: "Offered", label: "Proposition" },
  { value: "Accepted", label: "Acceptée" },
  { value: "Rejected", label: "Refusée" },
  { value: "Withdrawn", label: "Retirée" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminApplications() {
  const [applications, setApplications] = React.useState<ApplicationListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<"all" | ApplicationStatus>("all");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");

  // Details dialog
  const [detailApp, setDetailApp] = React.useState<ApplicationListItem | null>(null);

  // PDF export state
  const [exporting, setExporting] = React.useState(false);

  // Add application dialog
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch list
  const fetchApplications = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (departmentFilter !== "all") qs.set("department", departmentFilter);
      if (appliedSearch.trim()) qs.set("q", appliedSearch.trim());
      qs.set("page", String(page));
      qs.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/applications?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des candidatures.");
      }
      const data = (await res.json()) as ApplicationsListResponse;
      setApplications(data.applications);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter, appliedSearch, page]);

  React.useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Reset to page 1 whenever filters change.
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, departmentFilter, appliedSearch]);

  const applySearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch();
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setDepartmentFilter("all");
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter !== "all" || departmentFilter !== "all" || appliedSearch.trim().length > 0;

  // ─── PDF export: full dossier of one candidature ─────────────────────
  const exportDossierPdf = (app: ApplicationListItem) => {
    const c = app.candidate;
    const p = c.candidateProfile;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(20, 90, 50);
    doc.text("COORIZON", 40, 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text("Dossier de candidature", 40, 70);
    doc.setDrawColor(20, 90, 50);
    doc.setLineWidth(1);
    doc.line(40, 80, pageWidth - 40, 80);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(pdfSafe(`${fullNameOf(c)} - ${app.jobOffer.title}`), 40, 102);

    autoTable(doc, {
      startY: 118,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [20, 90, 50], textColor: 255 },
      head: [["Informations du candidat", ""]],
      body: [
        ["Nom complet", fullNameOf(c)],
        ["Email", c.email],
        ["Telephone", c.phone ?? "-"],
        ["Centre de formation", p?.department ? `Centre de ${p.department}` : "-"],
        ["Profession", p?.profession ?? "-"],
        ["Poste recherche", p?.desiredJob ?? "-"],
        ["Secteur", p?.sector ?? "-"],
        ["Ville", p?.city ?? "-"],
        ["Niveau d'etudes", pdfSafe(p?.educationLevel) ?? "-"],
        ["Niveau d'italien", p?.italianLevel ?? "-"],
        ["Region italienne souhaitee", p?.preferredItalianRegion ?? "-"],
      ],
      theme: "grid",
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 180 } },
    });

    type WithLastAutoTable = { lastAutoTable?: { finalY: number } };
    let y = ((doc as unknown as WithLastAutoTable).lastAutoTable?.finalY ?? 300) + 28;

    autoTable(doc, {
      startY: y,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [40, 60, 90], textColor: 255 },
      head: [["Candidature", ""]],
      body: [
        ["Offre", pdfSafe(app.jobOffer.title)],
        ["Entreprise", pdfSafe(app.jobOffer.company.legalName)],
        ["Ville de l'offre", app.jobOffer.city ?? "-"],
        ["Statut", pdfSafe(getStatusMeta(app.status).label)],
        ["Envoyee le", formatDateTimeFr(app.createdAt)],
        ["Derniere mise a jour", formatDateTimeFr(app.updatedAt)],
      ],
      theme: "grid",
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 180 } },
    });

    y = ((doc as unknown as WithLastAutoTable).lastAutoTable?.finalY ?? y) + 28;

    if (app.coverLetter) {
      autoTable(doc, {
        startY: y,
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [120, 120, 120], textColor: 255 },
        head: [["Lettre de motivation"]],
        body: [[pdfSafe(app.coverLetter)]],
        theme: "grid",
      });
      y = ((doc as unknown as WithLastAutoTable).lastAutoTable?.finalY ?? y) + 20;
    }

    if (app.recruiterNote) {
      autoTable(doc, {
        startY: y,
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [180, 140, 40], textColor: 255 },
        head: [["Note de l'entreprise"]],
        body: [[pdfSafe(app.recruiterNote)]],
        theme: "grid",
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `Document genere automatiquement par COORIZON le ${formatDateTimeFr(new Date().toISOString())}`,
      40,
      doc.internal.pageSize.getHeight() - 30
    );

    doc.save(`dossier-candidature-${slugify(fullNameOf(c))}-${formatDateFr(app.createdAt).replaceAll("/", "-")}.pdf`);
  };

  // ─── PDF export: list of candidatures (current filters, up to 200) ────
  const exportListPdf = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (departmentFilter !== "all") qs.set("department", departmentFilter);
      if (appliedSearch.trim()) qs.set("q", appliedSearch.trim());
      qs.set("page", "1");
      qs.set("pageSize", "200");
      const res = await fetch(`/api/admin/applications?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export impossible");
      const data = (await res.json()) as ApplicationsListResponse;
      const apps = data.applications;

      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(20, 90, 50);
      doc.text("COORIZON", 40, 44);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const filterLabel =
        departmentFilter !== "all" ? ` - Departement : ${departmentFilter}` : "";
      doc.text(
        pdfSafe(`Liste des candidatures${filterLabel} (${apps.length})`),
        40,
        60
      );

      autoTable(doc, {
        startY: 74,
        styles: { font: "helvetica", fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [20, 90, 50], textColor: 255 },
        head: [[
          "Candidat", "Email", "Telephone", "Centre", "Profession",
          "Niveau etudes", "Region Italie", "Offre", "Entreprise", "Statut", "Date",
        ]],
        body: apps.map((app) => {
          const p = app.candidate.candidateProfile;
          return [
            fullNameOf(app.candidate),
            app.candidate.email,
            app.candidate.phone ?? "-",
            p?.department ?? "-",
            pdfSafe(p?.profession) ?? "-",
            pdfSafe(p?.educationLevel) ?? "-",
            p?.preferredItalianRegion ?? "-",
            pdfSafe(app.jobOffer.title),
            pdfSafe(app.jobOffer.company.legalName),
            pdfSafe(getStatusMeta(app.status).label),
            formatDateFr(app.createdAt),
          ];
        }),
        theme: "grid",
      });

      doc.save(`candidatures-coorizon${departmentFilter !== "all" ? `-${slugify(departmentFilter)}` : ""}.pdf`);
    } catch {
      // best effort
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-navy">
            <Send className="h-6 w-6 text-brand" />
            Candidatures
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void exportListPdf()}
              disabled={exporting}
              className="border-brand-green/40 text-brand-green hover:bg-brand-green/10"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">
                {exporting ? "Export en cours…" : "Exporter la liste (PDF)"}
              </span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter une candidature</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Vue globale de toutes les candidatures de la plateforme, toutes entreprises confondues.
        </p>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">
                Recherche candidat
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Nom, prénom ou email…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">
                Statut
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as "all" | ApplicationStatus)}
              >
                <SelectTrigger id="status-filter" className="w-full md:w-56">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department-filter" className="text-xs font-medium text-muted-foreground">
                Département (centre)
              </Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger id="department-filter" className="w-full md:w-52">
                  <SelectValue placeholder="Tous les départements" />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {SENEGAL_REGIONS.map((r) => (
                    <SelectGroup key={r.region}>
                      <SelectLabel>Région de {r.region}</SelectLabel>
                      {r.departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={applySearch} className="bg-brand text-white hover:bg-brand/90">
                <Search className="mr-1.5 h-4 w-4" />
                Filtrer
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : applications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Inbox className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-navy">Aucune candidature</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Aucune candidature ne correspond à vos critères de recherche."
                : "Aucune candidature n'a encore été soumise sur la plateforme."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Centre</TableHead>
                    <TableHead>Offre</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Postulé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <ApplicationTableRow
                      key={app.id}
                      application={app}
                      onDetails={() => setDetailApp(app)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-3 lg:hidden">
            {applications.map((app) => (
              <li key={app.id}>
                <ApplicationCardMobile application={app} onDetails={() => setDetailApp(app)} />
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {total} candidature{total > 1 ? "s" : ""} · Page {page} sur {totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage((p) => Math.max(1, p - 1));
                      }}
                      aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {buildPageRange(page, totalPages).map((p, idx) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <span className="flex size-9 items-center justify-center text-muted-foreground">
                          …
                        </span>
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      aria-disabled={page >= totalPages}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Details dialog */}
      <Dialog
        open={!!detailApp}
        onOpenChange={(open) => !open && setDetailApp(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scrollbar">
          {detailApp ? (
            <ApplicationDetailContent
              application={detailApp}
              onClose={() => setDetailApp(null)}
              onExportPdf={exportDossierPdf}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ─── Add application dialog ─────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <Plus className="h-5 w-5 text-brand" />
              Ajouter une candidature
            </DialogTitle>
            <DialogDescription>
              Les candidatures sont créées par les candidats depuis leur
              espace lorsqu'ils postulent à une offre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              En tant qu'administrateur, vous pouvez consulter et gérer
              toutes les candidatures, mais la création d'une candidature
              relève du candidat : il choisit une offre publiée, rédige sa
              lettre de motivation et soumet sa candidature depuis son espace
              personnel.
            </p>
            <p>
              Les candidatures soumises apparaissent automatiquement dans
              cette interface et vous pouvez suivre leur statut, leur
              candidat et l'offre associée.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAddDialog(false)}>
              J'ai compris
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildPageRange(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const range: Array<number | "ellipsis"> = [];
  range.push(1);
  if (current > 3) range.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) range.push(p);
  if (current < total - 2) range.push("ellipsis");
  range.push(total);
  return range;
}

// ─── Desktop table row ─────────────────────────────────────────────────────

interface ApplicationRowProps {
  application: ApplicationListItem;
  onDetails: () => void;
}

function ApplicationTableRow({ application, onDetails }: ApplicationRowProps) {
  const meta = getStatusMeta(application.status);
  const candidate = application.candidate;
  const fullName =
    `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Candidat";
  const initials = (
    (candidate.firstName?.[0] ?? "") + (candidate.lastName?.[0] ?? "")
  ).toUpperCase();

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
            {initials || <Users className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-navy">{fullName}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{candidate.email}</span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {application.candidate.candidateProfile?.department ? (
          <Badge className="bg-brand-green text-white border border-brand-green">
            Centre de {application.candidate.candidateProfile.department}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-brand" />
          <span className="truncate text-sm text-navy">{application.jobOffer.title}</span>
        </div>
        {application.jobOffer.city && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {application.jobOffer.city}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate text-sm">{application.jobOffer.company.legalName}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={`px-2.5 py-1 text-xs font-medium ${meta.className}`}>
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${meta.dotClassName}`} />
          {meta.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {formatDateFr(application.createdAt)}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" onClick={onDetails}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Voir détails
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Mobile card ───────────────────────────────────────────────────────────

function ApplicationCardMobile({ application, onDetails }: ApplicationRowProps) {
  const meta = getStatusMeta(application.status);
  const candidate = application.candidate;
  const fullName =
    `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Candidat";
  const initials = (
    (candidate.firstName?.[0] ?? "") + (candidate.lastName?.[0] ?? "")
  ).toUpperCase();

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
              {initials || <Users className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-navy">{fullName}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{candidate.email}</span>
              </div>
            </div>
          </div>
          <Badge className={`px-2 py-1 text-[10px] font-medium ${meta.className}`}>
            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
            {meta.label}
          </Badge>
        </div>

        {candidate.candidateProfile?.department && (
          <Badge className="bg-brand-green text-white border border-brand-green">
            <Home className="mr-1 h-3 w-3" />
            Centre de {candidate.candidateProfile.department}
          </Badge>
        )}

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3 w-3 text-brand" />
            <span className="truncate text-navy">{application.jobOffer.title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{application.jobOffer.company.legalName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Postulé le {formatDateFr(application.createdAt)}
          </div>
        </div>

        <Separator />
        <Button size="sm" variant="outline" className="w-full" onClick={onDetails}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Voir détails
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Detail dialog content ─────────────────────────────────────────────────

function ApplicationDetailContent({
  application,
  onClose,
  onExportPdf,
}: {
  application: ApplicationListItem;
  onClose: () => void;
  onExportPdf: (app: ApplicationListItem) => void;
}) {
  const meta = getStatusMeta(application.status);
  const candidate = application.candidate;
  const profile = candidate.candidateProfile;
  const offer = application.jobOffer;
  const company = offer.company;
  const fullName =
    `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Candidat";
  const initials = (
    (candidate.firstName?.[0] ?? "") + (candidate.lastName?.[0] ?? "")
  ).toUpperCase();

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-xl text-navy">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
            {initials || <Users className="h-5 w-5" />}
          </span>
          {fullName}
        </DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2">
          <Badge className={`px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
            {meta.label}
          </Badge>
          <span className="text-foreground">{offer.title}</span>
        </DialogDescription>
      </DialogHeader>

      {/* Candidate profile — full info */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Users className="h-4 w-4 text-brand" />
          Profil du candidat
        </h4>
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-brand" />
            <span className="break-all text-muted-foreground">{candidate.email}</span>
          </div>
          {candidate.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{candidate.phone}</span>
            </div>
          )}
          {profile?.department && (
            <div className="flex items-center gap-2">
              <Home className="h-3.5 w-3.5 text-brand-green" />
              <span className="font-semibold text-brand-green">
                Centre de {profile.department}
              </span>
            </div>
          )}
          {profile?.profession && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{profile.profession}</span>
            </div>
          )}
          {profile?.desiredJob && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{profile.desiredJob}</span>
            </div>
          )}
          {profile?.sector && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{profile.sector}</span>
            </div>
          )}
          {profile?.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{profile.city}</span>
            </div>
          )}
          {profile?.educationLevel && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{profile.educationLevel}</span>
            </div>
          )}
          {profile?.italianLevel && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">Italien : {profile.italianLevel}</span>
            </div>
          )}
          {profile?.preferredItalianRegion && (
            <div className="flex items-center gap-2">
              <Plane className="h-3.5 w-3.5 text-brand" />
              <span className="text-muted-foreground">{profile.preferredItalianRegion}</span>
            </div>
          )}
        </div>
      </section>

      {/* Offer details */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Briefcase className="h-4 w-4 text-brand" />
          Offre visée
        </h4>
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Intitulé</div>
            <div className="text-navy">{offer.title}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Entreprise</div>
            <div className="text-navy">{company.legalName}</div>
          </div>
          {offer.city && (
            <div>
              <div className="text-xs uppercase text-muted-foreground">Ville</div>
              <div className="text-navy">{offer.city}</div>
            </div>
          )}
        </div>
      </section>

      {/* Cover letter */}
      {application.coverLetter && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <FileText className="h-4 w-4 text-brand" />
            Lettre de motivation
          </h4>
          <div className="max-h-60 overflow-y-auto custom-scrollbar rounded-md border bg-card p-3 text-sm whitespace-pre-wrap text-foreground">
            {application.coverLetter}
          </div>
        </section>
      )}

      {/* Recruiter note */}
      {application.recruiterNote && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <MessageSquare className="h-4 w-4 text-amber-600" />
            Note de l'entreprise
          </h4>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 whitespace-pre-wrap">
            {application.recruiterNote}
          </div>
        </section>
      )}

      {/* Rejection reason */}
      {application.status === "Rejected" && application.rejectionReason && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <XCircle className="h-4 w-4 text-italian-red" />
            Motif du refus
          </h4>
          <div className="rounded-md border border-italian-red/30 bg-italian-red/5 p-3 text-sm text-italian-red whitespace-pre-wrap">
            {application.rejectionReason}
          </div>
        </section>
      )}

      {/* Dates */}
      <Separator />
      <section className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Candidature envoyée</div>
          <div className="flex items-center gap-1.5 text-navy">
            <Calendar className="h-3.5 w-3.5 text-brand" />
            {formatDateTimeFr(application.createdAt)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Dernière mise à jour</div>
          <div className="flex items-center gap-1.5 text-navy">
            <Calendar className="h-3.5 w-3.5 text-brand" />
            {formatDateTimeFr(application.updatedAt)}
          </div>
        </div>
      </section>

      <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          className="border-brand-green/40 text-brand-green hover:bg-brand-green/10"
          onClick={() => onExportPdf(application)}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Exporter le dossier (PDF)
        </Button>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </DialogFooter>
    </div>
  );
}
