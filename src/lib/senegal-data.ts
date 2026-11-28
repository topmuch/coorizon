/**
 * Données de référence pour l'inscription et le profil candidat COORIZON.
 *
 * - Départements du Sénégal (centre de formation rattaché au département)
 * - Régions italiennes (« Dans quelle région italienne souhaiteriez-vous travailler ? »)
 * - Professions groupées par secteur (liste de référence formationsenegal.net)
 * - Niveaux d'études (Élémentaire → Doctorat)
 */

// ─── Départements du Sénégal, groupés par région ────────────────────────────

export interface SenegalRegion {
  region: string;
  departments: string[];
}

export const SENEGAL_REGIONS: SenegalRegion[] = [
  { region: "Dakar", departments: ["Dakar", "Guédiawaye", "Keur Massar", "Pikine", "Rufisque"] },
  { region: "Diourbel", departments: ["Bambey", "Diourbel", "Mbacké"] },
  { region: "Fatick", departments: ["Fatick", "Foundiougne", "Gossas"] },
  { region: "Kaffrine", departments: ["Birkelane", "Kaffrine", "Koungheul", "Malem Hodar"] },
  { region: "Kaolack", departments: ["Guinguinéo", "Kaolack", "Nioro du Rip"] },
  { region: "Kédougou", departments: ["Kédougou", "Salémata", "Saraya"] },
  { region: "Kolda", departments: ["Kolda", "Médina Yoro Foulah", "Vélingara"] },
  { region: "Louga", departments: ["Kébémer", "Linguère", "Louga"] },
  { region: "Matam", departments: ["Kanel", "Matam", "Ranérou Ferlo"] },
  { region: "Saint-Louis", departments: ["Dagana", "Podor", "Saint-Louis"] },
  { region: "Sédhiou", departments: ["Bounkiling", "Goudomp", "Sédhiou"] },
  { region: "Tambacounda", departments: ["Bakel", "Goudiry", "Koumpentoum", "Tambacounda"] },
  { region: "Thiès", departments: ["Mbour", "Thiès", "Tivaouane"] },
  { region: "Ziguinchor", departments: ["Bignona", "Oussouye", "Ziguinchor"] },
];

/** Liste plate de tous les départements (ordre alphabétique). */
export const SENEGAL_DEPARTMENTS: string[] = SENEGAL_REGIONS.flatMap(
  (r) => r.departments
).sort((a, b) => a.localeCompare(b, "fr"));

/** Retourne la région d'un département donné (ou null). */
export function regionOfDepartment(department: string | null | undefined): string | null {
  if (!department) return null;
  const found = SENEGAL_REGIONS.find((r) => r.departments.includes(department));
  return found ? found.region : null;
}

// ─── Régions italiennes (liste de référence formationsenegal.net) ───────────

export const ITALIAN_REGIONS: string[] = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
];

// ─── Professions groupées par secteur (liste de référence) ──────────────────

export interface ProfessionGroup {
  group: string;
  professions: string[];
}

export const PROFESSION_GROUPS: ProfessionGroup[] = [
  {
    group: "Agriculture / Agroalimentaire",
    professions: [
      "Ouvrier agricole maraîcher",
      "Ouvrier agricole serres et cultures sous abri",
      "Tractoriste / Conducteur d'engins agricoles",
      "Ouvrier élevage bovins/volailles/porcs",
      "Ouvrier pisciculture",
      "Boulanger/Pétrisseur",
      "Boucher/Préparateur de viande",
      "Opérateur industrie laitière/fromager",
    ],
  },
  {
    group: "Bâtiment / Construction",
    professions: [
      "Maçon",
      "Ferrailleur",
      "Coffreur/Bancheur",
      "Poseur de carrelage et dallage",
      "Plâtrier/Plaquiste",
      "Électricien bâtiment",
      "Plombier/Installateur sanitaire",
      "Peintre en bâtiment",
      "Manœuvre spécialisé BTP",
    ],
  },
  {
    group: "Tourisme / Restauration",
    professions: [
      "Pizzaiolo",
      "Cuisinier",
      "Serveur/Serveuse de salle",
      "Barman",
      "Pâtissier",
      "Employé housekeeping/hôtel",
      "Réceptionniste",
    ],
  },
  {
    group: "Logistique / Transport",
    professions: [
      "Chauffeur poids lourd CQC",
      "Cariste/Manutentionnaire chariot élévateur",
      "Magasinier/Préparateur de commandes",
      "Manutentionnaire",
    ],
  },
  {
    group: "Mécanique / Métallurgie",
    professions: [
      "Soudeur",
      "Tourneur/Fraiseur",
      "Mécanicien auto/industriel",
      "Monteur-assembleur mécanique",
      "Chaudronnier",
      "Technicien maintenance industrielle",
    ],
  },
  {
    group: "Autres secteurs",
    professions: [
      "Employé de rayon",
      "Caissier",
      "Aide familiale",
      "Auxiliaire de vie",
    ],
  },
];

/** Liste plate de toutes les professions. */
export const ALL_PROFESSIONS: string[] = PROFESSION_GROUPS.flatMap(
  (g) => g.professions
);

// ─── Niveaux d'études (liste COORIZON) ──────────────────────────────────────

export const EDUCATION_LEVEL_OPTIONS: string[] = [
  "Élémentaire (CI → CM2, diplôme CFEE)",
  "Moyen / Collège (6e → 3e, diplôme BFEM)",
  "Secondaire / Lycée (Seconde → Terminale, diplôme Bac)",
  "Formation professionnelle (CAP, BEP, BT)",
  "Supérieur – Licence (Bac+3)",
  "Supérieur – Master (Bac+5)",
  "Supérieur – Doctorat (Bac+8)",
];
