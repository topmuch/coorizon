"use client";

import * as React from "react";
import {
  AlertTriangle,
  BookOpen,
  Clock,
  FileText,
  Info,
  Layers,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * TrainerLessons — "Leçons & contenu" dashboard section (LOT 6 — Task 6-d).
 *
 * The trainer selects one of their courses, then browses its modules →
 * lessons structure (read-only). Full CRUD on lessons is a planned future
 * enhancement; for LOT 6 the lesson content is managed via seed data.
 *
 * Course list comes from GET /api/trainer/courses.
 * Course detail (modules + lessons) comes from GET /api/trainer/courses/[id].
 */

type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface CourseListItem {
  id: string;
  title: string;
  level: CourseLevel;
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  durationMin: number | null;
  order: number;
  isPublished: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

interface ExerciseRef {
  id: string;
  title: string;
  type: string;
  passingScore: number | null;
  timeLimitMin: number | null;
}

interface CourseDetail {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  level: CourseLevel;
  durationHours: number | null;
  isPublished: boolean;
  modules: Module[];
  exercises: ExerciseRef[];
  _count?: { enrollments: number };
}

export function TrainerLessons() {
  const [courses, setCourses] = React.useState<CourseListItem[]>([]);
  const [coursesLoading, setCoursesLoading] = React.useState(true);
  const [coursesError, setCoursesError] = React.useState<string | null>(null);

  const [selectedId, setSelectedId] = React.useState<string>("");
  const [detail, setDetail] = React.useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  // ---- Load course list ------------------------------------------------
  const loadCourses = React.useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError(null);
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
      const data = (await res.json()) as { courses: CourseListItem[] };
      setCourses(data.courses);
      if (data.courses.length > 0 && !selectedId) {
        setSelectedId(data.courses[0].id);
      }
    } catch (e) {
      setCoursesError(
        e instanceof Error ? e.message : "Une erreur inattendue est survenue."
      );
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  // ---- Load course detail when selection changes -----------------------
  const loadDetail = React.useCallback(async (id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/trainer/courses/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger le contenu de la formation."
        );
      }
      const data = (await res.json()) as { course: CourseDetail };
      setDetail(data.course);
    } catch (e) {
      setDetailError(
        e instanceof Error ? e.message : "Une erreur inattendue est survenue."
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // ---- Render: courses loading -----------------------------------------
  if (coursesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card className="py-5">
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Render: courses error -------------------------------------------
  if (coursesError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Impossible de charger vos formations</AlertTitle>
        <AlertDescription>
          <p>{coursesError}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-fit"
            onClick={() => void loadCourses()}
            aria-label="Réessayer le chargement"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // ---- Render: no courses ----------------------------------------------
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            Leçons &amp; contenu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parcourez la structure de vos cours (modules et leçons).
          </p>
        </div>
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center gap-3 text-center">
            <div
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand"
            >
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-navy">
                Aucune formation à parcourir
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Créez d&apos;abord une formation dans l&apos;onglet « Mes
                formations ».
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalLessons = detail?.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  ) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Leçons &amp; contenu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parcourez la structure de vos cours (modules et leçons).
        </p>
      </div>

      {/* Course selector */}
      <div className="space-y-1.5">
        <label
          htmlFor="course-select"
          className="text-sm font-medium text-navy"
        >
          Choisir une formation
        </label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger id="course-select" className="w-full sm:max-w-md">
            <SelectValue placeholder="Sélectionnez une formation" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title} · {c.level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Read-only note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Mode lecture</AlertTitle>
        <AlertDescription>
          L&apos;édition complète des leçons sera disponible dans une mise à
          jour. Pour le LOT 6, les leçons sont gérées via le contenu seed.
        </AlertDescription>
      </Alert>

      {/* Detail loading */}
      {detailLoading ? (
        <Card className="py-5">
          <CardContent className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : detailError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Impossible de charger le contenu</AlertTitle>
          <AlertDescription>
            <p>{detailError}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-fit"
              onClick={() => void loadDetail(selectedId)}
              aria-label="Réessayer le chargement"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : detail ? (
        <div className="space-y-4">
          {/* Course summary card */}
          <Card className="py-5">
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-navy">
                      {detail.title}
                    </h2>
                    <Badge variant="outline">{detail.level}</Badge>
                    {detail.isPublished ? (
                      <Badge className="bg-brand-green/15 text-brand-green">
                        Publiée
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Brouillon</Badge>
                    )}
                  </div>
                  {detail.subtitle ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {detail.subtitle}
                    </p>
                  ) : null}
                </div>
                {detail.durationHours ? (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {detail.durationHours} h
                  </div>
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">
                {detail.description}
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border bg-surface px-3 py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Layers className="h-3 w-3" />
                    Modules
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-navy">
                    {detail.modules.length}
                  </div>
                </div>
                <div className="rounded-lg border bg-surface px-3 py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    Leçons
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-navy">
                    {totalLessons}
                  </div>
                </div>
                <div className="rounded-lg border bg-surface px-3 py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    Examens
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-navy">
                    {detail.exercises.length}
                  </div>
                </div>
                <div className="rounded-lg border bg-surface px-3 py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    Apprenants
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-navy">
                    {detail._count?.enrollments ?? 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modules → lessons accordion */}
          {detail.modules.length === 0 ? (
            <Card className="py-8">
              <CardContent className="text-center text-sm text-muted-foreground">
                Cette formation ne contient pas encore de module.
              </CardContent>
            </Card>
          ) : (
            <Card className="py-5">
              <CardContent>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Modules &amp; leçons
                </h3>
                <Accordion
                  type="multiple"
                  className="w-full"
                  defaultValue={detail.modules.map((m) => m.id)}
                >
                  {detail.modules.map((module) => (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger>
                        <div className="flex flex-1 items-center gap-3 pr-2 text-left">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-xs font-bold text-brand">
                            {module.order > 0 ? module.order : "•"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-navy">
                              {module.title}
                            </div>
                            <div className="text-xs font-normal text-muted-foreground">
                              {module.lessons.length} leçon
                              {module.lessons.length > 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {module.description ? (
                          <p className="mb-3 text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        ) : null}
                        {module.lessons.length === 0 ? (
                          <p className="rounded-md border border-dashed bg-surface px-3 py-2 text-xs text-muted-foreground">
                            Aucune leçon dans ce module.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {module.lessons.map((lesson) => (
                              <li
                                key={lesson.id}
                                className="flex items-start gap-3 rounded-md border bg-surface px-3 py-2.5"
                              >
                                <PlayCircle
                                  aria-hidden
                                  className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-navy">
                                      {lesson.title}
                                    </span>
                                    {lesson.isPublished ? (
                                      <Badge
                                        variant="outline"
                                        className="border-brand-green/30 text-brand-green"
                                      >
                                        Publiée
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">
                                        Brouillon
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    {lesson.durationMin ? (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {lesson.durationMin} min
                                      </span>
                                    ) : null}
                                    {lesson.videoUrl ? (
                                      <span className="flex items-center gap-1">
                                        <PlayCircle className="h-3 w-3" />
                                        Vidéo
                                      </span>
                                    ) : null}
                                    {lesson.content ? (
                                      <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        Contenu texte
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
