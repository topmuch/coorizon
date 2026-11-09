"use client";

import * as React from "react";
import {
  Building2,
  FileText,
  Upload,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Save,
  Users,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth/session-provider";

/**
 * RecruiterCompany — "Profil entreprise" dashboard section (LOT 4 — Task 4-b).
 *
 * A recruiter can:
 *   • view & edit their company's public information (legalName, address…);
 *   • see the validation status banner (Validated / Pending / Rejected);
 *   • upload / replace / delete the company's justificatives
 *     (Kbis, code fiscal, pièce d'identité du responsable);
 *   • view their co-responsibles on the same company.
 *
 * All mutations go through /api/recruiter/company* which scope every query
 * to the authenticated recruiter's own company.
 */

// ── Local types (avoid importing @prisma/client on the client) ─────────────

type CompanyStatus = "Pending" | "Validated" | "Suspended" | "Rejected";
type DocumentStatus =
  | "NotProvided"
  | "Pending"
  | "Validated"
  | "Refused"
  | "Expired";
type CompanyDocType = "CompanyRegistration" | "TaxId" | "IDDocument";

interface CompanyDocument {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

interface RecruiterRow {
  id: string;
  responsibleName: string | null;
  responsiblePhone: string | null;
  responsibleEmail: string | null;
  jobTitle: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
}

interface Company {
  id: string;
  legalName: string;
  registrationNumber: string | null;
  taxId: string | null;
  vatNumber: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  website: string | null;
  sector: string | null;
  size: string | null;
  status: CompanyStatus;
  rejectionReason: string | null;
  validatedAt: string | null;
  documents: CompanyDocument[];
  recruiters: RecruiterRow[];
}

interface CompanyResponse {
  company: Company;
  profile: {
    id: string;
    responsibleName: string | null;
    responsiblePhone: string | null;
    responsibleEmail: string | null;
    jobTitle: string | null;
  } | null;
}

// ── Static config ──────────────────────────────────────────────────────────

const SECTORS = [
  "Hôtellerie & Restauration",
  "Agriculture & Agroalimentaire",
  "BTP & Construction",
  "Soins & Santé",
  "Industrie & Mécanique",
  "Logistique & Transport",
  "Tech & Numérique",
  "Commerce & Services",
  "Autre",
];

const COMPANY_SIZES = [
  "1-10 salariés",
  "11-50 salariés",
  "51-250 salariés",
  "251-500 salariés",
  "500+ salariés",
];

interface DocTypeMeta {
  type: CompanyDocType;
  label: string;
  description: string;
  icon: LucideIcon;
}

const DOC_TYPES: DocTypeMeta[] = [
  {
    type: "CompanyRegistration",
    label: "Extrait de registre / Kbis",
    description:
      "Justificatif d'immatriculation de l'entreprise au registre du commerce.",
    icon: FileText,
  },
  {
    type: "TaxId",
    label: "Code fiscal",
    description: "Numéro d'identification fiscale de l'entreprise.",
    icon: FileText,
  },
  {
    type: "IDDocument",
    label: "Pièce d'identité du responsable",
    description:
      "Pièce d'identité en cours de validité du responsable légal.",
    icon: ShieldCheck,
  },
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

// ── Helpers ────────────────────────────────────────────────────────────────

interface StatusBannerMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  className: string;
  iconClassName: string;
  badge: { label: string; className: string; icon: LucideIcon };
}

function statusBanner(status: CompanyStatus, rejectionReason: string | null): StatusBannerMeta {
  switch (status) {
    case "Validated":
      return {
        label: "Entreprise validée",
        description:
          "Votre entreprise est validée par l'équipe COORIZON. Vous pouvez publier des offres librement.",
        icon: CheckCircle2,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        iconClassName: "text-emerald-600",
        badge: {
          label: "Validée",
          className: "border-emerald-200 bg-emerald-100 text-emerald-800",
          icon: CheckCircle2,
        },
      };
    case "Rejected":
      return {
        label: "Entreprise rejetée",
        description:
          rejectionReason ??
          "Votre demande n'a pas pu être validée. Contactez le support COORIZON pour plus d'informations.",
        icon: XCircle,
        className: "border-red-200 bg-red-50 text-red-900",
        iconClassName: "text-red-600",
        badge: {
          label: "Rejetée",
          className: "border-red-200 bg-red-100 text-red-800",
          icon: XCircle,
        },
      };
    case "Suspended":
      return {
        label: "Entreprise suspendue",
        description:
          "Votre compte entreprise est temporairement suspendu. Contactez l'administration COORIZON.",
        icon: XCircle,
        className: "border-red-200 bg-red-50 text-red-900",
        iconClassName: "text-red-600",
        badge: {
          label: "Suspendue",
          className: "border-red-200 bg-red-100 text-red-800",
          icon: XCircle,
        },
      };
    case "Pending":
    default:
      return {
        label: "En attente de validation",
        description:
          "Votre entreprise est en cours d'examen par l'équipe COORIZON. La validation est généralement effectuée sous 48h ouvrées.",
        icon: Clock,
        className: "border-amber-200 bg-amber-50 text-amber-900",
        iconClassName: "text-amber-600",
        badge: {
          label: "En attente",
          className: "border-amber-200 bg-amber-100 text-amber-800",
          icon: Clock,
        },
      };
  }
}

interface DocStatusBadge {
  label: string;
  className: string;
  icon?: LucideIcon;
}

function docStatusBadge(status: DocumentStatus): DocStatusBadge {
  switch (status) {
    case "Validated":
      return {
        label: "Validé",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      };
    case "Pending":
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-100 text-amber-800",
        icon: Clock,
      };
    case "Refused":
      return {
        label: "Refusé",
        className: "border-red-200 bg-red-100 text-red-800",
        icon: XCircle,
      };
    case "Expired":
      return {
        label: "Expiré",
        className: "border-red-200 bg-red-100 text-red-800",
        icon: XCircle,
      };
    case "NotProvided":
    default:
      return {
        label: "Non fourni",
        className: "bg-muted text-muted-foreground",
      };
  }
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function fullName(r: RecruiterRow): string {
  const first = r.user.firstName?.trim() ?? "";
  const last = r.user.lastName?.trim() ?? "";
  const composed = `${first} ${last}`.trim();
  return composed || r.responsibleName?.trim() || r.user.email;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Form state ─────────────────────────────────────────────────────────────

interface CompanyFormState {
  legalName: string;
  registrationNumber: string;
  taxId: string;
  vatNumber: string;
  address: string;
  city: string;
  region: string;
  website: string;
  sector: string;
  size: string;
}

const EMPTY_FORM: CompanyFormState = {
  legalName: "",
  registrationNumber: "",
  taxId: "",
  vatNumber: "",
  address: "",
  city: "",
  region: "",
  website: "",
  sector: "",
  size: "",
};

function mapCompanyToForm(c: Company): CompanyFormState {
  return {
    legalName: c.legalName ?? "",
    registrationNumber: c.registrationNumber ?? "",
    taxId: c.taxId ?? "",
    vatNumber: c.vatNumber ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    region: c.region ?? "",
    website: c.website ?? "",
    sector: c.sector ?? "",
    size: c.size ?? "",
  };
}

// ── Main component ─────────────────────────────────────────────────────────

export function RecruiterCompany() {
  const { toast } = useToast();
  const { user } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [profile, setProfile] = React.useState<CompanyResponse["profile"]>(null);
  const [form, setForm] = React.useState<CompanyFormState>(EMPTY_FORM);

  // Document operations state
  const [uploadingType, setUploadingType] = React.useState<CompanyDocType | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recruiter/company", { method: "GET" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger les informations de l'entreprise."
        );
      }
      const data = (await res.json()) as CompanyResponse;
      setCompany(data.company);
      setProfile(data.profile);
      setForm(mapCompanyToForm(data.company));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible de charger les informations de l'entreprise."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof CompanyFormState>(
    key: K,
    value: CompanyFormState[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.legalName.trim()) {
      setError("La raison sociale est obligatoire.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        legalName: form.legalName.trim(),
        registrationNumber: form.registrationNumber.trim() || null,
        taxId: form.taxId.trim() || null,
        vatNumber: form.vatNumber.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        region: form.region.trim() || null,
        website: form.website.trim() || null,
        sector: form.sector || null,
        size: form.size || null,
      };

      const res = await fetch("/api/recruiter/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "La mise à jour a échoué.");
      }

      const updated = (await res.json()) as Company;
      setCompany(updated);
      setForm(mapCompanyToForm(updated));
      toast({
        title: "Entreprise mise à jour",
        description: "Vos informations ont été enregistrées avec succès.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "La mise à jour a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = React.useCallback(
    async (type: CompanyDocType, file: File) => {
      if (file.size > MAX_SIZE) {
        toast({
          title: "Fichier trop volumineux",
          description: "Le fichier dépasse 10 Mo.",
          variant: "destructive",
        });
        return;
      }
      setUploadingType(type);
      try {
        const fd = new FormData();
        fd.append("type", type);
        fd.append("file", file);
        const res = await fetch("/api/recruiter/company/documents", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as
          | { error?: string; id?: string }
          | null;
        if (!res.ok) {
          toast({
            title: "Téléversement impossible",
            description: data?.error ?? "Une erreur est survenue.",
            variant: "destructive",
          });
          return;
        }

        // "Remplacer" semantics: delete any previous document of the same type.
        if (company) {
          const previous = company.documents.find(
            (d) => d.type === type && d.id !== data?.id
          );
          if (previous) {
            try {
              await fetch(
                `/api/recruiter/company/documents/${previous.id}`,
                { method: "DELETE" }
              );
            } catch {
              // best-effort cleanup
            }
          }
        }

        toast({
          title: "Document téléversé",
          description:
            "Votre document est en attente de validation par l'équipe COORIZON.",
        });
        await load();
      } catch {
        toast({
          title: "Téléversement impossible",
          description: "Vérifiez votre connexion et réessayez.",
          variant: "destructive",
        });
      } finally {
        setUploadingType(null);
      }
    },
    [company, load, toast]
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/recruiter/company/documents/${id}`, {
          method: "DELETE",
        });
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (!res.ok) {
          toast({
            title: "Suppression impossible",
            description: data?.error ?? "Une erreur est survenue.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Document supprimé",
          description: "Le document a été retiré de votre dossier entreprise.",
        });
        await load();
      } catch {
        toast({
          title: "Suppression impossible",
          description: "Vérifiez votre connexion et réessayez.",
          variant: "destructive",
        });
      } finally {
        setDeletingId(null);
      }
    },
    [load, toast]
  );

  if (loading) {
    return <CompanySkeleton />;
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Profil entreprise</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Une erreur est survenue lors du chargement de votre entreprise.
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={() => void load()} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  const banner = statusBanner(company.status, company.rejectionReason);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Profil entreprise</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les informations légales et les justificatifs de votre
          entreprise.
        </p>
      </div>

      {/* Status banner */}
      <Alert className={banner.className}>
        <banner.icon className={`h-4 w-4 ${banner.iconClassName}`} />
        <AlertDescription className="space-y-1">
          <p className="font-semibold">{banner.label}</p>
          <p className="text-sm opacity-90">{banner.description}</p>
          {company.validatedAt && (
            <p className="text-xs opacity-75">
              Validée le {formatDate(company.validatedAt)}.
            </p>
          )}
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Company info form */}
      <form onSubmit={handleSave} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
                <Building2 className="h-4 w-4" />
              </span>
              Informations légales
            </CardTitle>
            <CardDescription>
              Renseignez les informations officielles de votre entreprise.
              Ces données apparaîtront sur vos offres d'emploi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Raison sociale" htmlFor="legalName" required>
                <Input
                  id="legalName"
                  value={form.legalName}
                  onChange={(e) => set("legalName", e.target.value)}
                  placeholder="Ex : COORIZON Italia S.r.l."
                  autoComplete="organization"
                />
              </Field>
              <Field
                label="Numéro d'immatriculation"
                htmlFor="registrationNumber"
              >
                <Input
                  id="registrationNumber"
                  value={form.registrationNumber}
                  onChange={(e) => set("registrationNumber", e.target.value)}
                  placeholder="Ex : 12345678901"
                />
              </Field>
              <Field label="Numéro fiscal" htmlFor="taxId">
                <Input
                  id="taxId"
                  value={form.taxId}
                  onChange={(e) => set("taxId", e.target.value)}
                  placeholder="Ex : RSSMRA80A01H501Z"
                />
              </Field>
              <Field label="N° TVA" htmlFor="vatNumber">
                <Input
                  id="vatNumber"
                  value={form.vatNumber}
                  onChange={(e) => set("vatNumber", e.target.value)}
                  placeholder="Ex : IT01234567890"
                />
              </Field>
              <Field label="Adresse" htmlFor="address">
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Ex : Via Roma 12"
                  autoComplete="address-line1"
                />
              </Field>
              <Field label="Ville" htmlFor="city">
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Ex : Milan"
                  autoComplete="address-level2"
                />
              </Field>
              <Field label="Région" htmlFor="region">
                <Input
                  id="region"
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  placeholder="Ex : Lombardie"
                />
              </Field>
              <Field label="Site web" htmlFor="website">
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://www.mon-entreprise.it"
                  autoComplete="url"
                />
              </Field>
              <Field label="Secteur d'activité" htmlFor="sector">
                <SectorSelect
                  value={form.sector}
                  onChange={(v) => set("sector", v)}
                />
              </Field>
              <Field label="Taille de l'entreprise" htmlFor="size">
                <SizeSelect
                  value={form.size}
                  onChange={(v) => set("size", v)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-brand hover:bg-brand/90 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
              <FileText className="h-4 w-4" />
            </span>
            Justificatifs
          </CardTitle>
          <CardDescription>
            Téléversez les documents officiels requis pour valider votre
            entreprise (PDF, Word, PNG ou JPG, 10 Mo max).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {DOC_TYPES.map((meta) => {
              const doc = company.documents.find((d) => d.type === meta.type) ?? null;
              return (
                <DocumentTypeCard
                  key={meta.type}
                  meta={meta}
                  document={doc}
                  uploading={uploadingType === meta.type}
                  deleting={deletingId === doc?.id}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Responsibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
              <Users className="h-4 w-4" />
            </span>
            Responsables
          </CardTitle>
          <CardDescription>
            Les recruteurs rattachés à votre entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {company.recruiters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun responsable n'est rattaché à cette entreprise.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {company.recruiters.map((r) => {
                const name = fullName(r);
                const isMe = user?.id === r.user.id;
                return (
                  <li
                    key={r.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand"
                      aria-hidden="true"
                    >
                      {initials(name) || "•"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-navy">{name}</p>
                        {isMe && (
                          <Badge
                            variant="outline"
                            className="border-brand/30 bg-brand/5 text-brand"
                          >
                            Vous
                          </Badge>
                        )}
                      </div>
                      {r.jobTitle && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {r.jobTitle}
                        </p>
                      )}
                      <Separator className="my-2" />
                      <div className="space-y-1">
                        <a
                          href={`mailto:${r.user.email}`}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.user.email}</span>
                        </a>
                        {((r.user.phone ?? "").trim() || (r.responsiblePhone ?? "").trim()) && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            {(r.user.phone ?? r.responsiblePhone ?? "").trim()}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {profile && (
            <p className="mt-4 text-xs text-muted-foreground">
              Vous êtes enregistré en tant que
              {profile.responsibleName ? (
                <> <strong className="text-foreground">{profile.responsibleName}</strong> —</>
              ) : null}
              {profile.jobTitle ? <> {profile.jobTitle},</> : null} responsable
              des recrutements de cette entreprise.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, required, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-navy">
        {label}
        {required && (
          <span className="ml-0.5 text-italian-red" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface SectorSelectProps {
  value: string;
  onChange: (v: string) => void;
}

function SectorSelect({ value, onChange }: SectorSelectProps) {
  return (
    <select
      id="sector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">Sélectionner…</option>
      {SECTORS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

interface SizeSelectProps {
  value: string;
  onChange: (v: string) => void;
}

function SizeSelect({ value, onChange }: SizeSelectProps) {
  return (
    <select
      id="size"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">Sélectionner…</option>
      {COMPANY_SIZES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

interface DocumentTypeCardProps {
  meta: DocTypeMeta;
  document: CompanyDocument | null;
  uploading: boolean;
  deleting: boolean;
  onUpload: (type: CompanyDocType, file: File) => void;
  onDelete: (id: string) => void;
}

function DocumentTypeCard({
  meta,
  document,
  uploading,
  deleting,
  onUpload,
  onDelete,
}: DocumentTypeCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const Icon = meta.icon;
  const status: DocumentStatus = document ? document.status : "NotProvided";
  const badge = docStatusBadge(status);
  const StatusIcon = badge.icon;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(meta.type, file);
    // reset so selecting the same file again re-triggers onChange
    e.target.value = "";
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-navy">{meta.label}</h3>
              <Badge className={badge.className} variant="outline">
                {StatusIcon ? <StatusIcon className="h-3 w-3" /> : null}
                {badge.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {meta.description}
            </p>

            {document && (
              <>
                <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs font-medium text-foreground">
                    {document.fileName}
                  </span>
                  {document.sizeBytes ? (
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {formatBytes(document.sizeBytes)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Téléversé le {formatDate(document.createdAt)}
                </p>
              </>
            )}

            <Separator className="my-3" />

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading || deleting}
                aria-label={`Téléverser ${meta.label}`}
              />

              {document && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deleting || uploading}
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Supprimer ce document ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le document
                        «&nbsp;{document.fileName}&nbsp;» sera définitivement
                        supprimé de votre dossier entreprise.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => onDelete(document.id)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                size="sm"
                variant={document ? "ghost" : "default"}
                onClick={() => inputRef.current?.click()}
                disabled={uploading || deleting}
                className={
                  document
                    ? "text-brand hover:bg-brand/10 hover:text-brand"
                    : "bg-brand hover:bg-brand/90"
                }
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {document ? "Remplacer" : "Téléverser"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function CompanySkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
      <Skeleton className="h-10 w-full sm:w-40 sm:justify-self-end" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
