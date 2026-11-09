import { NextRequest } from "next/server";
import { CourseLevel, type Prisma } from "@prisma/client";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";
import { ROLES } from "@/lib/permissions";
import { fireEvent, EVENTS } from "@/lib/automation";

/**
 * Certificate generation API (LOT 6 — E-learning).
 *
 * Certificates are INTERNAL attestations of course completion on the
 * COORIZON platform. They are NOT official certifications (CILS, CELI, PLIDA).
 */

// ─── Helpers ─────────────────────────────────────────────────────────────

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function random6(): string {
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    out += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return out;
}

async function generateUniqueCertificateNumber(year: number): Promise<string> {
  // Loop until we find a number that does not exist yet (collision-safe).
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `COOR-${year}-${random6()}`;
    const existing = await db.certificate.findUnique({
      where: { certificateNumber: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  // Extremely unlikely fallback — append extra entropy.
  return `COOR-${year}-${random6()}${random6().slice(0, 2)}`;
}

// ─── GET: list the candidate's certificates ─────────────────────────────

/**
 * GET /api/candidate/certificates
 *
 * Returns the non-revoked certificates of the authenticated candidate,
 * newest first, with the related course summary.
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    const certificates = await db.certificate.findMany({
      where: { candidateId: session.user.id, isRevoked: false },
      include: {
        course: { select: { id: true, title: true, level: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    return Response.json({ certificates });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// ─── POST: generate (or update) a certificate ───────────────────────────

interface GenerateBody {
  courseId?: unknown;
}

/**
 * POST /api/candidate/certificates
 *
 * Body: { courseId }
 *
 * Business rules:
 *  - A certificate is issued only if the candidate has PASSED at least one
 *    exam attempt for an exercise of the given course.
 *  - One certificate per candidate+course max. If the candidate passes again
 *    with a better score, the existing certificate's score is updated (no
 *    duplicate is created).
 *  - The certificate embeds a QR code pointing to the public verification
 *    endpoint so a third party can confirm its authenticity.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    const candidateId = session.user.id;

    // ── Parse body ────────────────────────────────────────────────────
    let body: GenerateBody;
    try {
      body = (await req.json()) as GenerateBody;
    } catch {
      return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
    }

    const courseId =
      typeof body?.courseId === "string" && body.courseId.length > 0
        ? body.courseId
        : null;

    if (!courseId) {
      return Response.json(
        { error: "Le paramètre courseId est requis." },
        { status: 400 }
      );
    }

    // ── Verify a passed exam attempt exists for this course ───────────
    const bestAttempt = await db.examAttempt.findFirst({
      where: {
        candidateId,
        passed: true,
        exercise: { courseId },
      },
      orderBy: { score: "desc" },
    });

    if (!bestAttempt) {
      return Response.json(
        { error: "Aucun examen réussi pour cette formation." },
        { status: 400 }
      );
    }

    // ── Fetch course + candidate info ─────────────────────────────────
    const [course, candidate] = await Promise.all([
      db.trainingCourse.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, level: true },
      }),
      db.user.findUnique({
        where: { id: candidateId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (!course) {
      return Response.json(
        { error: "Formation introuvable." },
        { status: 404 }
      );
    }

    if (!candidate) {
      return Response.json(
        { error: "Candidat introuvable." },
        { status: 404 }
      );
    }

    const fullName =
      `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() ||
      session.user.email;

    // Score percentage (0-100) based on the best passed attempt.
    const scorePct =
      bestAttempt.maxScore > 0
        ? Math.round((bestAttempt.score / bestAttempt.maxScore) * 100)
        : 100;

    const courseLevel = course.level as CourseLevel;
    const issueDate = new Date();

    // ── Existing certificate? Update score if better, else create ─────
    const existing = await db.certificate.findFirst({
      where: { candidateId, courseId },
    });

    if (existing) {
      if (scorePct > existing.score) {
        const updated = await db.certificate.update({
          where: { id: existing.id },
          data: { score: scorePct, issueDate },
          include: {
            course: { select: { id: true, title: true, level: true } },
          },
        });

        await audit({
          actorId: candidateId,
          action: "candidate.certificate.generate",
          targetType: "Certificate",
          targetId: updated.id,
          metadata: {
            courseId,
            certificateNumber: updated.certificateNumber,
            score: updated.score,
            updated: true,
          },
          req,
        });

        return Response.json({ certificate: updated }, { status: 200 });
      }

      // No improvement — return the existing one as-is (with course).
      const withCourse = await db.certificate.findUnique({
        where: { id: existing.id },
        include: {
          course: { select: { id: true, title: true, level: true } },
        },
      });

      return Response.json({ certificate: withCourse }, { status: 200 });
    }

    // ── Create a new certificate ──────────────────────────────────────
    const year = issueDate.getFullYear();
    const certificateNumber = await generateUniqueCertificateNumber(year);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/#/verify?cert=${certificateNumber}`;

    let qrCodeUrl: string | null = null;
    try {
      qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 240,
        color: { dark: "#17365d", light: "#ffffff" },
      });
    } catch {
      // QR generation is best-effort — the certificate is still valid
      // without the image, the verification URL is encoded in the row.
      qrCodeUrl = null;
    }

    const createData: Prisma.CertificateCreateInput = {
      candidate: { connect: { id: candidateId } },
      course: { connect: { id: courseId } },
      certificateNumber,
      fullName,
      courseName: course.title,
      level: courseLevel,
      score: scorePct,
      issueDate,
      qrCodeUrl,
    };

    const certificate = await db.certificate.create({
      data: createData,
      include: {
        course: { select: { id: true, title: true, level: true } },
      },
    });

    await audit({
      actorId: candidateId,
      action: "candidate.certificate.generate",
      targetType: "Certificate",
      targetId: certificate.id,
      metadata: {
        courseId,
        certificateNumber: certificate.certificateNumber,
        score: certificate.score,
      },
      req,
    });

    // Fire the automation event (logs to journal + dispatches to webhooks) and
    // notify the candidate that the certificate is available.
    await fireEvent({
      type: EVENTS.CERTIFICATE_AVAILABLE,
      targetType: "Certificate",
      targetId: certificate.id,
      actorId: session.user.id,
      payload: {
        certificateNumber: certificate.certificateNumber,
        courseName: certificate.courseName,
      },
      notifyUserId: candidateId,
      notifyType: "Success",
      notifyTitle: "Attestation disponible",
      notifyMessage: `Votre attestation est disponible: ${certificate.certificateNumber}`,
      notifyLink: "/candidate/certificates",
    });

    return Response.json({ certificate }, { status: 201 });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la génération du certificat." },
      { status: 500 }
    );
  }
}
