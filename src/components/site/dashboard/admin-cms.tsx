"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Globe,
  CheckCircle2,
  Clock,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CMSListResponse {
  pages: CMSPage[];
}

interface CMSSingleResponse {
  page: CMSPage;
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

// ─── Form state ────────────────────────────────────────────────────────────

interface CMSFormState {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  isPublished: boolean;
}

const EMPTY_FORM: CMSFormState = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  isPublished: true,
};

function pageToForm(page: CMSPage): CMSFormState {
  return {
    slug: page.slug,
    title: page.title,
    excerpt: page.excerpt ?? "",
    content: page.content,
    isPublished: page.isPublished,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminCms() {
  const { toast } = useToast();

  const [pages, setPages] = React.useState<CMSPage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create / edit dialog
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingPage, setEditingPage] = React.useState<CMSPage | null>(null);
  const [form, setForm] = React.useState<CMSFormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = React.useState(false);

  // Delete confirmation
  const [deletingPage, setDeletingPage] = React.useState<CMSPage | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Fetch list
  const fetchPages = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cms", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des pages.");
      }
      const data = (await res.json()) as CMSListResponse;
      setPages(data.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Dialog openers
  const openCreate = () => {
    setEditingPage(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (page: CMSPage) => {
    setEditingPage(page);
    setForm(pageToForm(page));
    setFormOpen(true);
  };

  // Submit form (create or update)
  const submitForm = async () => {
    if (!form.slug.trim()) {
      toast({
        variant: "destructive",
        title: "Slug requis",
        description: "Veuillez renseigner un slug unique.",
      });
      return;
    }
    if (!form.title.trim()) {
      toast({
        variant: "destructive",
        title: "Titre requis",
        description: "Veuillez renseigner un titre.",
      });
      return;
    }

    setFormSaving(true);
    try {
      const isEdit = !!editingPage;
      const url = isEdit
        ? `/api/admin/cms/${editingPage.id}`
        : "/api/admin/cms";
      const method = isEdit ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        isPublished: form.isPublished,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de l'enregistrement.");
      }
      const data = (await res.json()) as CMSSingleResponse;

      toast({
        title: isEdit ? "Page mise à jour" : "Page créée",
        description: `« ${data.page.title} » a été ${isEdit ? "mise à jour" : "créée"} avec succès.`,
      });
      setFormOpen(false);
      setEditingPage(null);
      await fetchPages();
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

  // Delete
  const confirmDelete = async () => {
    if (!deletingPage) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cms/${deletingPage.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la suppression.");
      }
      toast({
        title: "Page supprimée",
        description: `« ${deletingPage.title} » a été supprimée.`,
      });
      setDeletingPage(null);
      await fetchPages();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
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
            <FileText className="h-6 w-6 text-brand" />
            Contenu (CMS)
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les pages éditoriales du site public COORIZON.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-brand text-white hover:bg-brand/90">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle page
        </Button>
      </header>

      {/* Note card */}
      <Alert>
        <Globe className="h-4 w-4 text-brand" />
        <AlertTitle>À propos du CMS</AlertTitle>
        <AlertDescription>
          Le CMS permet de modifier le contenu du site public. Les pages seront
          connectées au site public dans un lot ultérieur.
        </AlertDescription>
      </Alert>

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
      ) : pages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-navy">Aucune page</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Aucune page CMS n'existe encore. Créez votre première page pour
              commencer à structurer le contenu du site public.
            </p>
            <Button
              onClick={openCreate}
              className="mt-4 bg-brand text-white hover:bg-brand/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Créer une page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Pages existantes</CardTitle>
            <CardDescription>
              {pages.length} page{pages.length > 1 ? "s" : ""} au total.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Mis à jour le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-brand" />
                          <span className="truncate font-medium text-navy">
                            {page.title}
                          </span>
                        </div>
                        {page.excerpt && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {page.excerpt}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          /{page.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <PublishedBadge isPublished={page.isPublished} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateFr(page.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(page)}
                            title="Éditer la page"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span className="sr-only">Éditer</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingPage(page)}
                            title="Supprimer la page"
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
              {pages.map((page) => (
                <li key={page.id}>
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-navy">
                              {page.title}
                            </h3>
                            <code className="text-xs text-muted-foreground">
                              /{page.slug}
                            </code>
                          </div>
                        </div>
                        <PublishedBadge isPublished={page.isPublished} />
                      </div>
                      {page.excerpt && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {page.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Mis à jour le {formatDateFr(page.updatedAt)}
                      </div>
                      <Separator />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openEdit(page)}
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Éditer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingPage(page)}
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
            setEditingPage(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <FileText className="h-5 w-5 text-brand" />
              {editingPage ? "Éditer la page" : "Nouvelle page"}
            </DialogTitle>
            <DialogDescription>
              {editingPage
                ? "Modifiez les champs ci-dessous puis enregistrez."
                : "Renseignez les champs ci-dessous pour créer une nouvelle page CMS."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cms-slug">
                  Slug <span className="text-italian-red">*</span>
                </Label>
                <Input
                  id="cms-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="mentions-legales"
                />
                <p className="text-xs text-muted-foreground">
                  Lettres minuscules, chiffres et tirets uniquement.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cms-title">
                  Titre <span className="text-italian-red">*</span>
                </Label>
                <Input
                  id="cms-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Mentions légales"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cms-excerpt">Extrait (optionnel)</Label>
              <Input
                id="cms-excerpt"
                value={form.excerpt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, excerpt: e.target.value }))
                }
                placeholder="Court résumé affiché dans les listes."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cms-content">Contenu</Label>
              <Textarea
                id="cms-content"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Contenu HTML ou texte de la page."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Le contenu peut contenir du HTML simple. Il sera interprété
                lors du rendu côté site public.
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="cms-published" className="cursor-pointer">
                  Page publiée
                </Label>
                <p className="text-xs text-muted-foreground">
                  Une page non publiée reste un brouillon invisible sur le site public.
                </p>
              </div>
              <Switch
                id="cms-published"
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
                setEditingPage(null);
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
              {editingPage ? "Enregistrer" : "Créer la page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingPage}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeletingPage(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette page ?</AlertDialogTitle>
            <AlertDialogDescription>
              La page « {deletingPage?.title} » (slug{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                /{deletingPage?.slug}
              </code>
              ) sera définitivement supprimée. Cette action est irréversible.
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

// ─── Published badge ───────────────────────────────────────────────────────

function PublishedBadge({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <Badge className="bg-brand-green/15 text-brand-green border border-brand-green/30">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Publiée
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border border-border">
      <Clock className="mr-1 h-3 w-3" />
      Brouillon
    </Badge>
  );
}
