/**
 * COORIZON seed script (plain JavaScript for Docker production).
 *
 * This script is executed by the Docker startup script. It creates:
 * - SuperAdmin account
 * - Demo accounts (candidate, recruiter, trainer, agent)
 * - Demo company + job offers
 * - Training courses (A1, A2, B1) with modules, lessons, exams
 * - Immigration case with checklist
 * - Service catalog
 *
 * Run with: node prisma/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient({ log: ["error"] });
const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  const adminEmail = "admin@coorizon.com";
  const adminPassword = "Coorizon2024!";

  // ── SuperAdmin ──────────────────────────────────────────────
  let admin = await db.user.findUnique({ where: { email: adminEmail }, select: { id: true, role: true } });
  if (!admin) {
    const hash = await hashPassword(adminPassword);
    admin = await db.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        role: "SuperAdmin",
        status: "Active",
        isActive: true,
        firstName: "Super",
        lastName: "Admin",
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    console.log("✓ SuperAdmin created: admin@coorizon.com / Coorizon2024!");
  } else {
    // Ensure password is correct (fix for re-seeds)
    const hash = await hashPassword(adminPassword);
    await db.user.update({ where: { id: admin.id }, data: { passwordHash: hash, role: "SuperAdmin", status: "Active", isActive: true } });
    console.log("✓ SuperAdmin password updated: admin@coorizon.com / Coorizon2024!");
  }

  // ── Demo Candidate ──────────────────────────────────────────
  await ensureUser("candidate@coorizon.com", "Candidate2024!", "Candidate", "Active", "Awa", "Candidat");

  // ── Demo Pending Recruiter ──────────────────────────────────
  await ensureUser("recruiter@coorizon.com", "Recruiter2024!", "Recruiter", "Pending", "Marco", "Recruteur");

  // ── Validated Company + Recruiter ───────────────────────────
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
  } else if (company.status !== "Validated") {
    company = await db.company.update({ where: { id: company.id }, data: { status: "Validated", validatedAt: new Date() } });
  }

  // Validated recruiter
  const recEmail = "recruteur.valide@coorizon.com";
  let recUser = await db.user.findUnique({ where: { email: recEmail }, select: { id: true, recruiterProfile: true } });
  if (!recUser) {
    const hash = await hashPassword("Recruteur2024!");
    recUser = await db.user.create({
      data: {
        email: recEmail,
        passwordHash: hash,
        role: "Recruiter",
        status: "Active",
        isActive: true,
        firstName: "Giulia",
        lastName: "Rossi",
        recruiterProfile: { create: { companyId: company.id, responsibleName: "Giulia Rossi", responsibleEmail: recEmail, responsiblePhone: "+39 055 123456", jobTitle: "Responsable RH" } },
      },
      select: { id: true, recruiterProfile: true },
    });
    console.log("✓ Validated recruiter: recruteur.valide@coorizon.com / Recruteur2024!");
  } else {
    // Update password
    const hash = await hashPassword("Recruteur2024!");
    await db.user.update({ where: { id: recUser.id }, data: { passwordHash: hash, status: "Active", isActive: true } });
    console.log("✓ Validated recruiter password updated: recruteur.valide@coorizon.com / Recruteur2024!");
  }

  // ── Trainer ─────────────────────────────────────────────────
  const trainerEmail = "formateur@coorizon.com";
  let trainer = await db.user.findUnique({ where: { email: trainerEmail }, select: { id: true } });
  if (!trainer) {
    const hash = await hashPassword("Formateur2024!");
    trainer = await db.user.create({
      data: {
        email: trainerEmail,
        passwordHash: hash,
        role: "Trainer",
        status: "Active",
        isActive: true,
        firstName: "Elena",
        lastName: "Russo",
        trainerProfile: { create: { bio: "Professeure d'italien certifiée.", specialties: "A1,A2,B1" } },
      },
      select: { id: true },
    });
    console.log("✓ Trainer: formateur@coorizon.com / Formateur2024!");
  } else {
    const hash = await hashPassword("Formateur2024!");
    await db.user.update({ where: { id: trainer.id }, data: { passwordHash: hash, status: "Active", isActive: true } });
    console.log("✓ Trainer password updated: formateur@coorizon.com / Formateur2024!");
  }

  // ── Immigration Agent ───────────────────────────────────────
  const agentEmail = "agent.immigration@coorizon.com";
  let agent = await db.user.findUnique({ where: { email: agentEmail }, select: { id: true } });
  if (!agent) {
    const hash = await hashPassword("Agent2024!");
    agent = await db.user.create({
      data: { email: agentEmail, passwordHash: hash, role: "ImmigrationAgent", status: "Active", isActive: true, firstName: "Sofia", lastName: "Conti" },
      select: { id: true },
    });
    console.log("✓ Agent: agent.immigration@coorizon.com / Agent2024!");
  } else {
    const hash = await hashPassword("Agent2024!");
    await db.user.update({ where: { id: agent.id }, data: { passwordHash: hash, status: "Active", isActive: true } });
    console.log("✓ Agent password updated: agent.immigration@coorizon.com / Agent2024!");
  }

  // ── Job Offers ──────────────────────────────────────────────
  if ((await db.jobOffer.count()) === 0) {
    const offers = [
      { title: "Chef de partie cuisine italienne", description: "Brigade d'un restaurant renommé de Florence.", sector: "Hôtellerie & Restauration", city: "Florence", region: "Toscane", positions: 2, contractType: "CDI", salary: "1600-1900 €/mois", italianLevel: "B1" },
      { title: "Aide-soignant / OSS", description: "Maison de retraite à Bergame.", sector: "Soins & Santé", city: "Bergame", region: "Lombardie", positions: 5, contractType: "CDI", salary: "1500-1750 €/mois", italianLevel: "B1" },
      { title: "Opérateur agroalimentaire", description: "Fabrication de pâtes fraîches à Rome.", sector: "Agriculture & Agroalimentaire", city: "Rome", region: "Latium", positions: 8, contractType: "CDI", salary: "1400-1600 €/mois", italianLevel: "A2" },
      { title: "Maçon polyvalent", description: "Chantier à Vérone.", sector: "BTP & Construction", city: "Vérone", region: "Vénétie", positions: 6, contractType: "CDI", salary: "1550-1800 €/mois", italianLevel: "A2" },
      { title: "Réceptionniste hôtel 4★", description: "Hôtel à Gênes.", sector: "Hôtellerie & Restauration", city: "Gênes", region: "Ligurie", positions: 3, contractType: "Saisonnier", salary: "1500-1700 €/mois", italianLevel: "B2" },
      { title: "Chauffeur poids lourd", description: "Transport Bologne.", sector: "Logistique & Transport", city: "Bologne", region: "Émilie-Romagne", positions: 4, contractType: "CDI", salary: "1800-2200 €/mois", italianLevel: "B1" },
    ];
    for (const o of offers) {
      await db.jobOffer.create({ data: { ...o, companyId: company.id, createdById: admin.id, status: "Published", applicationDeadline: new Date(Date.now() + 45 * 86400000) } });
    }
    console.log("✓ 6 job offers seeded");
  }

  // ── Training Courses ────────────────────────────────────────
  if ((await db.trainingCourse.count()) === 0) {
    const courses = [
      { title: "Italien débutant — Premiers pas", subtitle: "Niveau A1", description: "Salutations, présentations, vocabulaire quotidien.", level: "A1", durationHours: 60 },
      { title: "Italien élémentaire — Vie pratique", subtitle: "Niveau A2", description: "Achats, transports, santé et travail.", level: "A2", durationHours: 70 },
      { title: "Italien intermédiaire — Monde du travail", subtitle: "Niveau B1", description: "Entretiens, contrats, communication entreprise.", level: "B1", durationHours: 90 },
    ];
    for (const c of courses) {
      const course = await db.trainingCourse.create({ data: { ...c, isPublished: true, trainerId: trainer.id } });
      // Module 1
      const mod = await db.courseModule.create({ data: { courseId: course.id, title: "Module 1", order: 0 } });
      await db.lesson.create({ data: { moduleId: mod.id, title: "Leçon 1 — Bonjour", content: "Buongiorno, come stai?", durationMin: 15, order: 0, isPublished: true } });
      await db.lesson.create({ data: { moduleId: mod.id, title: "Leçon 2 — Se présenter", content: "Mi chiamo...", durationMin: 20, order: 1, isPublished: true } });
      // Exam
      const ex = await db.exercise.create({ data: { courseId: course.id, title: "Examen " + c.level, type: "Exam", passingScore: 70, timeLimitMin: 15, order: 0 } });
      await db.question.create({ data: { exerciseId: ex.id, type: "MCQ", prompt: "Comment dit-on « Bonjour » le matin ?", options: JSON.stringify(["Buonasera", "Buongiorno", "Buonanotte", "Arrivederci"]), answer: "1", points: 2, order: 0 } });
      await db.question.create({ data: { exerciseId: ex.id, type: "TrueFalse", prompt: "« Come stai? » = « Comment t'appelles-tu ? »", options: JSON.stringify(["Vrai", "Faux"]), answer: "1", points: 2, order: 1 } });
    }
    // Enroll candidate in A1
    const cand = await db.user.findFirst({ where: { role: "Candidate" } });
    const a1 = await db.trainingCourse.findFirst({ where: { level: "A1" } });
    if (cand && a1) await db.enrollment.create({ data: { candidateId: cand.id, courseId: a1.id, status: "Active" } });
    console.log("✓ 3 training courses + exams seeded");
  }

  // ── Immigration Case ────────────────────────────────────────
  if ((await db.immigrationCase.count()) === 0) {
    const cand = await db.user.findFirst({ where: { role: "Candidate" } });
    const offer = await db.jobOffer.findFirst({ where: { status: "Published" } });
    if (cand && agent) {
      const ic = await db.immigrationCase.create({ data: { candidateId: cand.id, agentId: agent.id, jobOfferId: offer?.id, companyId: offer?.companyId, status: "InProgress", priority: "Normal", notes: "Dossier en cours.", openedAt: new Date() } });
      const tasks = ["Ouverture du dossier", "Vérification d'identité", "Collecte des justificatifs", "Vérification du contrat", "Préparation des démarches", "Suivi des autorisations", "Suivi du visa", "Préparation au départ", "Clôture"];
      for (let i = 0; i < tasks.length; i++) {
        await db.immigrationTask.create({ data: { caseId: ic.id, title: tasks[i], status: i < 2 ? "Done" : i === 2 ? "InProgress" : "Todo", order: i, completedAt: i < 2 ? new Date(Date.now() - 259200000) : null, dueDate: i >= 2 && i <= 6 ? new Date(Date.now() + i * 604800000) : null, assigneeId: agent.id } });
      }
      console.log("✓ Immigration case + 9 tasks seeded");
    }
  }

  // ── Services ────────────────────────────────────────────────
  if ((await db.service.count()) === 0) {
    const services = [
      { name: "Formation Italien A1", description: "Accès complet A1.", category: "formation", price: 49, currency: "EUR", durationLabel: "3 mois" },
      { name: "Formation Italien A2", description: "Parcours A2.", category: "formation", price: 59, currency: "EUR", durationLabel: "3 mois" },
      { name: "Formation Italien B1", description: "Italien professionnel.", category: "formation", price: 79, currency: "EUR", durationLabel: "4 mois" },
      { name: "Pack Accompagnement Immigration", description: "Accompagnement complet.", category: "accompagnement", price: 199, currency: "EUR", durationLabel: "Until departure" },
      { name: "Abonnement Recruteur Premium", description: "Offres illimitées.", category: "abonnement", price: 99, currency: "EUR", durationLabel: "1 mois" },
      { name: "Session Coaching Entretien", description: "1h coaching individuel.", category: "accompagnement", price: 39, currency: "EUR", durationLabel: "1 session" },
    ];
    for (const s of services) await db.service.create({ data: s });
    console.log("✓ 6 services seeded");
  }

  console.log("✓ Seed completed successfully");
}

async function ensureUser(email, password, role, status, firstName, lastName) {
  let user = await db.user.findUnique({ where: { email }, select: { id: true } });
  const hash = await hashPassword(password);
  if (!user) {
    user = await db.user.create({
      data: { email, passwordHash: hash, role, status, isActive: true, firstName, lastName, ...(role === "Candidate" ? { candidateProfile: { create: {} } } : {}) },
      select: { id: true },
    });
    console.log(`✓ Created ${role}: ${email} / ${password}`);
  } else {
    await db.user.update({ where: { id: user.id }, data: { passwordHash: hash, status, isActive: true } });
    console.log(`✓ Updated ${role} password: ${email} / ${password}`);
  }
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
