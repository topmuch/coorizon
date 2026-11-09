import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";
import { ROLES } from "@/lib/permissions";
import { DocumentType } from "@prisma/client";

/**
 * Candidate documents API (LOT 3 — Task 3-c).
 *
 * Documents are PRIVATE: every read/write is scoped to the authenticated
 * candidate's own records.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "candidates");

const ALLOWED_MIME: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

const VALID_TYPES: ReadonlySet<string> = new Set(Object.values(DocumentType));

/**
 * GET /api/candidate/documents
 * Lists all documents belonging to the authenticated candidate.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }
    const documents = await db.candidateDocument.findMany({
      where: { candidateId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(documents);
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la récupération des documents." },
      { status: 500 }
    );
  }
}

/**
 * Sanitize a user-supplied file name: strip path separators and leading
 * dots/spaces so it is safe to use as a file system entry.
 */
function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[/\\]+/g, "_")
    .replace(/^[\s.]+/, "")
    .trim();
  return cleaned || "document";
}

/**
 * POST /api/candidate/documents
 * Uploads a new document for the authenticated candidate.
 *
 * Form data:
 *   - type:  one of the DocumentType enum values
 *   - file:  the uploaded file (PDF, Word, PNG or JPG, max 10 Mo)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return Response.json(
        { error: "Données de formulaire invalides." },
        { status: 400 }
      );
    }

    const typeRaw = formData.get("type");
    const type = typeof typeRaw === "string" ? typeRaw : "";
    if (!VALID_TYPES.has(type)) {
      return Response.json(
        { error: "Type de document invalide." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return Response.json(
        { error: "Aucun fichier reçu." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return Response.json(
        {
          error:
            "Format non supporté. Formats acceptés: PDF, Word, PNG, JPG.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: "Le fichier dépasse 10 Mo." },
        { status: 400 }
      );
    }

    const documentId = crypto.randomUUID();
    const fileName = sanitizeFileName(file.name);
    const dir = path.join(UPLOAD_ROOT, session.user.id, documentId);
    await fs.mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, fileName), buffer);

    const fileUrl = `uploads/candidates/${session.user.id}/${documentId}/${fileName}`;

    const doc = await db.candidateDocument.create({
      data: {
        candidateId: session.user.id,
        type: type as DocumentType,
        fileName,
        fileUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        status: "Pending",
      },
    });

    await audit({
      actorId: session.user.id,
      action: "candidate.document.upload",
      targetType: "CandidateDocument",
      targetId: doc.id,
      metadata: { type, fileName, sizeBytes: file.size },
      req,
    });

    return Response.json(doc, { status: 201 });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors du téléversement." },
      { status: 500 }
    );
  }
}
