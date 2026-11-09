import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordPolicy, validateEmail } from "@/lib/auth/password";
import { ROLES } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * POST /api/auth/register-candidate
 *
 * Registers a new candidate user with the "Candidate" role and an empty
 * candidate profile. Candidates are immediately Active (no admin validation
 * needed — only recruiters require validation).
 *
 * Body:
 *   firstName, lastName, email, password, phone?,
 *   nationality?, residenceCountry?, city?, desiredJob?, sector?, italianLevel?
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "Données invalides." }, { status: 400 });
    }

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;

    // Validation
    if (!firstName || !lastName) {
      return Response.json({ error: "Le prénom et le nom sont requis." }, { status: 400 });
    }
    const emailErr = validateEmail(email);
    if (emailErr) return Response.json({ error: emailErr }, { status: 400 });
    const pwdErr = validatePasswordPolicy(password);
    if (pwdErr) return Response.json({ error: pwdErr }, { status: 400 });

    // Uniqueness
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return Response.json({ error: "Un compte existe déjà avec cette adresse email." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Create user + candidate profile in a transaction
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: ROLES.Candidate,
        status: "Active",
        firstName,
        lastName,
        phone,
        candidateProfile: {
          create: {
            nationality: typeof body.nationality === "string" ? body.nationality : null,
            residenceCountry: typeof body.residenceCountry === "string" ? body.residenceCountry : null,
            city: typeof body.city === "string" ? body.city : null,
            desiredJob: typeof body.desiredJob === "string" ? body.desiredJob : null,
            sector: typeof body.sector === "string" ? body.sector : null,
            italianLevel: validLevel(body.italianLevel),
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
      },
    });

    await audit({
      action: "candidate.register",
      targetType: "User",
      targetId: user.id,
      metadata: { email: user.email },
      req,
    });

    return Response.json(
      {
        user,
        message: "Compte candidat créé avec succès. Vous pouvez vous connecter.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register-candidate]", error);
    return Response.json({ error: "Une erreur est survenue lors de l'inscription." }, { status: 500 });
  }
}

function validLevel(value: unknown) {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (typeof value === "string" && levels.includes(value)) return value as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  return null;
}
