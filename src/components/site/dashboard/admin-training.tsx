"use client";

import * as React from "react";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Users,
  Layers,
  Eye,
  Edit,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────

interface Trainer {
  firstName: string | null;
  lastName: string | null;
}

interface CourseCounts {
  modules: number;
  enrollments: number;
  exercises: number;
}

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  level: string;
  durationHours: number | null;
  isPublished: boolean;
  trainer: Trainer | null;
  _count: CourseCounts;
  createdAt: string;
}

type FilterTab = "all" | "published" | "drafts";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const LEVEL_STYLES: Record<string, string> = {
  A1: "bg-brand/10 text-brand border-brand/20",
  A2: "bg-brand-green/10 text-brand-green border-brand-green/20",
  B1: "bg-primary/10 text-primary border-primary/20",
  B2: "bg-italian-red/10 text-italian-red border-italian-red/20",
  C1: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  C2: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
};

// ─── Component ───────────────────────────────────────────────────────────

export function AdminTraining() {
  const { toast } = useToast();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/training", { credentials: "include" });
      if (!res.ok) throw new Error("Échec du chargement");
      const data = await res.json();
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch {
      setError("Échec du chargement des formations. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const publishedCount = React.useMemo(
    () => courses.filter((c) => c.isPublished).length,
    [courses]
  );
  const draftCount = courses.length - publishedCount;

  const visibleCourses = React.useMemo(() => {
    if (filter === "published") return courses.filter((c) => c.isPublished);
    if (filter === "drafts") return courses.filter((c) => !c.isPublished);
    return courses;
  }, [courses, filter]);

  const totalLearners = courses.reduce(
    (sum, c) => sum + c._count.enrollments,
    0
  );
  const totalModules = courses.reduce((sum, c) => sum + c._count.modules, 0);

  const trainerName = (t: Trainer | null): string => {
    if (!t) return "—";
    const first = t.firstName ?? "";
    const last = t.lastName ?? "";
    const full = `${first} ${last}`.trim();
    return full || "—";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <GraduationCap className="h-6 w-6 text-brand" />
            Formations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez le catalogue de formations en italien (A1 à C2).
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          <span className="ml-1">Nouvelle formation</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {courses.length}
              </div>
              <div className="text-xs text-muted-foreground">Formations</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {totalLearners}
              </div>
              <div className="text-xs text-muted-foreground">Apprenants</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {totalModules}
              </div>
              <div className="text-xs text-muted-foreground">Modules</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {publishedCount}
              </div>
              <div className="text-xs text-muted-foreground">Publiées</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterTab)}
        className="w-full"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-initial">
            Toutes ({courses.length})
          </TabsTrigger>
          <TabsTrigger value="published" className="flex-1 sm:flex-initial">
            Publiées ({publishedCount})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1 sm:flex-initial">
            Brouillons ({draftCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[28rem] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Formation</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Modules</TableHead>
                    <TableHead className="text-center">Apprenants</TableHead>
                    <TableHead>Formateur</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-3/4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-10 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="mx-auto h-4 w-6" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="mx-auto h-4 w-6" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courses table */}
      {!loading && !error && visibleCourses.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[28rem] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[40%]">Formation</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Modules</TableHead>
                    <TableHead className="text-center">Apprenants</TableHead>
                    <TableHead>Formateur</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {course.title}
                          </span>
                          {course.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {course.subtitle}
                            </span>
                          )}
                          {course.durationHours !== null && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {course.durationHours}h
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            LEVEL_STYLES[course.level] ||
                            "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {course.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {course.isPublished ? (
                          <Badge className="gap-1 bg-brand/10 text-brand hover:bg-brand/10">
                            <CheckCircle2 className="h-3 w-3" />
                            Publiée
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Edit className="h-3 w-3" />
                            Brouillon
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-foreground">
                          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                          {course._count.modules}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-foreground">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {course._count.enrollments}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">
                          {trainerName(course.trainer)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              toast({
                                title: "Fonctionnalité en cours de développement",
                                description:
                                  "L'édition détaillée des formations sera disponible prochainement.",
                              })
                            }
                            aria-label="Voir la formation"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              toast({
                                title: "Fonctionnalité en cours de développement",
                                description:
                                  "L'édition détaillée des formations sera disponible prochainement.",
                              })
                            }
                            aria-label="Modifier la formation"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && visibleCourses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {filter === "published"
                ? "Aucune formation publiée"
                : filter === "drafts"
                ? "Aucun brouillon"
                : "Aucune formation"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {filter === "all"
                ? "Créez votre première formation en italien pour démarrer le catalogue."
                : "Les formations apparaîtront ici selon le filtre sélectionné."}
            </p>
            {filter === "all" && (
              <Button
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Nouvelle formation
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add dialog (placeholder) */}
      {showAddDialog && (
        <AddCourseDialog onClose={() => setShowAddDialog(false)} />
      )}
    </div>
  );
}

// ─── Add Course Dialog (placeholder) ─────────────────────────────────────

function AddCourseDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    title: "",
    subtitle: "",
    description: "",
    level: "A1",
    durationHours: "",
    isPublished: false,
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    toast({
      title: "Fonctionnalité en cours de développement",
      description:
        "La création de formations sera disponible prochainement. Le formulaire est affiché à titre d'aperçu.",
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-brand" />
            Nouvelle formation
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle formation en italien. Les champs ci-dessous
            sont un aperçu de la fiche à venir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="course-title">Titre *</Label>
            <Input
              id="course-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Italien débutant — Premiers pas"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course-subtitle">Sous-titre</Label>
            <Input
              id="course-subtitle"
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Ex: Niveau A1 du CECRL"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course-description">Description *</Label>
            <Textarea
              id="course-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Décrivez le contenu et les objectifs de la formation..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="course-level">Niveau</Label>
              <Select
                value={form.level}
                onValueChange={(v) => set("level", v)}
              >
                <SelectTrigger id="course-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
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
                min={0}
                value={form.durationHours}
                onChange={(e) => set("durationHours", e.target.value)}
                placeholder="60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="course-published" className="cursor-pointer">
                Publiée
              </Label>
              <p className="text-xs text-muted-foreground">
                Les formations non publiées restent en brouillon.
              </p>
            </div>
            <Switch
              id="course-published"
              checked={form.isPublished}
              onCheckedChange={(v) => set("isPublished", v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
