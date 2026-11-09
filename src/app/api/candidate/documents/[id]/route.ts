import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";
import { ROLES } from "@/lib/permissions";

/**
 * DELETE /api/candidate/documents/[id]
 *
 * Deletes a candidate document. Ownership is verified: a candidate can
 * only delete their own documents.
 */
export async function DELETE(
  req: NextRequest,
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

    if (doc.candidateId !== session.user.id) {
      return Response.json(
        { error: "Ce document ne vous appartient pas." },
        { status: 403 }
      );
    }

    // Remove the file from disk (ignore errors if it is already gone).
    try {
      const abs = path.join(process.cwd(), doc.fileUrl);
      await fs.unlink(abs);
    } catch {
      // best-effort: the database row is the source of truth
    }

    await db.candidateDocument.delete({ where: { id } });

    await audit({
      actorId: session.user.id,
      action: "candidate.document.delete",
      targetType: "CandidateDocument",
      targetId: doc.id,
      metadata: { type: doc.type, fileName: doc.fileName },
      req,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: "Une erreur est survenue lors de la suppression." },
      { status: 500 }
    );
  }
}
