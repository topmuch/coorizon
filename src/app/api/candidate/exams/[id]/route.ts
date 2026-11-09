import { NextRequest } from "next/server";
import { EnrollmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";
import { fireEvent, EVENTS } from "@/lib/automation";
import { notify } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/candidate/exams/[id]
 *
 * Starts an exam: returns the exercise and its questions WITHOUT the
 * `answer` and `explanation` fields (so the client never receives the
 * correct answers before submission).
 *
 * - 404 if the exercise does not exist.
 * - 403 if the candidate is not enrolled in the exercise's course.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;
    const { id } = await params;

    const exercise = await db.exercise.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
        course: { select: { id: true, title: true } },
      },
    });

    if (!exercise) {
      return Response.json(
        { error: "Examen introuvable." },
        { status: 404 }
      );
    }

    // The candidate must be enrolled in the course to take the exam.
    const enrollment = await db.enrollment.findFirst({
      where: {
        candidateId,
        courseId: exercise.courseId,
        status: { in: [EnrollmentStatus.Active, EnrollmentStatus.Completed] },
      },
      select: { id: true },
    });
    if (!enrollment) {
      return Response.json(
        {
          error:
            "Vous devez être inscrit à la formation pour passer cet examen.",
        },
        { status: 403 }
      );
    }

    // Strip the answer & explanation fields before sending to the client.
    const sanitizedQuestions = exercise.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
      order: q.order,
    }));

    return Response.json({
      exercise: {
        id: exercise.id,
        title: exercise.title,
        description: exercise.description,
        type: exercise.type,
        passingScore: exercise.passingScore,
        timeLimitMin: exercise.timeLimitMin,
        course: exercise.course,
        questions: sanitizedQuestions,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

interface SubmitAnswer {
  questionId?: unknown;
  answer?: unknown;
}

interface SubmitBody {
  answers?: unknown;
}

/**
 * POST /api/candidate/exams/[id]
 *
 * Submits the candidate's answers for server-side grading. The score is
 * computed here (never trusted from the client) and an ExamAttempt is
 * recorded. Correct answers + explanations are returned only at this point
 * so the candidate can review their performance.
 *
 * Body: { answers: [{ questionId: string, answer: string }] }
 * Response (201): { attempt, explanations }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const candidateId = session.user.id;
    const { id } = await params;

    let body: SubmitBody;
    try {
      body = (await req.json()) as SubmitBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.answers)) {
      return Response.json(
        { error: "Le format des réponses est invalide." },
        { status: 400 }
      );
    }

    // Build a questionId → candidateAnswer map from the submitted payload.
    const answerMap = new Map<string, string>();
    for (const raw of body.answers as SubmitAnswer[]) {
      if (
        raw &&
        typeof raw.questionId === "string" &&
        typeof raw.answer === "string"
      ) {
        answerMap.set(raw.questionId, raw.answer);
      }
    }

    const exercise = await db.exercise.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!exercise) {
      return Response.json(
        { error: "Examen introuvable." },
        { status: 404 }
      );
    }

    // Server-side grading: compare each candidate answer (index string)
    // with the stored correct answer.
    let score = 0;
    let maxScore = 0;
    const gradedAnswers: {
      questionId: string;
      answer: string | null;
      isCorrect: boolean;
    }[] = [];
    const explanations: {
      questionId: string;
      explanation: string | null;
      correctAnswer: string;
      isCorrect: boolean;
    }[] = [];

    for (const q of exercise.questions) {
      maxScore += q.points;
      const candidateAnswer = answerMap.has(q.id)
        ? (answerMap.get(q.id) as string)
        : null;
      const isCorrect = candidateAnswer !== null && candidateAnswer === q.answer;
      if (isCorrect) score += q.points;

      gradedAnswers.push({
        questionId: q.id,
        answer: candidateAnswer,
        isCorrect,
      });
      explanations.push({
        questionId: q.id,
        explanation: q.explanation ?? null,
        correctAnswer: q.answer,
        isCorrect,
      });
    }

    const passingThreshold = exercise.passingScore ?? 70;
    const percentage =
      maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = maxScore > 0 && percentage >= passingThreshold;

    // Resolve the enrollment (for the attempt's enrollmentId link).
    const enrollment = await db.enrollment.findFirst({
      where: {
        candidateId,
        courseId: exercise.courseId,
        status: { in: [EnrollmentStatus.Active, EnrollmentStatus.Completed] },
      },
      select: { id: true },
    });

    const attempt = await db.examAttempt.create({
      data: {
        exerciseId: exercise.id,
        candidateId,
        enrollmentId: enrollment?.id ?? null,
        answers: JSON.stringify(gradedAnswers),
        score,
        maxScore,
        passed,
        completedAt: new Date(),
      },
    });

    await audit({
      actorId: candidateId,
      action: "candidate.exam.submit",
      targetType: "ExamAttempt",
      targetId: attempt.id,
      metadata: { exerciseId: exercise.id, score, maxScore, passed },
      req,
    });

    // Fire the automation event (logs to journal + dispatches to webhooks) and
    // notify the candidate of the result.
    await fireEvent({
      type: passed ? EVENTS.EXAM_PASSED : EVENTS.EXAM_FAILED,
      targetType: "ExamAttempt",
      targetId: attempt.id,
      actorId: session.user.id,
      payload: {
        exerciseId: exercise.id,
        score,
        maxScore,
        passed,
      },
      notifyUserId: candidateId,
      notifyType: passed ? "Success" : "Warning",
      notifyTitle: passed ? "Examen réussi" : "Examen non réussi",
      notifyMessage: passed
        ? `Félicitations ! Vous avez réussi l'examen « ${exercise.title} » avec ${percentage}%.`
        : `Vous n'avez pas réussi l'examen « ${exercise.title} » (${percentage}%). Vous pouvez le repasser.`,
      notifyLink: "/candidate/my-training",
    });

    return Response.json({ attempt, explanations }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
