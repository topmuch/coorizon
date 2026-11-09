/**
 * COORIZON seed script.
 *
 * Creates the initial SuperAdmin account so the platform can be administered.
 *
 * Run with: `bun run seed`
 *
 * Credentials are read from env (with safe defaults for local dev only).
 * In production, override SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD.
 */
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { ROLES } from "../src/lib/permissions";

async function main() {
  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? "admin@coorizon.com").trim().toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "Coorizon2024!";
  const firstName = process.env.SEED_SUPERADMIN_FIRSTNAME ?? "Super";
  const lastName = process.env.SEED_SUPERADMIN_LASTNAME ?? "Admin";

  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });

  if (existing) {
    if (existing.role !== ROLES.SuperAdmin) {
      await db.user.update({ where: { id: existing.id }, data: { role: ROLES.SuperAdmin, status: "Active", isActive: true } });
      console.log(`✓ Existing user ${email} promoted to SuperAdmin.`);
    } else {
      console.log(`✓ SuperAdmin ${email} already exists (id: ${existing.id}).`);
    }
  } else {
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: ROLES.SuperAdmin,
        status: "Active",
        isActive: true,
        firstName,
        lastName,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, role: true },
    });
    console.log(`✓ SuperAdmin created: ${user.email} (id: ${user.id})`);
    console.log(`  Password: ${password}  (change it immediately in production)`);
  }

  // Create a few demo accounts for testing the other roles (dev only).
  if (process.env.NODE_ENV !== "production") {
    await ensureDemo("candidate@coorizon.com", "Candidate2024!", ROLES.Candidate, "Awa", "Candidat");
    await ensureDemo("recruiter@coorizon.com", "Recruiter2024!", ROLES.Recruiter, "Marco", "Recruteur", "Pending");
    console.log("✓ Demo accounts ready (candidate@coorizon.com / recruiter@coorizon.com).");
  }

  // Seed demo companies + published job offers (dev only).
  if (process.env.NODE_ENV !== "production") {
    await seedJobs();
  }
}

async function ensureDemo(
  email: string,
  password: string,
  role: string,
  firstName: string,
  lastName: string,
  status: "Active" | "Pending" = "Active"
) {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return;
  const passwordHash = await hashPassword(password);
  await db.user.create({
    data: {
      email,
      passwordHash,
      role: role as never,
      status,
      isActive: true,
      firstName,
      lastName,
      ...(role === ROLES.Candidate
        ? { candidateProfile: { create: {} } }
        : {}),
    },
  });
}

/**
 * Seed demo companies (validated) + published job offers so candidates have
 * real offers to browse in LOT 3.
 */
async function seedJobs() {
  const count = await db.jobOffer.count();
  if (count > 0) {
    console.log(`✓ ${count} job offers already exist — skipping job seed.`);
    return;
  }

  let company = await db.company.findFirst({ where: { legalName: "Ristorante Bella Toscana S.r.l." } });
  if (!company) {
    company = await db.company.create({
      data: {
        legalName: "Ristorante Bella Toscana S.r.l.",
        registrationNumber: "IT055-FI-001",
        city: "Florence",
        region: "Toscane",
        country: "Italie",
        sector: "Hôtellerie & Restauration",
        size: "30-50",
        status: "Validated",
        validatedAt: new Date(),
      },
    });
  }

  const admin = await db.user.findFirst({
    where: { role: { in: ["Admin", "SuperAdmin"] } },
    select: { id: true },
  });
  const fallback = await db.user.findFirst({ select: { id: true } });
  const createdById = admin?.id ?? fallback!.id;

  const offers = [
    {
      title: "Chef de partie cuisine italienne",
      description: "Rejoignez la brigade d'un restaurant renommé de Florence. Préparation des plats de la cuisine toscane traditionnelle, gestion de la partie chaude et respect des normes d'hygiène HACCP.",
      missions: "Préparation des plats · Gestion de la partie chaude · Respect des normes HACCP",
      sector: "Hôtellerie & Restauration", city: "Florence", region: "Toscane",
      positions: 2, contractType: "CDI", salary: "1600-1900 €/mois",
      experienceRequired: "2 ans minimum", italianLevel: "B1" as const, qualifications: "CAP cuisine ou équivalent",
    },
    {
      title: "Aide-soignant / OSS en maison de retraite",
      description: "Accompagnement des résidents dans les actes de la vie quotidienne, surveillance de l'état de santé et collaboration avec l'équipe soignante. Logement possible.",
      missions: "Accompagnement quotidien · Surveillance santé · Collaboration équipe",
      sector: "Soins & Santé", city: "Bergame", region: "Lombardie",
      positions: 5, contractType: "CDI", salary: "1500-1750 €/mois",
      experienceRequired: "1 an minimum", italianLevel: "B1" as const, qualifications: "Diplôme d'aide-soignant",
    },
    {
      title: "Opérateur de production agroalimentaire",
      description: "Fabrication de pâtes fraîches : contrôle qualité, conditionnement et maintenance de premier niveau des lignes de production.",
      missions: "Contrôle qualité · Conditionnement · Maintenance de premier niveau",
      sector: "Agriculture & Agroalimentaire", city: "Rome", region: "Latium",
      positions: 8, contractType: "CDI", salary: "1400-1600 €/mois",
      experienceRequired: "Débutant accepté", italianLevel: "A2" as const, qualifications: "CAP ou équivalent",
    },
    {
      title: "Maçon polyvalent chantier",
      description: "Montage de structures en maçonnerie, coffrage, coulage de béton et finitions. Expérience requise sur chantier, équipements fournis.",
      missions: "Montage maçonnerie · Coffrage · Coulage béton · Finitions",
      sector: "BTP & Construction", city: "Vérone", region: "Vénétie",
      positions: 6, contractType: "CDI", salary: "1550-1800 €/mois",
      experienceRequired: "3 ans minimum", italianLevel: "A2" as const, qualifications: "CAP maçonnerie",
    },
    {
      title: "Réceptionniste bilingue hôtel 4★",
      description: "Accueil des clients, check-in/out, gestion des réservations et relation client en italien, français et anglais.",
      missions: "Accueil clients · Check-in/out · Gestion réservations · Relation client",
      sector: "Hôtellerie & Restauration", city: "Gênes", region: "Ligurie",
      positions: 3, contractType: "Saisonnier", salary: "1500-1700 €/mois",
      experienceRequired: "1 an minimum", italianLevel: "B2" as const, qualifications: "Bac + formation hôtellerie",
    },
    {
      title: "Chauffeur poids lourd international",
      description: "Transport de marchandises sur l'Italie et l'Europe. Permis CE requis, tournées régulières et repos hebdomadaire respecté.",
      missions: "Transport marchandises · Tournées Italie/Europe · Respect des temps de conduite",
      sector: "Logistique & Transport", city: "Bologne", region: "Émilie-Romagne",
      positions: 4, contractType: "CDI", salary: "1800-2200 €/mois",
      experienceRequired: "2 ans minimum", italianLevel: "B1" as const, qualifications: "Permis CE + CQC",
    },
  ];

  for (const o of offers) {
    await db.jobOffer.create({
      data: {
        ...o,
        companyId: company.id,
        createdById,
        status: "Published",
        applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✓ Seeded ${offers.length} published job offers.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
