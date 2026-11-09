import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getRecruiterCompany } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";
import { DocumentType } from "@prisma/client";

/**
 * Recruiter company documents API (LOT 4 — Task 4-b).
 *
 * GET  /api/recruiter/company/documents      — list the company's documents.
 * POST /api/recruiter/company/documents      — upload a new company document.
 *
 * All operations are scoped to the authenticated recruiter's own company
 * via getRecruiterCompany(). Files are stored on disk under
 * uploads/companies/{companyId}/{docId}/{fileName}.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "companies");

/** MIME types accepted for company justificatives. */
const ALLOWED_MIME: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

/**
 * Document types a recruiter can upload for their company. CV / Passport /
 * IDCard / Diploma / WorkCertificate / Certificate / CoverLetter are
 * candidate-only — they are rejected here.
 */
const COMPANY_DOC_TYPES: ReadonlySet<string> = new Set<DocumentType>([
  "CompanyRegistration",
  "TaxId",
  "IDDocument",
  "Other",
] as unknown as DocumentType[]);

const VALID_TYPES: ReadonlySet<string> = new Set(Object.values(DocumentType));

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
 * GET /api/recruiter/company/documents
 * Lists all documents belonging to the recruiter's own company.
 */
export async function GET(_req: NextRequest) {
  try {
    const { companyId } = await getRecruiterCompany();
    const documents = await db.companyDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(documents);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/recruiter/company/documents
 *
 * Form data:
 *   - type: one of the company-relevant DocumentType values
 *           (CompanyRegistration | TaxId | IDDocument | Other)
 *   - file: the uploaded file (PDF, Word, PNG or JPG, max 10 Mo)
 */
export async function POST(req: NextRequest) {
  try {
    const { companyId, userId } = await getRecruiterCompany();

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
    if (!COMPANY_DOC_TYPES.has(type)) {
      return Response.json(
        {
          error:
            "Ce type de document n'est pas autorisé pour une entreprise.",
        },
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
    const dir = path.join(UPLOAD_ROOT, companyId, documentId);
    await fs.mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, fileName), buffer);

    const fileUrl = `uploads/companies/${companyId}/${documentId}/${fileName}`;

    const doc = await db.companyDocument.create({
      data: {
        companyId,
        type: type as DocumentType,
        fileName,
        fileUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        status: "Pending",
      },
    });

    await audit({
      actorId: userId,
      action: "company.document.upload",
      targetType: "CompanyDocument",
      targetId: doc.id,
      metadata: { type, fileName, sizeBytes: file.size },
      req,
    });

    return Response.json(doc, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
