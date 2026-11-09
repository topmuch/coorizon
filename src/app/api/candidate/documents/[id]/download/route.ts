import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { ROLES } from "@/lib/permissions";

/**
 * GET /api/candidate/documents/[id]/download
 *
 * Serves the binary content of a candidate document as an attachment.
 *
 * This endpoint is PRIVATE and PROTECTED: ownership is verified before
 * any byte is read from disk. A candidate can only download their own
 * documents.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.user.role !== ROLES.Candidate) {
      return Response.json(
        { error: "Accès réservé aux candidats." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const doc = await db.candidateDocument.findUnique({ where: { id } });

    if (!doc) {
      return Response.json(
        { error: "Document introuvable." },
        { status: 404 }
      );
    }

    // Ownership check — never serve a document that does not belong to the
    // authenticated candidate.
    if (doc.candidateId !== session.user.id) {
      return Response.json(
        { error: "Ce document ne vous appartient pas." },
        { status: 403 }
      );
    }

    const abs = path.join(process.cwd(), doc.fileUrl);
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(abs);
    } catch {
      return Response.json(
        { error: "Fichier introuvable sur le serveur." },
        { status: 404 }
      );
    }

    // Escape any double-quote in the file name for a safe Content-Disposition.
    const safeName = doc.fileName.replace(/"/g, "'");

    return new Response(buffer, {
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors du téléchargement." },
      { status: 500 }
    );
  }
}
