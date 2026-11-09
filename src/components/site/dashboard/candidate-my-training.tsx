"use client";

import * as React from "react";
import {
  GraduationCap,
  BookOpen,
  PlayCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Clock,
  Layers,
  User,
  FileText,
  Award,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useSiteRouter, type SiteRoute } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type EnrollmentStatus = "Active" | "Completed" | "Cancelled" | "Paused";

interface CourseListItem {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  level: CourseLevel;
  imageUrl: string | null;
  durationHours: number | null;
  isPublished: boolean;
  trainerId: string | null;
  _count: { modules: number };
  trainer: { firstName: string | null; lastName: string | null } | null;
}

interface EnrolledCourseLite {
  id: string;
  title: string;
  level: CourseLevel;
}

interface EnrollmentLite {
  id: string;
  candidateId: string;
  courseId: string;
  status: EnrollmentStatus;
  progressPct: number;
  enrolledAt: string;
  completedAt: string | null;
  course: EnrolledCourseLite;
}

interface CatalogResponse {
  courses: CourseListItem[];
  enrollments: EnrollmentLite[];
}

interface LessonResource {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string | null;
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  durationMin: number | null;
  order: number;
  resources: LessonResource[];
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

interface ExerciseLite {
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
  imageUrl: string | null;
  durationHours: number | null;
  isPublished: boolean;
  trainerId: string | null;
  modules: CourseModule[];
  exercises: ExerciseLite[];
  trainer: { firstName: string | null; lastName: string | null } | null;
}

interface EnrollmentDetail {
  id: string;
  status: EnrollmentStatus;
  progressPct: number;
  enrolledAt: string;
  completedAt: string | null;
}

interface CourseDetailResponse {
  course: CourseDetail;
  enrollment: EnrollmentDetail | null;
  attempts: { id: string; exerciseId: string; score: number; maxScore: number; passed: boolean }[];
}

type NavigateFn = (
  route: SiteRoute,
  params?: Record<string, string>
) => void;

// ─── Level helpers ──────────────────────────────────────────────────────────

const LEVEL_BADGE_CLASS: Record<CourseLevel, string> = {
  A1: "bg-brand/10 text-brand border-brand/20",
  A2: "bg-brand-green/15 text-brand-green border-brand-green/25",
  B1: "bg-navy/10 text-navy border-navy/20",
  B2: "bg-italian-red/10 text-italian-red border-italian-red/20",
  C1: "bg-purple-100 text-purple-700 border-purple-200",
  C2: "bg-amber-100 text-amber-800 border-amber-200",
};

const LEVEL_LABELS: Record<CourseLevel, string> = {
  A1: "A1 — Débutant",
  A2: "A2 — Élémentaire",
  B1: "B1 — Intermédiaire",
  B2: "B2 — Avancé",
  C1: "C1 — Autonome",
  C2: "C2 — Maîtrise",
};

function LevelBadge({ level }: { level: CourseLevel }) {
  return (
    <Badge
      variant="outline"
      className={`shrink-0 font-semibold ${LEVEL_BADGE_CLASS[level]}`}
      title={LEVEL_LABELS[level]}
    >
      {level}
    </Badge>
  );
}

function formatDuration(hours: number | null): string {
  if (hours === null) return "Durée non renseignée";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours} h`;
}

function formatLessonDuration(min: number | null): string {
  if (min === null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function trainerName(
  t: { firstName: string | null; lastName: string | null } | null
): string {
  if (!t) return "Formateur non assigné";
  const parts = [t.firstName, t.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Formateur non assigné";
}

// ─── YouTube embed helper ───────────────────────────────────────────────────

function toYouTubeEmbed(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export function CandidateMyTraining() {
  const { navigate, params } = useSiteRouter();
  const courseIdParam = params.get("course");

  if (courseIdParam) {
    return <CourseViewer courseId={courseIdParam} navigate={navigate} />;
  }
  return <CatalogView navigate={navigate} />;
}

// ─── Catalog view ───────────────────────────────────────────────────────────

function CatalogView({ navigate }: { navigate: NavigateFn }) {
  const { toast } = useToast();
  const [data, setData] = React.useState<CatalogResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/candidate/courses", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(d.error || "Impossible de charger le catalogue.");
        }
        return (await res.json()) as CatalogResponse;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enrollmentByCourse = React.useMemo(() => {
    const map = new Map<string, EnrollmentLite>();
    for (const e of data?.enrollments ?? []) {
      map.set(e.courseId, e);
    }
    return map;
  }, [data]);

  const handleEnroll = async (courseId: string, courseTitle: string) => {
    setEnrollingId(courseId);
    try {
      const res = await fetch("/api/candidate/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(d.error || "Inscription impossible.");
      }
      toast({
        title: "Inscription réussie",
        description: `Vous êtes inscrit à « ${courseTitle} ».`,
      });
      // Refresh catalog to reflect the new enrollment.
      const refreshed = await fetch("/api/candidate/courses", {
        credentials: "include",
      });
      if (refreshed.ok) {
        const next = (await refreshed.json()) as CatalogResponse;
        setData(next);
      }
    } catch (e: unknown) {
      toast({
        title: "Inscription impossible",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) {
    return <CatalogSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const courses = data?.courses ?? [];
  const enrollments = data?.enrollments ?? [];

  return (
    <div className="space-y-10">
      <section aria-labelledby="my-trainings-title">
        <div className="mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-brand" />
          <h2
            id="my-trainings-title"
            className="text-xl font-semibold tracking-tight"
          >
            Mes formations
          </h2>
        </div>
        {enrollments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Aucune formation en cours</p>
                <p className="text-sm text-muted-foreground">
                  Parcourez le catalogue ci-dessous pour démarrer votre
                  apprentissage de l&apos;italien.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => (
              <EnrolledCourseCard
                key={e.id}
                enrollment={e}
                onContinue={() =>
                  navigate("dashboard", {
                    section: "training",
                    course: e.courseId,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section aria-labelledby="catalog-title">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand" />
          <h2
            id="catalog-title"
            className="text-xl font-semibold tracking-tight"
          >
            Catalogue des formations
          </h2>
        </div>
        {courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune formation publiée pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const enrolled = enrollmentByCourse.get(c.id);
              return (
                <CourseCatalogCard
                  key={c.id}
                  course={c}
                  enrolled={!!enrolled}
                  enrolling={enrollingId === c.id}
                  onAction={() => {
                    if (enrolled) {
                      navigate("dashboard", {
                        section: "training",
                        course: c.id,
                      });
                    } else {
                      void handleEnroll(c.id, c.title);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EnrolledCourseCard({
  enrollment,
  onContinue,
}: {
  enrollment: EnrollmentLite;
  onContinue: () => void;
}) {
  const isCompleted = enrollment.status === "Completed";
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <LevelBadge level={enrollment.course.level} />
          <h3 className="mt-2 truncate font-semibold" title={enrollment.course.title}>
            {enrollment.course.title}
          </h3>
        </div>
        {isCompleted && (
          <Badge className="shrink-0 bg-brand-green text-white">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Terminée
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Progression</span>
          <span className="font-medium text-foreground">
            {enrollment.progressPct}%
          </span>
        </div>
        <Progress value={enrollment.progressPct} className="h-2" />
      </div>
      <Button onClick={onContinue} className="mt-auto w-full">
        Continuer
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
}

function CourseCatalogCard({
  course,
  enrolled,
  enrolling,
  onAction,
}: {
  course: CourseListItem;
  enrolled: boolean;
  enrolling: boolean;
  onAction: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 overflow-hidden p-0">
      {course.imageUrl ? (
        <img
          src={course.imageUrl}
          alt=""
          className="h-32 w-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <div
          className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-brand/10 to-navy/10"
          aria-hidden="true"
        >
          <GraduationCap className="h-10 w-10 text-brand/40" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5 pt-0">
        <div className="flex items-start justify-between gap-2">
          <LevelBadge level={course.level} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(course.durationHours)}
          </span>
        </div>
        <div>
          <h3 className="font-semibold leading-tight">{course.title}</h3>
          {course.subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">
              {course.subtitle}
            </p>
          )}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {course.description}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {course._count.modules}{" "}
            {course._count.modules > 1 ? "modules" : "module"}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {trainerName(course.trainer)}
          </span>
        </div>
        <div className="mt-auto pt-1">
          <Button
            onClick={onAction}
            disabled={enrolling}
            variant={enrolled ? "default" : "outline"}
            className="w-full"
          >
            {enrolling ? (
              "Inscription…"
            ) : enrolled ? (
              <>
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "S'inscrire"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-10">
      <section>
        <Skeleton className="mb-4 h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </section>
      <Separator />
      <section>
        <Skeleton className="mb-4 h-7 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Course viewer ──────────────────────────────────────────────────────────

function CourseViewer({
  courseId,
  navigate,
}: {
  courseId: string;
  navigate: NavigateFn;
}) {
  const { toast } = useToast();
  const [data, setData] = React.useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = React.useState<Set<string>>(
    () => new Set()
  );
  const [openLessonId, setOpenLessonId] = React.useState<string | null>(null);
  const [progressPct, setProgressPct] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/candidate/courses/${encodeURIComponent(courseId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(d.error || "Formation introuvable.");
        }
        return (await res.json()) as CourseDetailResponse;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setProgressPct(d.enrollment?.progressPct ?? 0);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const course = data?.course;
  const enrollment = data?.enrollment;

  const allLessons = React.useMemo(() => {
    if (!course) return [];
    return course.modules
      .flatMap((m) => m.lessons)
      .sort((a, b) => a.order - b.order);
  }, [course]);
  const totalLessons = allLessons.length;

  const pushProgress = React.useCallback(
    async (pct: number) => {
      if (!enrollment) return;
      setSaving(true);
      try {
        const res = await fetch("/api/candidate/progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ courseId, progressPct: pct }),
        });
        const d = (await res.json().catch(() => ({}))) as {
          error?: string;
          enrollment?: EnrollmentDetail;
        };
        if (!res.ok) {
          throw new Error(d.error || "Impossible d'enregistrer la progression.");
        }
        if (d.enrollment) {
          setData((prev) =>
            prev ? { ...prev, enrollment: d.enrollment as EnrollmentDetail } : prev
          );
          if (d.enrollment.status === "Completed" && pct >= 100) {
            toast({
              title: "Formation terminée",
              description:
                "Félicitations, vous avez complété cette formation.",
            });
          }
        }
      } catch (e: unknown) {
        toast({
          title: "Progression non enregistrée",
          description:
            e instanceof Error ? e.message : "Une erreur est survenue.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [courseId, enrollment, toast]
  );

  const handleMarkComplete = (lessonId: string) => {
    if (completedLessons.has(lessonId)) return;
    const next = new Set(completedLessons);
    next.add(lessonId);
    const pct =
      totalLessons > 0
        ? Math.round((next.size / totalLessons) * 100)
        : 0;
    setCompletedLessons(next);
    setProgressPct(pct);
    void pushProgress(pct);
  };

  if (loading) {
    return <ViewerSkeleton />;
  }

  if (error || !course) {
    return (
      <div className="space-y-4">
        <BackButton navigate={navigate} />
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error ?? "Formation introuvable."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isEnrolled = !!enrollment;

  return (
    <div className="space-y-6">
      <BackButton navigate={navigate} />

      {/* Header */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={course.level} />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(course.durationHours)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {course.modules.length}{" "}
              {course.modules.length > 1 ? "modules" : "module"}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {trainerName(course.trainer)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
            {course.subtitle && (
              <p className="mt-1 text-muted-foreground">{course.subtitle}</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{course.description}</p>
          {isEnrolled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Award className="h-4 w-4 text-brand" />
                  Votre progression
                </span>
                <span className="text-muted-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2.5" />
              {saving && (
                <p className="text-xs text-muted-foreground">
                  Enregistrement…
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {!isEnrolled && (
        <Alert>
          <BookOpen className="h-4 w-4" />
          <AlertTitle>Vous n'êtes pas inscrit</AlertTitle>
          <AlertDescription>
            Inscrivez-vous à cette formation depuis le catalogue pour suivre
            votre progression et passer les examens.
          </AlertDescription>
        </Alert>
      )}

      {/* Modules accordion */}
      <section aria-labelledby="modules-title">
        <h2
          id="modules-title"
          className="mb-3 flex items-center gap-2 text-lg font-semibold"
        >
          <BookOpen className="h-5 w-5 text-brand" />
          Contenu de la formation
        </h2>
        {course.modules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun module publié pour cette formation.
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {course.modules
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((module, idx) => {
                const moduleLessons = module.lessons.length;
                const completedInModule = module.lessons.filter((l) =>
                  completedLessons.has(l.id)
                ).length;
                return (
                  <AccordionItem
                    key={module.id}
                    value={module.id}
                    className="overflow-hidden rounded-lg border bg-card"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex flex-1 items-center gap-3 pr-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                          {idx + 1}
                        </span>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{module.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {moduleLessons}{" "}
                            {moduleLessons > 1 ? "leçons" : "leçon"}
                            {moduleLessons > 0 &&
                              ` · ${completedInModule}/${moduleLessons} vues`}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {module.description && (
                        <p className="mb-3 text-sm text-muted-foreground">
                          {module.description}
                        </p>
                      )}
                      {moduleLessons === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aucune leçon dans ce module.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {module.lessons
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((lesson) => (
                              <LessonRow
                                key={lesson.id}
                                lesson={lesson}
                                isOpen={openLessonId === lesson.id}
                                isCompleted={completedLessons.has(lesson.id)}
                                canComplete={isEnrolled}
                                onToggle={() =>
                                  setOpenLessonId((prev) =>
                                    prev === lesson.id ? null : lesson.id
                                  )
                                }
                                onMarkComplete={() =>
                                  handleMarkComplete(lesson.id)
                                }
                              />
                            ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
          </Accordion>
        )}
      </section>

      {/* Exam section */}
      {course.exercises.length > 0 && (
        <section aria-labelledby="exam-title">
          <h2
            id="exam-title"
            className="mb-3 flex items-center gap-2 text-lg font-semibold"
          >
            <FileText className="h-5 w-5 text-brand" />
            Examens
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {course.exercises.map((ex) => {
              const attempts = data?.attempts.filter(
                (a) => a.exerciseId === ex.id
              ) ?? [];
              const lastAttempt = attempts[0];
              return (
                <Card key={ex.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{ex.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.type === "Exam" ? "Examen final" : "Exercice"}
                        {ex.passingScore !== null
                          ? ` · Score requis : ${ex.passingScore}%`
                          : ""}
                        {ex.timeLimitMin !== null
                          ? ` · ${ex.timeLimitMin} min`
                          : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <Award className="mr-1 h-3.5 w-3.5" />
                      {ex.type === "Exam" ? "Examen" : "Quiz"}
                    </Badge>
                  </div>
                  {lastAttempt && (
                    <p className="text-xs text-muted-foreground">
                      Dernier essai : {lastAttempt.score}/{lastAttempt.maxScore}{" "}
                      {lastAttempt.passed ? "(réussi)" : "(échec)"}
                    </p>
                  )}
                  <Button
                    className="mt-auto w-full"
                    onClick={() =>
                      navigate("dashboard", {
                        section: "exams",
                        course: courseId,
                      })
                    }
                  >
                    Passer l&apos;examen
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function BackButton({ navigate }: { navigate: NavigateFn }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("dashboard", { section: "training" })}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Retour
    </Button>
  );
}

function LessonRow({
  lesson,
  isOpen,
  isCompleted,
  canComplete,
  onToggle,
  onMarkComplete,
}: {
  lesson: Lesson;
  isOpen: boolean;
  isCompleted: boolean;
  canComplete: boolean;
  onToggle: () => void;
  onMarkComplete: () => void;
}) {
  const embed = lesson.videoUrl ? toYouTubeEmbed(lesson.videoUrl) : null;
  return (
    <li className="rounded-md border bg-background">
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-3 text-left">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isCompleted
                ? "bg-brand-green/15 text-brand-green"
                : "bg-muted text-muted-foreground"
            }`}
            aria-hidden="true"
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{lesson.title}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatLessonDuration(lesson.durationMin)}
              {lesson.videoUrl && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <PlayCircle className="h-3 w-3" />
                    Vidéo
                  </span>
                </>
              )}
              {lesson.resources.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{lesson.resources.length} ressource(s)</span>
                </>
              )}
            </span>
          </span>
        </div>
        <Button
          type="button"
          variant={isOpen ? "secondary" : "outline"}
          size="sm"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`lesson-content-${lesson.id}`}
        >
          {isOpen ? "Masquer" : "Voir"}
        </Button>
      </div>
      {isOpen && (
        <div
          id={`lesson-content-${lesson.id}`}
          className="border-t bg-muted/30 p-4"
        >
          {embed && (
            <div className="mb-4 overflow-hidden rounded-md bg-black">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={embed}
                  title={lesson.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          )}
          {!embed && lesson.videoUrl && (
            <video
              src={lesson.videoUrl}
              controls
              className="mb-4 w-full rounded-md bg-black"
              preload="metadata"
            >
              Votre navigateur ne prend pas en charge la lecture vidéo.
            </video>
          )}
          {lesson.content ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {lesson.content}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun contenu textuel pour cette leçon.
            </p>
          )}
          {lesson.resources.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ressources
              </p>
              <ul className="space-y-1">
                {lesson.resources.map((r) => (
                  <li key={r.id}>
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-brand hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant={isCompleted ? "secondary" : "default"}
              disabled={!canComplete || isCompleted}
              onClick={onMarkComplete}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Leçon vue
                </>
              ) : (
                "Marquer comme vu"
              )}
            </Button>
          </div>
          {!canComplete && (
            <p className="mt-2 text-right text-xs text-muted-foreground">
              Inscrivez-vous pour suivre votre progression.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function ViewerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-7 w-56" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
