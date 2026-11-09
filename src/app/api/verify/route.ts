import { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/verify?cert=COOR-YYYY-XXXXXX
 *
 * Public certificate verification endpoint (no auth required).
 * Used when a third party scans the QR code printed on a certificate.
 *
 * Returns:
 *   { valid: true, certificate: { ... } }   — valid & active
 *   { valid: false, message: "...", certificate: null } — not found / revoked
 *
 * Only a minimal public subset of the certificate is returned — never the
 * candidate's user id, email, or internal foreign keys.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const certNumber = req.nextUrl.searchParams.get("cert")?.trim();

  if (!certNumber) {
    return Response.json(
      {
        valid: false,
        message: "Numéro de certificat manquant.",
        certificate: null,
      },
      { status: 200 }
    );
  }

  const certificate = await db.certificate.findUnique({
    where: { certificateNumber: certNumber },
    include: {
      course: { select: { title: true, level: true } },
      candidate: { select: { firstName: true, lastName: true } },
    },
  });

  if (!certificate) {
    return Response.json(
      {
        valid: false,
        message: "Certificat introuvable.",
        certificate: null,
      },
      { status: 200 }
    );
  }

  if (certificate.isRevoked) {
    return Response.json(
      {
        valid: false,
        message: "Ce certificat a été révoqué.",
        certificate: null,
      },
      { status: 200 }
    );
  }

  return Response.json({
    valid: true,
    certificate: {
      certificateNumber: certificate.certificateNumber,
      fullName: certificate.fullName,
      courseName: certificate.courseName,
      level: certificate.level,
      score: certificate.score,
      issueDate: certificate.issueDate,
    },
  });
}
