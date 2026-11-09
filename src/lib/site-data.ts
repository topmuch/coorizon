import {
  Building2,
  ChefHat,
  Tractor,
  HardHat,
  HeartPulse,
  Wrench,
  Cpu,
  Truck,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  city: string;
  region: string;
  sector: string;
  contract: string;
  italianLevel: string;
  salary: string;
  postedDays: number;
  positions: number;
  description: string;
  featured?: boolean;
}

export interface Sector {
  name: string;
  slug: string;
  icon: LucideIcon;
  count: number;
  description: string;
  color: string;
}

export interface Course {
  id: string;
  level: string;
  title: string;
  subtitle: string;
  duration: string;
  lessons: number;
  modules: number;
  levelLabel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  description: string;
  color: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  rating: number;
  initials: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export interface Partner {
  name: string;
  sector: string;
  location: string;
  size: string;
}

export interface JourneyStep {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const sectors: Sector[] = [
  {
    name: "Hôtellerie & Restauration",
    slug: "hotellerie-restauration",
    icon: ChefHat,
    count: 142,
    description: "Cuisiniers, serveurs, réceptionnistes et chefs pour les hôtels et restaurants italiens.",
    color: "text-italian-red",
  },
  {
    name: "Agriculture & Agroalimentaire",
    slug: "agriculture",
    icon: Tractor,
    count: 98,
    description: "Ouvriers agricoles, techniciens et opérateurs pour les exploitations et l'agroalimentaire.",
    color: "text-brand-green",
  },
  {
    name: "BTP & Construction",
    slug: "btp",
    icon: HardHat,
    count: 87,
    description: "Maçons, charpentiers, électriciens et chefs de chantier pour le secteur du bâtiment.",
    color: "text-brand",
  },
  {
    name: "Soins & Santé",
    slug: "sante",
    icon: HeartPulse,
    count: 64,
    description: "Aides-soignants, infirmiers et personnel de soin pour établissements de santé.",
    color: "text-italian-red",
  },
  {
    name: "Industrie & Mécanique",
    slug: "industrie",
    icon: Wrench,
    count: 73,
    description: "Opérateurs machines, soudeurs et techniciens de maintenance industrielle.",
    color: "text-navy",
  },
  {
    name: "Logistique & Transport",
    slug: "logistique",
    icon: Truck,
    count: 56,
    description: "Chauffeurs, manutentionnaires et responsables d'entrepôt pour la logistique.",
    color: "text-brand",
  },
  {
    name: "Tech & Numérique",
    slug: "tech",
    icon: Cpu,
    count: 41,
    description: "Développeurs, analystes et techniciens IT pour les entreprises technologiques.",
    color: "text-brand-green",
  },
  {
    name: "Commerce & Services",
    slug: "commerce",
    icon: Briefcase,
    count: 52,
    description: "Vendeurs, conseillers commerciaux et personnel de service aux entreprises.",
    color: "text-navy",
  },
];

export const jobOffers: JobOffer[] = [
  {
    id: "job-001",
    title: "Chef de partie cuisine italienne",
    company: "Ristorante Bella Toscana",
    city: "Florence",
    region: "Toscane",
    sector: "Hôtellerie & Restauration",
    contract: "CDI",
    italianLevel: "B1",
    salary: "1 600 – 1 900 € / mois",
    postedDays: 2,
    positions: 2,
    description:
      "Rejoignez la brigade d'un restaurant renommé de Florence. Préparation des plats de la cuisine toscane traditionnelle, gestion de la partie chaude et respect des normes d'hygiène HACCP.",
    featured: true,
  },
  {
    id: "job-002",
    title: "Aide-soignant / OSS en maison de retraite",
    company: "Casa Serena Bergamo",
    city: "Bergame",
    region: "Lombardie",
    sector: "Soins & Santé",
    contract: "CDI",
    italianLevel: "B1",
    salary: "1 500 – 1 750 € / mois",
    postedDays: 4,
    positions: 5,
    description:
      "Accompagnement des résidents dans les actes de la vie quotidienne, surveillance de l'état de santé et collaboration avec l'équipe soignante. Logement possible.",
    featured: true,
  },
  {
    id: "job-003",
    title: "Opérateur de production agroalimentaire",
    company: "Pastificio Laziale",
    city: "Rome",
    region: "Latium",
    sector: "Agriculture & Agroalimentaire",
    contract: "CDI",
    italianLevel: "A2",
    salary: "1 400 – 1 600 € / mois",
    postedDays: 1,
    positions: 8,
    description:
      "Fabrication de pâtes fraîches : contrôle qualité, conditionnement et maintenance de premier niveau des lignes de production.",
  },
  {
    id: "job-004",
    title: "Maçon polyvalent chantier",
    company: "EdilCostruzioni Verona",
    city: "Vérone",
    region: "Vénétie",
    sector: "BTP & Construction",
    contract: "CDI",
    italianLevel: "A2",
    salary: "1 550 – 1 800 € / mois",
    postedDays: 6,
    positions: 6,
    description:
      "Montage de structures en maçonnerie, coffrage, coulage de béton et finitions. Expérience requise sur chantier, équipements fournis.",
  },
  {
    id: "job-005",
    title: "Réceptionniste bilingue hôtel 4★",
    company: "Grand Hotel Liguria",
    city: "Gênes",
    region: "Ligurie",
    sector: "Hôtellerie & Restauration",
    contract: "Saisonnier",
    italianLevel: "B2",
    salary: "1 500 – 1 700 € / mois",
    postedDays: 3,
    positions: 3,
    description:
      "Accueil des clients, check-in/out, gestion des réservations et relation client en italien, français et anglais.",
  },
  {
    id: "job-006",
    title: "Chauffeur poids lourd international",
    company: "TransEuropa Logistica",
    city: "Bologne",
    region: "Émilie-Romagne",
    sector: "Logistique & Transport",
    contract: "CDI",
    italianLevel: "B1",
    salary: "1 800 – 2 200 € / mois",
    postedDays: 5,
    positions: 4,
    description:
      "Transport de marchandises sur l'Italie et l'Europe. Permis CE requis, tournées régulières et repos hebdomadaire respecté.",
  },
];

export const courses: Course[] = [
  {
    id: "course-a1",
    level: "A1",
    title: "Italien débutant — Premiers pas",
    subtitle: "Niveau A1 du CECRL",
    duration: "60 h",
    lessons: 42,
    modules: 6,
    levelLabel: "A1",
    description:
      "Apprenez les bases de l'italien : salutations, présentations, vocabulaire de la vie quotidienne et premières structures grammaticales.",
    color: "bg-brand",
  },
  {
    id: "course-a2",
    level: "A2",
    title: "Italien élémentaire — Vie pratique",
    subtitle: "Niveau A2 du CECRL",
    duration: "70 h",
    lessons: 48,
    modules: 7,
    levelLabel: "A2",
    description:
      "Communiquez dans des situations simples : achats, transports, santé et travail. Vocabulaire professionnel de base.",
    color: "bg-brand-green",
  },
  {
    id: "course-b1",
    level: "B1",
    title: "Italien intermédiaire — Monde du travail",
    subtitle: "Niveau B1 du CECRL",
    duration: "90 h",
    lessons: 56,
    modules: 8,
    levelLabel: "B1",
    description:
      "Maîtrisez l'italien professionnel : entretiens, contrats, communication en entreprise et culture du travail italienne.",
    color: "bg-navy",
  },
  {
    id: "course-b2",
    level: "B2",
    title: "Italien avancé — Autonomie pro",
    subtitle: "Niveau B2 du CECRL",
    duration: "100 h",
    lessons: 62,
    modules: 9,
    levelLabel: "B2",
    description:
      "Argumentez, négociez et présentez en italien avec aisance. Compréhension fine de documents professionnels et médias.",
    color: "bg-italian-red",
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Aïssatou Diallo",
    role: "Aide-soignante",
    location: "Bergame, Italie",
    quote:
      "Grâce à COORIZON, j'ai suivi la formation en italien puis été recrutée dans une maison de retraite. L'accompagnement pour le visa a été impeccable.",
    rating: 5,
    initials: "AD",
  },
  {
    id: "t2",
    name: "Mamadou Sow",
    role: "Chef de partie",
    location: "Florence, Italie",
    quote:
      "La plateforme m'a permis de mettre en valeur mon CV et de postuler à des offres sérieuses. Aujourd'hui je travaille dans un restaurant toscan.",
    rating: 5,
    initials: "MS",
  },
  {
    id: "t3",
    name: "Fatou Ndiaye",
    role: "Opératrice agroalimentaire",
    location: "Rome, Italie",
    quote:
      "Tout le parcours, de la formation linguistique au dossier administratif, a été clair et structuré. Mon agent répondait à toutes mes questions.",
    rating: 5,
    initials: "FN",
  },
];

export const partners: Partner[] = [
  { name: "Ristorante Bella Toscana", sector: "Restauration", location: "Florence", size: "30-50 employés" },
  { name: "Casa Serena Bergamo", sector: "Santé", location: "Bergame", size: "100-200 employés" },
  { name: "Pastificio Laziale", sector: "Agroalimentaire", location: "Rome", size: "50-100 employés" },
  { name: "EdilCostruzioni Verona", sector: "BTP", location: "Vérone", size: "50-100 employés" },
  { name: "Grand Hotel Liguria", sector: "Hôtellerie", location: "Gênes", size: "100-200 employés" },
  { name: "TransEuropa Logistica", sector: "Transport", location: "Bologne", size: "200+ employés" },
  { name: "TecnoIndustria Milano", sector: "Industrie", location: "Milan", size: "200+ employés" },
  { name: "Vivere Commerce Padova", sector: "Commerce", location: "Padoue", size: "30-50 employés" },
];

export const journeySteps: JourneyStep[] = [
  {
    step: 1,
    title: "Inscription & profil",
    description: "Créez votre compte candidat, complétez votre profil et téléversez vos documents.",
    icon: Building2,
  },
  {
    step: 2,
    title: "Formation en italien",
    description: "Suivez les cours adaptés à votre niveau (A1 à C2) et passez les examens en ligne.",
    icon: Briefcase,
  },
  {
    step: 3,
    title: "Candidature aux offres",
    description: "Postulez aux offres d'emploi des entreprises italiennes partenaires de COORIZON.",
    icon: HeartPulse,
  },
  {
    step: 4,
    title: "Sélection & entretien",
    description: "Les recruteurs présélectionnent les profils et programment les entretiens.",
    icon: Cpu,
  },
  {
    step: 5,
    title: "Dossier administratif",
    description: "Un agent vous accompagne pour le contrat, le visa et les démarches de départ.",
    icon: Truck,
  },
  {
    step: 6,
    title: "Départ & suivi",
    description: "Vous rejoignez l'Italie et bénéficiez d'un suivi pour votre intégration professionnelle.",
    icon: HardHat,
  },
];

export const faqItems: FaqItem[] = [
  {
    category: "Inscription",
    question: "L'inscription sur COORIZON est-elle payante ?",
    answer:
      "La création de compte candidat et la consultation des offres sont gratuites. Certaines formations avancées et prestations d'accompagnement peuvent être payantes et sont clairement indiquées avant tout engagement.",
  },
  {
    category: "Inscription",
    question: "Qui peut s'inscrire comme candidat ?",
    answer:
      "Toute personne résidant au Sénégal ou en Afrique de l'Ouest, majeure, souhaitant travailler et s'installer professionnellement en Italie. Un profil complet et des documents validés augmentent vos chances de sélection.",
  },
  {
    category: "Formation",
    question: "Quel niveau d'italien est requis pour travailler en Italie ?",
    answer:
      "La plupart des offres demandent un niveau A2 minimum, souvent B1 pour les postes en contact avec le public. COORIZON propose des parcours du niveau A1 au niveau C2, avec examens et attestations internes.",
  },
  {
    category: "Formation",
    question: "Les attestations sont-elles des certifications officielles ?",
    answer:
      "Non. Les attestations générées par COORIZON sont internes et attestent de votre suivi et réussite aux parcours de la plateforme. Elles ne se substituent pas aux certifications officielles reconnues par les institutions.",
  },
  {
    category: "Recrutement",
    question: "Comment les entreprises vérifient-elles les profils ?",
    answer:
      "Chaque entreprise partenaire est validée par l'administration COORIZON avant de pouvoir publier des offres. Les recruteurs consultent les profils, les CV et les documents validés par nos équipes.",
  },
  {
    category: "Recrutement",
    question: "Combien de temps prend un processus de recrutement ?",
    answer:
      "Cela dépend du poste et de l'entreprise. En moyenne, entre la candidature et le départ, comptez 2 à 4 mois, incluant la formation linguistique, l'entretien et les démarches administratives (visa, contrat).",
  },
  {
    category: "Immigration",
    question: "COORIZON garantit-elle l'obtention d'un visa ?",
    answer:
      "Non. Aucune autorisation ou visa n'est garanti. Nos agents vous accompagnent dans la préparation et le suivi du dossier, mais les décisions relèvent des autorités consulaires et gouvernementales italiennes.",
  },
  {
    category: "Immigration",
    question: "Quels documents dois-je préparer ?",
    answer:
      "Passeport en cours de validité, carte d'identité, CV, diplômes, attestations de travail et casier judiciaire. Une checklist personnalisée est mise à disposition dans votre dossier administratif.",
  },
];

export const stats = [
  { label: "Candidats accompagnés", value: "3 200+", icon: Briefcase },
  { label: "Entreprises partenaires", value: "180+", icon: Building2 },
  { label: "Offres d'emploi actives", value: "610+", icon: HeartPulse },
  { label: "Taux de réussite formation", value: "94%", icon: Cpu },
];
