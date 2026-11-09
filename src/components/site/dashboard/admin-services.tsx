"use client";

import * as React from "react";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Tag,
  CheckCircle2,
  Clock,
  Euro,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { useToast } from "@/hooks/use-toast";

/**
 * AdminServices — back-office section for the paid-services catalog
 * (LOT 8 — Paiements — Task 8-a).
 *
 * An admin can:
 *   • browse ALL services (published and unpublished);
 *   • create a new service (name, description, category, price, currency,
 *     durationLabel, isPublished);
 *   • edit any subset of a service's fields;
 *   • delete a service that has no linked payments (otherwise the API
 *     refuses and the UI surfaces the server-provided message).
 *
 * Mutations flow through:
 *   - POST   /api/admin/services
 *   - PUT    /api/admin/services/[id]
 *   - DELETE /api/admin/services/[id]
 *
 * All UI strings are in French. Toasts confirm every successful mutation
 * and surface server-side validation errors.
 */

// ─── Local types (avoid importing @prisma/client on the client) ─────────────

type ServiceCategory =
  | "formation"
  | "accompagnement"
  | "abonnement"
  | "autre";

interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  price: number;
  currency: string;
  durationLabel: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServicesListResponse {
  services: Service[];
}

interface ServiceSingleResponse {
  service: Service;
}

// ─── Category metadata ─────────────────────────────────────────────────────

interface CategoryMeta {
  label: string;
  badgeClass: string;
}

const CATEGORY_META: Record<ServiceCategory, CategoryMeta> = {
  formation: {
    label: "Formation",
    badgeClass: "bg-brand/15 text-brand border-brand/30",
  },
  accompagnement: {
    label: "Accompagnement",
    badgeClass: "bg-brand-green/15 text-brand-green border-brand-green/30",
  },
  abonnement: {
    label: "Abonnement",
    badgeClass: "bg-navy/10 text-navy border-navy/30",
  },
  autre: {
    label: "Autre",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

const CATEGORY_VALUES: ServiceCategory[] = [
  "formation",
  "accompagnement",
  "abonnement",
  "autre",
];

// ─── Formatters ────────────────────────────────────────────────────────────

/**
 * Format a price as "X €" (or "X {currency}" for non-EUR currencies).
 * Uses the fr-FR locale grouping so 1200 → "1 200,00 €".
 */
function formatPrice(price: number, currency: string): string {
  const formatted = price.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency.toUpperCase() === "EUR") {
    return `${formatted} €`;
  }
  return `${formatted} ${currency}`;
}

// ─── Form state ────────────────────────────────────────────────────────────

interface ServiceFormState {
  name: string;
  description: string;
  category: ServiceCategory;
  // Kept as a string for input control; coerced to a number on submit.
  price: string;
  currency: string;
  durationLabel: string;
  isPublished: boolean;
}

const EMPTY_FORM: ServiceFormState = {
  name: "",
  description: "",
  category: "formation",
  price: "",
  currency: "EUR",
  durationLabel: "",
  isPublished: true,
};

function serviceToForm(service: Service): ServiceFormState {
  return {
    name: service.name,
    description: service.description,
    category: service.category,
    price: String(service.price),
    currency: service.currency,
    durationLabel: service.durationLabel ?? "",
    isPublished: service.isPublished,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminServices() {
  const { toast } = useToast();

  const [services, setServices] = React.useState<Service[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create / edit dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<Service | null>(
    null
  );
  const [form, setForm] = React.useState<ServiceFormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = React.useState(false);

  // Delete confirmation state
  const [deletingService, setDeletingService] =
    React.useState<Service | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ── Fetch services list ─────────────────────────────────────────────
  const fetchServices = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec du chargement des services.");
      }
      const data = (await res.json()) as ServicesListResponse;
      setServices(data.services);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // ── Dialog openers ───────────────────────────────────────────────────
  const openCreate = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm(serviceToForm(service));
    setFormOpen(true);
  };

  // ── Submit form (create or update) ───────────────────────────────────
  const submitForm = async () => {
    if (!form.name.trim()) {
      toast({
        variant: "destructive",
        title: "Nom requis",
        description: "Veuillez renseigner un nom pour ce service.",
      });
      return;
    }
    if (!form.description.trim()) {
      toast({
        variant: "destructive",
        title: "Description requise",
        description: "Veuillez renseigner une description.",
      });
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast({
        variant: "destructive",
        title: "Prix invalide",
        description: "Le prix doit être un nombre strictement positif.",
      });
      return;
    }

    setFormSaving(true);
    try {
      const isEdit = !!editingService;
      const url = isEdit
        ? `/api/admin/services/${editingService.id}`
        : "/api/admin/services";
      const method = isEdit ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price,
        currency: form.currency.trim() || "EUR",
        durationLabel: form.durationLabel.trim() || null,
        isPublished: form.isPublished,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de l'enregistrement.");
      }
      const data = (await res.json()) as ServiceSingleResponse;

      toast({
        title: isEdit ? "Service mis à jour" : "Service créé",
        description: `« ${data.service.name} » a été ${
          isEdit ? "mis à jour" : "créé"
        } avec succès.`,
      });
      setFormOpen(false);
      setEditingService(null);
      await fetchServices();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setFormSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deletingService) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/services/${deletingService.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Échec de la suppression.");
      }
      toast({
        title: "Service supprimé",
        description: `« ${deletingService.name} » a été supprimé.`,
      });
      setDeletingService(null);
      await fetchServices();
    } catch (e) {
      // The server returns the canonical "Impossible de supprimer un service
      // avec des paiements liés…" message on HTTP 400 — surface it verbatim.
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-navy">
            <CreditCard className="h-6 w-6 text-brand" />
            Services
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez le catalogue des prestations payantes de COORIZON.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-brand text-white hover:bg-brand/90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau service
        </Button>
      </header>

      {/* Loading state */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
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
      ) : services.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <CreditCard className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-navy">
              Aucun service
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Aucune prestation n&apos;existe encore. Créez votre premier
              service pour démarrer la commercialisation.
            </p>
            <Button
              onClick={openCreate}
              className="mt-4 bg-brand text-white hover:bg-brand/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Créer un service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Services existants</CardTitle>
            <CardDescription>
              {services.length} service{services.length > 1 ? "s" : ""} au
              total.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 shrink-0 text-brand" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-navy">
                              {service.name}
                            </div>
                            <div className="line-clamp-1 text-xs text-muted-foreground">
                              {service.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={service.category} />
                      </TableCell>
                      <TableCell className="font-medium text-navy">
                        {formatPrice(service.price, service.currency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {service.durationLabel ?? "—"}
                      </TableCell>
                      <TableCell>
                        <PublishedBadge isPublished={service.isPublished} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(service)}
                            title="Éditer le service"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span className="sr-only">Éditer</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingService(service)}
                            title="Supprimer le service"
                            className="text-italian-red hover:bg-italian-red/10 hover:text-italian-red"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 p-4 md:hidden">
              {services.map((service) => (
                <li key={service.id}>
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-navy">
                              {service.name}
                            </h3>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {service.description}
                            </p>
                          </div>
                        </div>
                        <PublishedBadge isPublished={service.isPublished} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <CategoryBadge category={service.category} />
                        <span className="inline-flex items-center gap-1 font-medium text-navy">
                          <Euro className="h-3 w-3" />
                          {formatPrice(service.price, service.currency)}
                        </span>
                        {service.durationLabel && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {service.durationLabel}
                          </span>
                        )}
                      </div>
                      <Separator />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openEdit(service)}
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Éditer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingService(service)}
                          className="text-italian-red hover:bg-italian-red/10 hover:text-italian-red"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Supprimer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Create / edit dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !formSaving) {
            setFormOpen(false);
            setEditingService(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <CreditCard className="h-5 w-5 text-brand" />
              {editingService ? "Éditer le service" : "Nouveau service"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Modifiez les champs ci-dessous puis enregistrez."
                : "Renseignez les champs ci-dessous pour créer un nouveau service."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">
                Nom <span className="text-italian-red">*</span>
              </Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Formation A1 — Italien débutant"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-description">
                Description <span className="text-italian-red">*</span>
              </Label>
              <Textarea
                id="svc-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Décrivez le contenu, les objectifs et les modalités du service."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="svc-category">
                  Catégorie <span className="text-italian-red">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      category: value as ServiceCategory,
                    }))
                  }
                >
                  <SelectTrigger id="svc-category" className="w-full">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_VALUES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="svc-duration">Durée (optionnel)</Label>
                <Input
                  id="svc-duration"
                  value={form.durationLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, durationLabel: e.target.value }))
                  }
                  placeholder="3 mois, 1 session, 12h…"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="svc-price">
                  Prix <span className="text-italian-red">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="svc-price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    placeholder="0,00"
                    className="pr-8"
                  />
                  <Euro className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-currency">Devise</Label>
                <Input
                  id="svc-currency"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                  placeholder="EUR"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="svc-published" className="cursor-pointer">
                  Service publié
                </Label>
                <p className="text-xs text-muted-foreground">
                  Un service non publié reste invisible dans le catalogue
                  public.
                </p>
              </div>
              <Switch
                id="svc-published"
                checked={form.isPublished}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isPublished: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditingService(null);
              }}
              disabled={formSaving}
            >
              Annuler
            </Button>
            <Button
              onClick={submitForm}
              disabled={formSaving}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {formSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {editingService ? "Enregistrer" : "Créer le service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingService}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeletingService(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le service « {deletingService?.name} » sera définitivement
              supprimé. Cette action est irréversible. S&apos;il est lié à des
              paiements, la suppression sera refusée — désactivez-le plutôt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: ServiceCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <Badge className={meta.badgeClass}>
      <Tag className="mr-1 h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function PublishedBadge({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <Badge className="bg-brand-green/15 text-brand-green border border-brand-green/30">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Publié
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border border-border">
      <Clock className="mr-1 h-3 w-3" />
      Non publié
    </Badge>
  );
}
