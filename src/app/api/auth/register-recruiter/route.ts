import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordPolicy, validateEmail } from "@/lib/auth/password";
import { ROLES } from "@/lib/permissions";
import { audit } from "@/lib/auth/audit";

/**
 * POST /api/auth/register-recruiter
 *
 * Registers a new recruiter user + a company in "Pending" status.
 * Per COORIZON rules, recruiter accounts are validated by the administration
 * before they can publish job offers. The user is created with status "Pending"
 * and the company with status "Pending".
 *
 * Body:
 *   Responsible: firstName, lastName, email, password, phone?, jobTitle?
 *   Company:     company (legalName), vat (registrationNumber), tax?, city, region,
 *                sector, address?, website?
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
    const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : null;

    const legalName = typeof body.company === "string" ? body.company.trim() : "";
    const vat = typeof body.vat === "string" ? body.vat.trim() : "";
    const tax = typeof body.tax === "string" && body.tax.trim() ? body.tax.trim() : null;
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const region = typeof body.region === "string" ? body.region.trim() : "";
    const sector = typeof body.sector === "string" ? body.sector.trim() : "";
    const address = typeof body.address === "string" && body.address.trim() ? body.address.trim() : null;
    const website = typeof body.website === "string" && body.website.trim() ? body.website.trim() : null;

    // Validation
    if (!firstName || !lastName) {
      return Response.json({ error: "Le prénom et le nom du responsable sont requis." }, { status: 400 });
    }
    const emailErr = validateEmail(email);
    if (emailErr) return Response.json({ error: emailErr }, { status: 400 });
    const pwdErr = validatePasswordPolicy(password);
    if (pwdErr) return Response.json({ error: pwdErr }, { status: 400 });
    if (!legalName) return Response.json({ error: "La raison sociale est requise." }, { status: 400 });
    if (!vat) return Response.json({ error: "Le numéro d'immatriculation est requis." }, { status: 400 });
    if (!city) return Response.json({ error: "La ville est requise." }, { status: 400 });
    if (!region) return Response.json({ error: "La région italienne est requise." }, { status: 400 });
    if (!sector) return Response.json({ error: "Le secteur d'activité est requis." }, { status: 400 });

    // Uniqueness — email
    const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return Response.json({ error: "Un compte existe déjà avec cette adresse email." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Create company + user + recruiter profile in a transaction.
    // Both the user and the company start in "Pending" status awaiting admin validation.
    const result = await db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          legalName,
          registrationNumber: vat,
          taxId: tax,
          address,
          city,
          region,
          sector,
          website,
          status: "Pending",
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: ROLES.Recruiter,
          status: "Pending",
          firstName,
          lastName,
          phone,
          recruiterProfile: {
            create: {
              companyId: company.id,
              responsibleName: `${firstName} ${lastName}`,
              responsibleEmail: email,
              responsiblePhone: phone,
              jobTitle,
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

      return { company, user };
    });

    await audit({
      action: "recruiter.register",
      targetType: "Company",
      targetId: result.company.id,
      metadata: {
        userId: result.user.id,
        email: result.user.email,
        company: result.company.legalName,
      },
      req,
    });

    return Response.json(
      {
        user: result.user,
        company: { id: result.company.id, legalName: result.company.legalName, status: result.company.status },
        message:
          "Demande d'inscription enregistrée. Votre compte entreprise est en attente de validation par l'administration.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register-recruiter]", error);
    return Response.json({ error: "Une erreur est survenue lors de l'inscription." }, { status: 500 });
  }
}
