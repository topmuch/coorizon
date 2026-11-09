"use client";

import * as React from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Edit,
  Globe,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";

/**
 * TrainerCourses — "Mes formations" dashboard section (LOT 6 — Task 6-d).
 *
 * A trainer can:
 *   • view all of their courses (with module / learner / exam counts);
 *   • create a new course;
 *   • edit a course's content & publication status;
 *   • delete a course (with confirmation).
 *
 * All mutations go through /api/trainer/courses* which scope every query to
 * the authenticated trainer's own courses.
 */

// ── Types (avoid importing @prisma/client on the client) ─────────────────────

type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  level: CourseLevel;
  durationHours: number | null;
  isPublished: boolean;
  createdAt: string;
  _count?: { modules: number; enrollments: number; exercises: number };
}

interface CoursesResponse {
  courses: Course[];
}

interface CourseResponse {
  course: Course;
}

// ── Static data ──────────────────────────────────────────────────────────────

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "A1", label: "A1 — Débutant" },
  { value: "A2", label: "A2 — Élémentaire" },
  { value: "B1", label: "B1 — Intermédiaire" },
  { value: "B2", label: "B2 — Avancé" },
  { value: "C1", label: "C1 — Autonome" },
  { value: "C2", label: "C2 — Maîtrise" },
];

function levelLabel(level: CourseLevel): string {
  return LEVELS.find((l) => l.value === level)?.label ?? level;
}

// ── Form types ───────────────────────────────────────────────────────────────

interface CourseFormState {
  title: string;
  subtitle: string;
  description: string;
  level: CourseLevel;
  durationHours: string;
  isPublished: boolean;
}

const EMPTY_FORM: CourseFormState = {
  title: "",
  subtitle: "",
  description: "",
  level: "A1",
  durationHours: "",
  isPublished: false,
};

function courseToForm(course: Course): CourseFormState {
  return {
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description,
    level: course.level,
    durationHours:
      course.durationHours !== null ? String(course.durationHours) : "",
    isPublished: course.isPublished,
  };
}

function validateForm(form: CourseFormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = "Le titre est obligatoire.";
  if (!form.description.trim())
    e.description = "La description est obligatoire.";
  return e;
}

function buildPayload(form: CourseFormState): Record<string, unknown> {
  const duration = parseInt(form.durationHours, 10);
  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim(),
    level: form.level,
    durationHours:
      Number.isFinite(duration) && duration > 0 ? duration : null,
    isPublished: form.isPublished,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function TrainerCourses() {
  const { toast } = useToast();

  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create / edit dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CourseFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {}
  );
  const [submitting, setSubmitting] = React.useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = React.useState<Course | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/courses", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger vos formations."
        );
      }
      const data = (await res.json()) as CoursesResponse;
      setCourses(data.courses);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ---- Create / edit handlers ------------------------------------------

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingId(course.id);
    setForm(courseToForm(course));
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const payload = buildPayload(form);
      const isEdit = editingId !== null;
      const url = isEdit
        ? `/api/trainer/courses/${editingId}`
        : "/api/trainer/courses";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string; course?: Course }
        | null;

      if (!res.ok || !data?.course) {
        throw new Error(
          data?.error ??
            (isEdit
              ? "Échec de la mise à jour."
              : "Échec de la création.")
        );
      }

      if (isEdit) {
        setCourses((prev) =>
          prev.map((c) => (c.id === data.course!.id ? data.course! : c))
        );
        toast({
          title: "Formation mise à jour",
          description: data.course.title,
        });
      } else {
        setCourses((prev) => [data.course as Course, ...prev]);
        toast({
          title: "Formation créée",
          description: data.course.title,
        });
      }

      setDialogOpen(false);
    } catch (err) {
      toast({
        title: "Erreur",
        description:
          err instanceof Error
            ? err.message
            : "Une erreur inattendue est survenue.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete handler ---------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/trainer/courses/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Échec de la suppression.");
      }
      setCourses((prev) =>
        prev.filter((c) => c.id !== deleteTarget.id)
      );
      toast({
        title: "Formation supprimée",
        description: deleteTarget.title,
      });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Erreur",
        description:
          err instanceof Error
            ? err.message
            : "Une erreur inattendue est survenue.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ---- Toggle published (quick action) ---------------------------------

  const togglePublished = async (course: Course) => {
    const next = !course.isPublished;
    // Optimistic update
    setCourses((prev) =>
      prev.map((c) =>
        c.id === course.id ? { ...c, isPublished: next } : c
      )
    );
    try {
      const res = await fetch(`/api/trainer/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished: next }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; course?: Course }
        | null;
      if (!res.ok || !data?.course) {
        throw new Error(data?.error ?? "Échec de la mise à jour.");
      }
      setCourses((prev) =>
        prev.map((c) => (c.id === data.course!.id ? data.course! : c))
      );
      toast({
        title: next ? "Formation publiée" : "Formation dépubliée",
        description: course.title,
      });
    } catch (err) {
      // Revert
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, isPublished: course.isPublished } : c
        )
      );
      toast({
        title: "Erreur",
        description:
          err instanceof Error
            ? err.message
            : "Une erreur inattendue est survenue.",
        variant: "destructive",
      });
    }
  };

  // ---- Render ----------------------------------------------------------

  // Loading skeleton
  if (loading && courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="py-5">
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && courses.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Impossible de charger vos formations</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-fit"
            onClick={() => void load()}
            aria-label="Réessayer le chargement"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Mes formations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez, publiez et gérez vos cours d&apos;italien.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle formation
        </Button>
      </div>

      {/* Empty state */}
      {courses.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center gap-3 text-center">
            <div
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand"
            >
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-navy">
                Aucune formation pour le moment
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Créez votre première formation pour commencer à enseigner.
              </p>
            </div>
            <Button onClick={openCreate} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Créer une formation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const counts = course._count ?? {
              modules: 0,
              enrollments: 0,
              exercises: 0,
            };
            return (
              <Card key={course.id} className="py-5">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-navy">
                          {course.title}
                        </h3>
                        {course.isPublished ? (
                          <Badge className="bg-brand-green/15 text-brand-green">
                            <Globe className="mr-1 h-3 w-3" />
                            Publiée
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Brouillon</Badge>
                        )}
                      </div>
                      {course.subtitle ? (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {course.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline">{course.level}</Badge>
                  </div>

                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {course.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border bg-surface px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        Modules
                      </div>
                      <div className="mt-0.5 text-lg font-bold text-navy">
                        {counts.modules}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-surface px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Apprenants
                      </div>
                      <div className="mt-0.5 text-lg font-bold text-navy">
                        {counts.enrollments}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-surface px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <ClipboardCheck className="h-3 w-3" />
                        Examens
                      </div>
                      <div className="mt-0.5 text-lg font-bold text-navy">
                        {counts.exercises}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(course)}
                    >
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      Éditer
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void togglePublished(course)}
                    >
                      {course.isPublished ? (
                        <>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Dépublier
                        </>
                      ) : (
                        <>
                          <Globe className="mr-1.5 h-3.5 w-3.5" />
                          Publier
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-italian-red hover:bg-italian-red/10 hover:text-italian-red"
                      onClick={() => setDeleteTarget(course)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier la formation" : "Nouvelle formation"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Mettez à jour les informations de votre formation."
                : "Renseignez les informations de votre nouvelle formation en italien."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="course-title">
                Titre <span className="text-italian-red">*</span>
              </Label>
              <Input
                id="course-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="ex. Italien professionnel — Hôtellerie"
                aria-invalid={Boolean(formErrors.title)}
              />
              {formErrors.title ? (
                <p className="text-xs text-italian-red">{formErrors.title}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-subtitle">Sous-titre</Label>
              <Input
                id="course-subtitle"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subtitle: e.target.value }))
                }
                placeholder="ex. Niveau intermédiaire, 40 heures"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-description">
                Description <span className="text-italian-red">*</span>
              </Label>
              <Textarea
                id="course-description"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Décrivez le contenu et les objectifs de la formation…"
                aria-invalid={Boolean(formErrors.description)}
              />
              {formErrors.description ? (
                <p className="text-xs text-italian-red">
                  {formErrors.description}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="course-level">
                  Niveau <span className="text-italian-red">*</span>
                </Label>
                <Select
                  value={form.level}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, level: v as CourseLevel }))
                  }
                >
                  <SelectTrigger id="course-level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="course-duration">Durée (heures)</Label>
                <Input
                  id="course-duration"
                  type="number"
                  min={1}
                  value={form.durationHours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      durationHours: e.target.value,
                    }))
                  }
                  placeholder="ex. 40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-surface px-4 py-3">
              <div>
                <Label
                  htmlFor="course-published"
                  className="text-sm font-medium"
                >
                  Publier la formation
                </Label>
                <p className="text-xs text-muted-foreground">
                  Rend la formation visible des apprenants.
                </p>
              </div>
              <Switch
                id="course-published"
                checked={form.isPublished}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isPublished: v }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : editingId ? (
                  "Enregistrer"
                ) : (
                  "Créer la formation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la formation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <span>
                  Vous êtes sur le point de supprimer{" "}
                  <strong className="text-foreground">
                    {deleteTarget.title}
                  </strong>
                  . Cette action est définitive et supprimera également les
                  modules, leçons, exercices et inscriptions associés.
                </span>
              ) : (
                "Cette action est définitive."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression…
                </>
              ) : (
                "Supprimer définitivement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
