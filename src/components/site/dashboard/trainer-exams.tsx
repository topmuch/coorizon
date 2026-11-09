"use client";

import * as React from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * TrainerExams — "Examens & résultats" dashboard section (LOT 6 — Task 6-d).
 *
 * Two sections:
 *   1. "Mes examens" — list of exercises (with course title, question count,
 *      attempt count, passing score and time limit).
 *   2. "Tentatives récentes" — table of the 50 most recent attempts
 *      (candidate name, exam title, score/maxScore, passed badge, date).
 *
 * Data source: GET /api/trainer/exams.
 */

type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  type: string;
  passingScore: number | null;
  timeLimitMin: number | null;
  order: number;
  createdAt: string;
  course: { title: string; level: CourseLevel };
  _count: { attempts: number; questions: number };
}

interface RecentAttempt {
  id: string;
  score: number;
  maxScore: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
  candidate: { firstName: string | null; lastName: string | null };
  exercise: { title: string };
}

interface ExamsResponse {
  exams: Exam[];
  recentAttempts: RecentAttempt[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function fullName(
  firstName: string | null,
  lastName: string | null
): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full || "Apprenant";
}

function scorePct(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export function TrainerExams() {
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [attempts, setAttempts] = React.useState<RecentAttempt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/exams", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger vos examens."
        );
      }
      const data = (await res.json()) as ExamsResponse;
      setExams(data.exams);
      setAttempts(data.recentAttempts);
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

  // Aggregate stats across exams
  const totalAttempts = exams.reduce(
    (sum, e) => sum + e._count.attempts,
    0
  );
  const totalQuestions = exams.reduce(
    (sum, e) => sum + e._count.questions,
    0
  );

  // ---- Loading skeleton ------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <Card className="py-5">
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card className="py-5">
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Error state -----------------------------------------------------
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Impossible de charger vos examens</AlertTitle>
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
          <h1 className="text-2xl font-bold text-navy">Examens &amp; résultats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez vos exercices et les tentatives récentes de vos
            apprenants.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {exams.length} examen{exams.length > 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            {totalQuestions} question{totalQuestions > 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            {totalAttempts} tentative{totalAttempts > 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Section 1 — Mes examens */}
      <section aria-labelledby="exams-title">
        <h2
          id="exams-title"
          className="mb-3 text-lg font-semibold text-navy"
        >
          Mes examens
        </h2>
        {exams.length === 0 ? (
          <Card className="py-10">
            <CardContent className="flex flex-col items-center justify-center gap-3 text-center">
              <div
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand"
              >
                <ClipboardCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-navy">
                  Aucun examen créé
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les exercices rattachés à vos formations apparaîtront ici.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {exams.map((exam) => (
              <Card key={exam.id} className="py-5">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-navy">
                          {exam.title}
                        </h3>
                        <Badge variant="outline">
                          {exam.type === "Exam" ? "Examen" : "Exercice"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {exam.course.title} · {exam.course.level}
                      </p>
                    </div>
                  </div>

                  {exam.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {exam.description}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border bg-surface px-3 py-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Questions
                      </div>
                      <div className="mt-0.5 text-lg font-bold text-navy">
                        {exam._count.questions}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-surface px-3 py-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Tentatives
                      </div>
                      <div className="mt-0.5 text-lg font-bold text-navy">
                        {exam._count.attempts}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                    {exam.passingScore !== null ? (
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-brand" />
                        Réussite : {exam.passingScore}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-muted-foreground" />
                        Sans seuil
                      </span>
                    )}
                    <Separator orientation="vertical" className="h-4" />
                    {exam.timeLimitMin !== null ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.timeLimitMin} min
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Sans limite
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Section 2 — Tentatives récentes */}
      <section aria-labelledby="recent-title">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="recent-title"
            className="text-lg font-semibold text-navy"
          >
            Tentatives récentes
          </h2>
          <span className="text-sm text-muted-foreground">
            {attempts.length} tentative{attempts.length > 1 ? "s" : ""}
          </span>
        </div>

        {attempts.length === 0 ? (
          <Card className="py-10">
            <CardContent className="flex flex-col items-center justify-center gap-3 text-center">
              <div
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <Clock className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-navy">
                  Aucune tentative pour le moment
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les résultats de vos apprenants apparaîtront ici dès qu&apos;ils
                  passeront un examen.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="py-0">
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apprenant</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Examen
                      </TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead className="hidden md:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Terminé le
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((a) => {
                      const pct = scorePct(a.score, a.maxScore);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy"
                              >
                                {(
                                  (a.candidate.firstName?.[0] ?? "") +
                                  (a.candidate.lastName?.[0] ?? "")
                                )
                                  .toUpperCase()
                                  .charAt(0) || "?"}
                              </span>
                              <span className="truncate text-sm font-medium text-navy">
                                {fullName(
                                  a.candidate.firstName,
                                  a.candidate.lastName
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="truncate text-sm">
                              {a.exercise.title}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-semibold text-navy">
                                {pct}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({a.score}/{a.maxScore})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {a.passed ? (
                              <Badge className="bg-brand-green/15 text-brand-green">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Réussi
                              </Badge>
                            ) : (
                              <Badge className="bg-italian-red/15 text-italian-red">
                                <XCircle className="mr-1 h-3 w-3" />
                                Échec
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {formatDate(a.completedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
