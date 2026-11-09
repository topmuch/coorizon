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
    await seedValidatedRecruiter();
    await seedTraining();
    await seedImmigration();
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

/**
 * Seed a VALIDATED recruiter + company so the LOT 4 recruiter space is testable.
 * The existing recruiter@coorizon.com stays Pending (to test the pending screen);
 * this new one is fully validated.
 */
async function seedValidatedRecruiter() {
  const email = "recruteur.valide@coorizon.com";
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log("✓ Validated recruiter already exists (recruteur.valide@coorizon.com).");
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
        sector: "Hôtellerie & Restauration",
        size: "30-50",
        status: "Validated",
        validatedAt: new Date(),
      },
    });
  } else if (company.status !== "Validated") {
    company = await db.company.update({
      where: { id: company.id },
      data: { status: "Validated", validatedAt: new Date() },
    });
  }

  const passwordHash = await hashPassword("Recruteur2024!");
  await db.user.create({
    data: {
      email,
      passwordHash,
      role: ROLES.Recruiter,
      status: "Active",
      isActive: true,
      firstName: "Giulia",
      lastName: "Rossi",
      recruiterProfile: {
        create: {
          companyId: company.id,
          responsibleName: "Giulia Rossi",
          responsibleEmail: email,
          responsiblePhone: "+39 055 123456",
          jobTitle: "Responsable RH",
        },
      },
    },
  });
  console.log("✓ Validated recruiter ready: recruteur.valide@coorizon.com / Recruteur2024!");
}

/**
 * Seed a trainer + training courses (A1, A2, B1) with modules, lessons,
 * exercises and questions so LOT 6 is fully testable.
 */
async function seedTraining() {
  if (await db.trainingCourse.count() > 0) {
    console.log("✓ Training courses already exist — skipping training seed.");
    return;
  }

  // Trainer user
  const trainerEmail = "formateur@coorizon.com";
  let trainer = await db.user.findUnique({ where: { email: trainerEmail } });
  if (!trainer) {
    const passwordHash = await hashPassword("Formateur2024!");
    trainer = await db.user.create({
      data: {
        email: trainerEmail,
        passwordHash,
        role: ROLES.Trainer,
        status: "Active",
        isActive: true,
        firstName: "Elena",
        lastName: "Russo",
        trainerProfile: { create: { bio: "Professeure d'italien certifiée.", specialties: "A1,A2,B1" } },
      },
    });
    console.log("✓ Trainer created: formateur@coorizon.com / Formateur2024!");
  }

  const courses = [
    {
      title: "Italien débutant — Premiers pas",
      subtitle: "Niveau A1 du CECRL",
      description: "Apprenez les bases de l'italien : salutations, présentations, vocabulaire de la vie quotidienne et premières structures grammaticales.",
      level: "A1" as const,
      durationHours: 60,
      modules: [
        {
          title: "Module 1 — Salutations et présentations",
          lessons: [
            { title: "Leçon 1 — Bonjour, ça va ?", content: "Apprenez à saluer en italien : Buongiorno, Buonasera, Ciao. Comment demander comment ça va : Come stai? Come sta?", videoUrl: "https://www.youtube.com/embed/example1", durationMin: 15 },
            { title: "Leçon 2 — Se présenter", content: "Mi chiamo... Sono di... Piacere di conoscerti. Apprenez à donner votre nom et votre origine.", durationMin: 20 },
            { title: "Leçon 3 — Les pronoms personnels", content: "Io, tu, lui, lei, noi, voi, loro. Conjugaison de base du verbe essere (être).", durationMin: 25 },
          ],
        },
        {
          title: "Module 2 — La vie quotidienne",
          lessons: [
            { title: "Leçon 4 — Les nombres 1-20", content: "Uno, due, tre... Comptez jusqu'à 20 en italien. Exercices de prononciation.", durationMin: 18 },
            { title: "Leçon 5 — Les jours de la semaine", content: "Lunedì, martedì, mercoledì... I giorni della settimana.", durationMin: 15 },
          ],
        },
      ],
      exercise: {
        title: "Examen A1 — Module 1",
        type: "Exam",
        passingScore: 70,
        timeLimitMin: 15,
        questions: [
          {
            type: "MCQ",
            prompt: "Comment dit-on « Bonjour » en italien le matin ?",
            options: ["Buonasera", "Buongiorno", "Buonanotte", "Arrivederci"],
            answer: "1",
            explanation: "Buongiorno = bonjour (le matin). Buonasera = bonsoir.",
            points: 2,
          },
          {
            type: "TrueFalse",
            prompt: "« Come stai? » signifie « Comment t'appelles-tu ? »",
            options: ["Vrai", "Faux"],
            answer: "1",
            explanation: "Faux. « Come stai? » = « Comment vas-tu ? ». « Come ti chiami? » = « Comment t'appelles-tu ? »",
            points: 2,
          },
          {
            type: "Vocabulary",
            prompt: "Traduisez en italien : « Je m'appelle Marco »",
            options: ["Mi chiamo Marco", "Sono Marco", "Marco sono", "Toutes ces réponses"],
            answer: "3",
            explanation: "« Mi chiamo Marco » et « Sono Marco » sont corrects.",
            points: 2,
          },
          {
            type: "Translation",
            prompt: "Traduisez en français : « Piacere di conoscerti »",
            options: ["Enchanté de te connaître", "Au revoir", "Merci beaucoup", "S'il vous plaît"],
            answer: "0",
            explanation: "Piacere di conoscerti = Enchanté de te connaître.",
            points: 2,
          },
          {
            type: "MCQ",
            prompt: "Quel pronom signifie « nous » en italien ?",
            options: ["Voi", "Noi", "Loro", "Io"],
            answer: "1",
            explanation: "Noi = nous. Voi = vous. Loro = ils/elles. Io = je.",
            points: 1,
          },
        ],
      },
    },
    {
      title: "Italien élémentaire — Vie pratique",
      subtitle: "Niveau A2 du CECRL",
      description: "Communiquez dans des situations simples : achats, transports, santé et travail. Vocabulaire professionnel de base.",
      level: "A2" as const,
      durationHours: 70,
      modules: [
        {
          title: "Module 1 — Achats et nourriture",
          lessons: [
            { title: "Leçon 1 — Au restaurant", content: "Vorrei... Posso avere... Il conto, per favore. Commandez au restaurant.", videoUrl: "https://www.youtube.com/embed/example2", durationMin: 22 },
            { title: "Leçon 2 — Faire les courses", content: "Al supermercato. Vocabulaire des aliments.", durationMin: 20 },
          ],
        },
      ],
      exercise: {
        title: "Examen A2 — Vie pratique",
        type: "Exam",
        passingScore: 70,
        timeLimitMin: 20,
        questions: [
          {
            type: "MCQ",
            prompt: "Comment demande-t-on l'addition au restaurant ?",
            options: ["Il conto, per favore", "Buon appetito", "Grazie mille", "Scusi"],
            answer: "0",
            explanation: "« Il conto, per favore » = l'addition s'il vous plaît.",
            points: 2,
          },
          {
            type: "Translation",
            prompt: "Traduisez : « Vorrei un caffè »",
            options: ["Je voudrais un café", "J'ai un café", "Le café est bon", "Où est le café"],
            answer: "0",
            explanation: "Vorrei = je voudrais (conditionnel de volere).",
            points: 2,
          },
        ],
      },
    },
    {
      title: "Italien intermédiaire — Monde du travail",
      subtitle: "Niveau B1 du CECRL",
      description: "Maîtrisez l'italien professionnel : entretiens, contrats, communication en entreprise et culture du travail italienne.",
      level: "B1" as const,
      durationHours: 90,
      modules: [
        {
          title: "Module 1 — L'entretien d'embauche",
          lessons: [
            { title: "Leçon 1 — Se présenter professionnellement", content: "Ho esperienza in... Lavoro come... Le competenze professionali.", videoUrl: "https://www.youtube.com/embed/example3", durationMin: 30 },
            { title: "Leçon 2 — Questions courantes en entretien", content: "Perché vuole lavorare da noi? Quali sono i suoi punti di forza?", durationMin: 28 },
          ],
        },
      ],
      exercise: {
        title: "Examen B1 — Monde du travail",
        type: "Exam",
        passingScore: 70,
        timeLimitMin: 25,
        questions: [
          {
            type: "MCQ",
            prompt: "Comment dit-on « J'ai 5 ans d'expérience » ?",
            options: ["Ho cinque anni di esperienza", "Sono cinque esperienze", "Faccio esperienza cinque", "Cinque anni lavoro"],
            answer: "0",
            explanation: "« Ho cinque anni di esperienza » = J'ai 5 ans d'expérience.",
            points: 2,
          },
          {
            type: "Translation",
            prompt: "Traduisez : « Perché vuole lavorare da noi? »",
            options: ["Pourquoi voulez-vous travailler chez nous ?", "Quand commencez-vous ?", "Où travaillez-vous ?", "Combien gagnez-vous ?"],
            answer: "0",
            explanation: "Question classique d'entretien : pourquoi voulez-vous travailler chez nous ?",
            points: 2,
          },
        ],
      },
    },
  ];

  for (const c of courses) {
    const course = await db.trainingCourse.create({
      data: {
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        level: c.level,
        durationHours: c.durationHours,
        isPublished: true,
        trainerId: trainer!.id,
      },
    });

    for (const [mi, m] of c.modules.entries()) {
      const courseModule = await db.courseModule.create({
        data: { courseId: course.id, title: m.title, order: mi },
      });
      for (const [li, l] of m.lessons.entries()) {
        await db.lesson.create({
          data: {
            moduleId: courseModule.id,
            title: l.title,
            content: l.content,
            videoUrl: l.videoUrl ?? null,
            durationMin: l.durationMin,
            order: li,
            isPublished: true,
          },
        });
      }
    }

    const ex = await db.exercise.create({
      data: {
        courseId: course.id,
        title: c.exercise.title,
        type: c.exercise.type,
        passingScore: c.exercise.passingScore,
        timeLimitMin: c.exercise.timeLimitMin,
        order: 0,
      },
    });
    for (const [qi, q] of c.exercise.questions.entries()) {
      await db.question.create({
        data: {
          exerciseId: ex.id,
          type: q.type as never,
          prompt: q.prompt,
          options: JSON.stringify(q.options),
          answer: q.answer,
          explanation: q.explanation,
          points: q.points,
          order: qi,
        },
      });
    }
  }
  console.log("✓ Seeded 3 training courses (A1, A2, B1) with modules, lessons & exams.");

  // Enroll the demo candidate in the A1 course
  const candidate = await db.user.findFirst({ where: { role: "Candidate" } });
  const a1Course = await db.trainingCourse.findFirst({ where: { level: "A1" } });
  if (candidate && a1Course) {
    await db.enrollment.create({
      data: { candidateId: candidate.id, courseId: a1Course.id, status: "Active", progressPct: 0 },
    });
    console.log("✓ Demo candidate enrolled in A1 course.");
  }
}

/**
 * Seed an immigration agent + an immigration case (with checklist) for the demo
 * candidate so LOT 7 is fully testable.
 */
async function seedImmigration() {
  if (await db.immigrationCase.count() > 0) {
    console.log("✓ Immigration cases already exist — skipping immigration seed.");
    return;
  }

  const agentEmail = "agent.immigration@coorizon.com";
  let agent = await db.user.findUnique({ where: { email: agentEmail } });
  if (!agent) {
    const passwordHash = await hashPassword("Agent2024!");
    agent = await db.user.create({
      data: {
        email: agentEmail,
        passwordHash,
        role: ROLES.ImmigrationAgent,
        status: "Active",
        isActive: true,
        firstName: "Sofia",
        lastName: "Conti",
      },
    });
    console.log("✓ Immigration agent created: agent.immigration@coorizon.com / Agent2024!");
  }

  const candidate = await db.user.findFirst({ where: { role: "Candidate" } });
  if (!candidate) { console.log("✗ No candidate for immigration seed"); return; }

  const offer = await db.jobOffer.findFirst({ where: { status: "Published" } });

  const immigrationCase = await db.immigrationCase.create({
    data: {
      candidateId: candidate.id,
      agentId: agent.id,
      jobOfferId: offer?.id,
      companyId: offer?.companyId,
      status: "InProgress",
      priority: "Normal",
      notes: "Dossier en cours. Documents principaux reçus. En attente de vérification du contrat.",
      openedAt: new Date(),
    },
  });

  const checklist = [
    { title: "Ouverture du dossier", description: "Création du dossier et collecte des informations initiales.", order: 0 },
    { title: "Vérification d'identité", description: "Vérification du passeport et de la pièce d'identité.", order: 1 },
    { title: "Collecte des justificatifs", description: "CV, diplômes, attestations de travail, casier judiciaire.", order: 2 },
    { title: "Vérification du contrat", description: "Vérification du contrat de travail signé par l'entreprise italienne.", order: 3 },
    { title: "Préparation des démarches", description: "Préparation du dossier de demande d'autorisation de travail (Nulla Osta).", order: 4 },
    { title: "Suivi des autorisations", description: "Suivi de la demande auprès des autorités italiennes.", order: 5 },
    { title: "Suivi du visa", description: "Demande et suivi du visa de travail auprès du consulat.", order: 6 },
    { title: "Préparation au départ", description: "Billet d'avion, hébergement, formalités de départ.", order: 7 },
    { title: "Clôture", description: "Clôture du dossier après arrivée en Italie.", order: 8 },
  ];

  for (const t of checklist) {
    await db.immigrationTask.create({
      data: {
        caseId: immigrationCase.id,
        title: t.title,
        description: t.description,
        status: t.order < 2 ? "Done" : t.order === 2 ? "InProgress" : "Todo",
        order: t.order,
        completedAt: t.order < 2 ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) : null,
        dueDate: t.order >= 2 && t.order <= 6 ? new Date(Date.now() + (t.order * 7) * 24 * 60 * 60 * 1000) : null,
        assigneeId: agent.id,
      },
    });
  }

  console.log("✓ Seeded 1 immigration case with 9-task checklist.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
