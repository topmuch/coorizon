import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { getRecruiterCompany } from "@/lib/auth/recruiter";
import { authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";

/**
 * Recruiter company document DELETE (LOT 4 — Task 4-b).
 *
 * DELETE /api/recruiter/company/documents/[id]
 *
 * Removes a company document (file + DB row). Ownership is verified:
 * the document MUST belong to the authenticated recruiter's own company.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { companyId, userId } = await getRecruiterCompany();
    const { id } = await params;

    const doc = await db.companyDocument.findUnique({ where: { id } });

    if (!doc) {
      return Response.json(
        { error: "Document introuvable." },
        { status: 404 }
      );
    }

    if (doc.companyId !== companyId) {
      return Response.json(
        { error: "Ce document n'appartient pas à votre entreprise." },
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

    await db.companyDocument.delete({ where: { id } });

    await audit({
      actorId: userId,
      action: "company.document.delete",
      targetType: "CompanyDocument",
      targetId: doc.id,
      metadata: { type: doc.type, fileName: doc.fileName },
      req,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
