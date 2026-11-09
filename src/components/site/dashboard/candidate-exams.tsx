"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  Loader2,
  Send,
  Timer,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSiteRouter } from "@/lib/site-router";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type QuestionType =
  | "MCQ"
  | "TrueFalse"
  | "Vocabulary"
  | "Translation"
  | "ReadingComprehension"
  | "ListeningComprehension";

type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface ExamCourse {
  id: string;
  title: string;
  level: CourseLevel;
}

interface ExamListItem {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  type: string;
  passingScore: number | null;
  timeLimitMin: number | null;
  order: number;
  course: ExamCourse;
}

interface AttemptExercise {
  id: string;
  title: string;
  courseId: string;
}

interface AttemptListItem {
  id: string;
  exerciseId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
  exercise: AttemptExercise;
}

interface ExamsListResponse {
  exams: ExamListItem[];
  attempts: AttemptListItem[];
}

interface ExamQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string;
  points: number;
  order: number;
}

interface ExamDetailCourse {
  id: string;
  title: string;
}

interface ExamDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  passingScore: number | null;
  timeLimitMin: number | null;
  course: ExamDetailCourse;
  questions: ExamQuestion[];
}

interface ExamDetailResponse {
  exercise: ExamDetail;
}

interface Explanation {
  questionId: string;
  explanation: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

interface AttemptResult {
  id: string;
  score: number;
  maxScore: number;
  passed: boolean;
  completedAt: string | null;
}

interface SubmitResponse {
  attempt: AttemptResult;
  explanations: Explanation[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: "QCM",
  TrueFalse: "Vrai / Faux",
  Vocabulary: "Vocabulaire",
  Translation: "Traduction",
  ReadingComprehension: "Compréhension écrite",
  ListeningComprehension: "Compréhension orale",
};

function exerciseTypeLabel(type: string): string {
  return type === "Exam" ? "Examen" : "Exercice";
}

function parseOptions(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore malformed JSON
  }
  return [];
}

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Main component ─────────────────────────────────────────────────────────

export function CandidateExams() {
  const { params, navigate } = useSiteRouter();
  const examId = params.get("exam");

  if (examId) {
    return (
      <ExamRunner
        examId={examId}
        onExit={() => navigate("dashboard", { section: "exams" })}
      />
    );
  }

  return <ExamsListView />;
}

// ─── List view ──────────────────────────────────────────────────────────────

function ExamsListView() {
  const { navigate } = useSiteRouter();
  const [data, setData] = React.useState<ExamsListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/candidate/exams", {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(d.error || "Échec du chargement des examens.");
        }
        const json = (await res.json()) as ExamsListResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Une erreur est survenue."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Mes examens
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Évaluez votre niveau en italien et suivez vos résultats de
          certification.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ─── Available exams ─────────────────────────────────── */}
      <section aria-labelledby="exams-available-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-brand" />
          <h2
            id="exams-available-title"
            className="text-lg font-semibold text-navy"
          >
            Examens disponibles
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-9 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data || data.exams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                <ClipboardCheck className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-navy">
                Aucun examen disponible
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Inscrivez-vous à une formation pour accéder à ses examens
                d'évaluation et obtenir vos certificats.
              </p>
              <Button
                className="mt-4 bg-brand text-white hover:bg-brand/90"
                onClick={() => navigate("dashboard", { section: "training" })}
              >
                Voir mes formations
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.exams.map((exam) => (
              <li key={exam.id}>
                <ExamCard
                  exam={exam}
                  onStart={() =>
                    navigate("dashboard", {
                      section: "exams",
                      exam: exam.id,
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      {/* ─── Past attempts ───────────────────────────────────── */}
      <section aria-labelledby="exams-attempts-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand" />
          <h2
            id="exams-attempts-title"
            className="text-lg font-semibold text-navy"
          >
            Mes tentatives
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data || data.attempts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas encore passé d'examen. Vos tentatives
                apparaîtront ici avec votre score et le détail des résultats.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {data.attempts.map((attempt) => (
              <li key={attempt.id}>
                <AttemptCard
                  attempt={attempt}
                  onSeeCertificate={() =>
                    navigate("dashboard", { section: "certificates" })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Exam card (list) ───────────────────────────────────────────────────────

function ExamCard({
  exam,
  onStart,
}: {
  exam: ExamListItem;
  onStart: () => void;
}) {
  return (
    <Card className="flex h-full flex-col transition-all hover:shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base text-navy">{exam.title}</CardTitle>
          <Badge
            variant="outline"
            className="shrink-0 border-brand/30 text-brand"
          >
            {exerciseTypeLabel(exam.type)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClipboardCheck className="h-3.5 w-3.5 text-brand" />
          <span className="truncate">{exam.course.title}</span>
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="font-semibold">
            Niveau {exam.course.level}
          </Badge>
          {exam.timeLimitMin ? (
            <Badge
              variant="outline"
              className="border-brand/30 text-brand"
            >
              <Timer className="h-3 w-3" />
              {exam.timeLimitMin} min
            </Badge>
          ) : null}
          {exam.passingScore !== null ? (
            <Badge variant="outline">
              Score requis : {exam.passingScore}%
            </Badge>
          ) : null}
        </div>

        {exam.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {exam.description}
          </p>
        ) : null}

        <div className="mt-auto pt-2">
          <Button
            className="w-full bg-brand text-white hover:bg-brand/90"
            onClick={onStart}
          >
            Passer l'examen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Attempt card (list) ────────────────────────────────────────────────────

function AttemptCard({
  attempt,
  onSeeCertificate,
}: {
  attempt: AttemptListItem;
  onSeeCertificate: () => void;
}) {
  const pct =
    attempt.maxScore > 0
      ? Math.round((attempt.score / attempt.maxScore) * 100)
      : 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h3 className="truncate text-base font-semibold text-navy">
            {attempt.exercise.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {attempt.completedAt
                ? formatDateFr(attempt.completedAt)
                : formatDateFr(attempt.startedAt)}
            </span>
            <span className="font-medium text-foreground">
              Score : {attempt.score}/{attempt.maxScore} ({pct}%)
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {attempt.passed ? (
            <Badge className="bg-brand-green/15 text-brand-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Réussi
            </Badge>
          ) : (
            <Badge className="bg-italian-red/10 text-italian-red">
              <XCircle className="h-3.5 w-3.5" />
              Échoué
            </Badge>
          )}
          {attempt.passed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onSeeCertificate}
            >
              <Award className="mr-1.5 h-3.5 w-3.5" />
              Voir certificat
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Exam runner ────────────────────────────────────────────────────────────

function ExamRunner({
  examId,
  onExit,
}: {
  examId: string;
  onExit: () => void;
}) {
  const { toast } = useToast();
  const [exam, setExam] = React.useState<ExamDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<SubmitResponse | null>(null);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const submittedRef = React.useRef(false);

  // Fetch the exam (questions without answers).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/candidate/exams/${examId}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(d.error || "Échec du chargement de l'examen.");
        }
        const json = (await res.json()) as ExamDetailResponse;
        if (cancelled) return;
        setExam(json.exercise);
        if (json.exercise.timeLimitMin) {
          setRemaining(json.exercise.timeLimitMin * 60);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Une erreur est survenue."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const submit = React.useCallback(
    async (reason: "manual" | "timeout") => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const payload = {
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
          })),
        };
        const res = await fetch(`/api/candidate/exams/${examId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(d.error || "Échec de la soumission de l'examen.");
        }
        const json = (await res.json()) as SubmitResponse;
        setResult(json);
        if (reason === "timeout") {
          toast({
            title: "Temps écoulé",
            description:
              "Le délai imparti est terminé : votre examen a été soumis automatiquement.",
          });
        } else {
          toast({
            title: "Examen soumis",
            description: "Votre examen a été corrigé avec succès.",
          });
        }
      } catch (e) {
        submittedRef.current = false;
        const msg =
          e instanceof Error ? e.message : "Une erreur est survenue.";
        setError(msg);
        toast({
          title: "Soumission impossible",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [answers, examId, toast]
  );

  // Keep a ref to the latest submit so the timer effect does not restart on
  // every answer change.
  const submitRef = React.useRef(submit);
  React.useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // Countdown timer — pauses once results are displayed, auto-submits at 0.
  React.useEffect(() => {
    if (result) return;
    if (remaining === null) return;
    if (remaining <= 0) {
      void submitRef.current("timeout");
      return;
    }
    const t = setTimeout(() => {
      setRemaining((r) => (r === null ? null : Math.max(0, r - 1)));
    }, 1000);
    return () => clearTimeout(t);
  }, [remaining, result]);

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────
  if (error && !exam) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour aux examens
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Impossible de démarrer l'examen</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  // ─── Results ─────────────────────────────────────────────
  if (result) {
    return (
      <ExamResults
        exam={exam}
        answers={answers}
        result={result}
        onExit={onExit}
      />
    );
  }

  // ─── Exam in progress ────────────────────────────────────
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exam.questions.length;
  const progressValue =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const lowTime = remaining !== null && remaining < 60;

  return (
    <div className="space-y-6 pb-4">
      {/* Top bar: quit + timer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Quitter
        </Button>
        {remaining !== null ? (
          <Badge
            className={cn(
              "px-3 py-1.5 text-sm font-bold tabular-nums",
              lowTime
                ? "bg-italian-red text-white"
                : "bg-navy text-white"
            )}
          >
            <Timer className="h-4 w-4" />
            {formatTime(remaining)}
          </Badge>
        ) : null}
      </div>

      {/* Exam header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-navy">{exam.title}</CardTitle>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClipboardCheck className="h-3.5 w-3.5 text-brand" />
            {exam.course.title}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {exam.timeLimitMin ? (
              <Badge variant="outline" className="border-brand/30 text-brand">
                <Timer className="h-3 w-3" />
                Durée : {exam.timeLimitMin} min
              </Badge>
            ) : null}
            {exam.passingScore !== null ? (
              <Badge variant="outline">
                Score requis : {exam.passingScore}%
              </Badge>
            ) : null}
            <Badge variant="secondary">
              {totalQuestions} question{totalQuestions > 1 ? "s" : ""}
            </Badge>
          </div>
          {exam.description ? (
            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
              {exam.description}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {totalQuestions === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Aucune question</AlertTitle>
          <AlertDescription>
            Cet examen ne contient pas encore de questions. Veuillez réessayer
            ultérieurement.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {exam.questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              value={answers[q.id] ?? ""}
              onChange={(val) =>
                setAnswers((prev) => ({ ...prev, [q.id]: val }))
              }
            />
          ))}
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-20 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                {answeredCount} / {totalQuestions} question
                {totalQuestions > 1 ? "s" : ""} répondue
                {answeredCount > 1 ? "s" : ""}
              </span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
          <Button
            className="bg-brand text-white hover:bg-brand/90 sm:w-auto"
            disabled={submitting || totalQuestions === 0}
            onClick={() => void submit("manual")}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Correction en cours…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Soumettre
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Question card ──────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: ExamQuestion;
  index: number;
  value: string;
  onChange: (val: string) => void;
}) {
  const options = parseOptions(question.options);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base text-navy">
            Question {index + 1}
          </CardTitle>
          <div className="flex shrink-0 gap-1.5">
            <Badge variant="outline" className="border-brand/30 text-brand">
              {QUESTION_TYPE_LABELS[question.type] ?? question.type}
            </Badge>
            <Badge variant="secondary">
              {question.points} pt{question.points > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        <p className="whitespace-pre-line pt-1 text-sm text-foreground">
          {question.prompt}
        </p>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={onChange}
          aria-label={`Question ${index + 1}`}
        >
          {options.map((opt, oi) => {
            const id = `${question.id}-${oi}`;
            return (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                  value === String(oi)
                    ? "border-brand bg-brand/5"
                    : "border-border hover:bg-accent"
                )}
              >
                <RadioGroupItem value={String(oi)} id={id} />
                <Label
                  htmlFor={id}
                  className="flex-1 cursor-pointer font-normal text-foreground"
                >
                  {opt}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

// ─── Results ────────────────────────────────────────────────────────────────

function ExamResults({
  exam,
  answers,
  result,
  onExit,
}: {
  exam: ExamDetail;
  answers: Record<string, string>;
  result: SubmitResponse;
  onExit: () => void;
}) {
  const { attempt, explanations } = result;
  const pct =
    attempt.maxScore > 0
      ? Math.round((attempt.score / attempt.maxScore) * 100)
      : 0;
  const passed = attempt.passed;

  return (
    <div className="space-y-6">
      {/* Score summary */}
      <Card
        className={cn(
          "border-2",
          passed ? "border-brand-green/40" : "border-italian-red/30"
        )}
      >
        <CardHeader>
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="space-y-1">
              <CardTitle className="text-xl text-navy">{exam.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {exam.course.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {passed ? (
                <Badge className="bg-brand-green/15 text-brand-green">
                  <CheckCircle2 className="h-4 w-4" />
                  Réussi
                </Badge>
              ) : (
                <Badge className="bg-italian-red/10 text-italian-red">
                  <XCircle className="h-4 w-4" />
                  Échoué
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className={cn(
                "flex h-28 w-28 flex-col items-center justify-center rounded-full border-4",
                passed
                  ? "border-brand-green/40 text-brand-green"
                  : "border-italian-red/30 text-italian-red"
              )}
            >
              <span className="text-3xl font-bold tabular-nums">{pct}%</span>
              <span className="text-xs font-medium text-muted-foreground">
                {attempt.score}/{attempt.maxScore} pts
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {passed
                ? "Félicitations ! Vous avez réussi cet examen. Votre certificat sera disponible dans la section « Mes certificats »."
                : "Vous n'avez pas atteint le score requis. Vous pouvez repasser l'examen à tout moment."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed review */}
      <section aria-labelledby="review-title" className="space-y-4">
        <h2
          id="review-title"
          className="flex items-center gap-2 text-lg font-semibold text-navy"
        >
          <ClipboardCheck className="h-5 w-5 text-brand" />
          Correction détaillée
        </h2>

        <div className="space-y-4">
          {exam.questions.map((q, idx) => {
            const expl = explanations.find(
              (e) => e.questionId === q.id
            );
            const options = parseOptions(q.options);
            const candidateIdx = answers[q.id];
            const correctIdx = expl?.correctAnswer;
            const isCorrect = expl?.isCorrect ?? false;

            return (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base text-navy">
                      Question {idx + 1}
                    </CardTitle>
                    <Badge
                      className={cn(
                        "shrink-0",
                        isCorrect
                          ? "bg-brand-green/15 text-brand-green"
                          : "bg-italian-red/10 text-italian-red"
                      )}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          Incorrect
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-line pt-1 text-sm text-foreground">
                    {q.prompt}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {options.map((opt, oi) => {
                    const isCandidate = String(oi) === candidateIdx;
                    const isCorrectOpt = String(oi) === correctIdx;
                    return (
                      <div
                        key={oi}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 text-sm",
                          isCorrectOpt &&
                            "border-brand-green bg-brand-green/5",
                          isCandidate &&
                            !isCorrectOpt &&
                            "border-italian-red bg-italian-red/5",
                          !isCorrectOpt &&
                            !isCandidate &&
                            "border-border"
                        )}
                      >
                        <ResultIcon
                          isCorrectOpt={isCorrectOpt}
                          isCandidate={isCandidate}
                        />
                        <span
                          className={cn(
                            isCorrectOpt && "font-medium text-brand-green",
                            isCandidate &&
                              !isCorrectOpt &&
                              "text-italian-red"
                          )}
                        >
                          {opt}
                        </span>
                        {isCorrectOpt ? (
                          <Badge
                            variant="outline"
                            className="ml-auto border-brand-green/40 text-brand-green"
                          >
                            Bonne réponse
                          </Badge>
                        ) : isCandidate ? (
                          <Badge
                            variant="outline"
                            className="ml-auto border-italian-red/40 text-italian-red"
                          >
                            Votre réponse
                          </Badge>
                        ) : null}
                      </div>
                    );
                  })}

                  {expl?.explanation ? (
                    <Alert className="mt-2 border-brand/20 bg-brand/5">
                      <AlertCircle className="h-4 w-4 text-brand" />
                      <AlertDescription className="text-sm text-foreground">
                        {expl.explanation}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          className="bg-brand text-white hover:bg-brand/90"
          onClick={onExit}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour aux examens
        </Button>
      </div>
    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function ResultIcon({
  isCorrectOpt,
  isCandidate,
}: {
  isCorrectOpt: boolean;
  isCandidate: boolean;
}) {
  const Icon: LucideIcon = isCorrectOpt
    ? CheckCircle2
    : isCandidate
    ? XCircle
    : Circle;
  return (
    <Icon
      className={cn(
        "h-4 w-4 shrink-0",
        isCorrectOpt
          ? "text-brand-green"
          : isCandidate
          ? "text-italian-red"
          : "text-muted-foreground/50"
      )}
      aria-hidden
    />
  );
}
