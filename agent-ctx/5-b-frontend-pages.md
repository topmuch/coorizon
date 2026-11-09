# Task 5-b — COORIZON Public Pages (Work in Italy, How It Works, Partners)

**Agent**: frontend-pages (Z.ai Code)
**Task ID**: 5-b
**Date**: 2025
**Scope**: Build three public-facing client pages for the COORIZON platform (LOT 1 — visual identity & public website).

## Files created (only these three)

1. `src/components/site/pages/work-in-italy.tsx` — `export function WorkInItalyPage()`
2. `src/components/site/pages/how-it-works.tsx` — `export function HowItWorksPage()`
3. `src/components/site/pages/partners.tsx` — `export function PartnersPage()`

No other files were modified.

## Shared infrastructure reused (already in repo)

- `@/components/site/sections/page-header` → `PageHeader` (navy hero band)
- `@/components/site/sections/section-heading` → `SectionHeading`, `SectionShell`
- `@/lib/site-router` (tsx) → `useSiteRouter().navigate(route, params?)`
- `@/lib/site-data` → `partners`, `journeySteps`, `sectors`
- shadcn/ui: `Button`, `Card`/`CardContent`, `Badge`
- lucide-react icons (French UI, Italian secondary labels)

## FILE 1 — WorkInItalyPage

Sections built:
1. `PageHeader` — eyebrow "Mobilité", title "Travailler en Italie", description about mobility/contracts/support. Two buttons in children: "Voir les offres" → `navigate("jobs")` (primary white: `bg-white text-navy`) and "S'inscrire" → `navigate("register-candidate")` (outline white-on-brand).
2. "Pourquoi l'Italie ?" — 4 feature cards (`sm:grid-cols-2 lg:grid-cols-4`): Marché dynamique (TrendingUp), Secteurs qui recrutent (Briefcase), Cadre de vie (Sun), Proximité culturelle (Globe). Icon box uses `bg-brand/10 text-brand`.
3. "Les types de contrat" (`bg-surface`) — 6 contract type cards (`sm:grid-cols-2 lg:grid-cols-3`): CDI/Indeterminato, CDD/Determinato, Saisonnier/Stagionale, Intérim/Interinale, Apprentissage/Apprendistato, Freelance/Partita IVA. Each card: french badge + italian name + description.
4. "Les démarches administratives" — vertical numbered timeline (`border-l-2 border-brand/20 pl-8` with absolute numbered circles `bg-brand text-white`) with 5 steps: Contrat de travail → Nulla Osta → Demande de visa → Départ → Permis de séjour. Each step has italian label and a feature icon (FileText, ShieldCheck, FileText, Plane, MapPin).
   - Disclaimer box as a `Card border-italian-red/30 bg-italian-red/5` with Info icon: "COORIZON ne garantit aucun visa ou autorisation. Les décisions relèvent des autorités italiennes compétentes."
5. "Secteurs qui recrutent" mini-section (`bg-surface`) — grid of sector chips from `sectors` data; each chip is a button that calls `navigate("jobs", { sector: slug })`.
6. Final CTA `bg-brand` band with "Créer mon compte" → `navigate("register-candidate")` and "Parcourir les offres" → `navigate("jobs")`, plus trust line (Inscription gratuite / Entreprises vérifiées / Accompagnement humain).

## FILE 2 — HowItWorksPage

Sections built:
1. `PageHeader` — eyebrow "Parcours", title "Comment ça marche", description about structured candidate journey. Two buttons: "Démarrer mon parcours" → `navigate("register-candidate")` (primary white) and "Voir les offres" → `navigate("jobs")` (outline white).
2. "Le parcours candidat" — vertical timeline rendering `journeySteps`. Container: `border-l-2 border-brand/20 pl-8 sm:pl-10` with absolute numbered circles (`bg-brand text-white ring-4 ring-white`). Each step rendered inside a `Card` showing the step icon (from data), an "Étape N" eyebrow, title and description.
3. "Pour les recruteurs" (`bg-surface`) — 2-column layout. Left: `SectionHeading align="left"` + intro text + two buttons (`navigate("register-recruiter")` and `navigate("partners")`). Right: a `Card` checklist with the 6 recruiter steps (Inscription & validation admin → Profil entreprise → Publication d'offres → Réception des candidatures → Présélection & entretien → Recrutement & accompagnement), each with a numbered CheckCircle2 badge.
4. "Pour les formateurs" — 4 feature cards (Création de leçons, Vidéos & exercices, Correction & examens, Suivi de la progression) using brand-green icon accents, plus a "Découvrir les formations" outline button → `navigate("training")`.
5. Final CTA `bg-brand` band — 2-column: left CTA with "Créer un compte candidat" → `navigate("register-candidate")` and "Espace recruteur" → `navigate("register-recruiter")`; right grid of 4 `CtaFeature` cards (Candidats, Recruteurs, Formateurs, Accompagnement).

`CtaFeature` is a small local helper component (icon + title + desc) consistent with the existing `home-sections.tsx` pattern.

## FILE 3 — PartnersPage

Sections built:
1. `PageHeader` — eyebrow "Entreprises", title "Nos entreprises partenaires", description about verified Italian companies validated by COORIZON admin. Two buttons: "Voir les offres" → `navigate("jobs")` (primary white) and "Devenir partenaire" → `navigate("register-recruiter")` (outline white).
2. Stats strip (`bg-surface` band, reuses the home `StatsBand` style) — 4 inline stats: 180+ entreprises (Building2), 610+ offres (Briefcase), 8 secteurs (TrendingUp), 94% satisfaction (CheckCircle2).
3. Partners grid (`SectionShell`) — `partners` rendered as cards in `sm:grid-cols-2 lg:grid-cols-3 gap-5`. Each card: Building2 icon box in `bg-navy/5 text-navy`, a green `ShieldCheck` "verified" badge in the top-right, name, sector (secondary Badge) + location (outline Badge with MapPin), size text, and a `variant="ghost"` "Voir les offres" button → `navigate("jobs")` (text-brand). Hover: `hover:-translate-y-0.5 hover:shadow-md`, arrow nudges on hover.
4. "Devenir entreprise partenaire" (`bg-surface`) — 2-column. Left: `SectionHeading align="left"` + grid of 4 benefit cards (Talents préformés, Profils vérifiés, Accompagnement administratif, Visibilité). Right: a sticky `Card` with brand icon, "Créer un compte recruteur" button → `navigate("register-recruiter")`, and a note that each recruiter account is validated by the COORIZON admin (24–48h ouvrées) before publishing offers.
5. "Secteurs représentés" — grid of sector chips from `sectors` data; each chip button calls `navigate("jobs", { sector: slug })`.
6. Final CTA `bg-brand` band — "Votre entreprise recrute en Italie ?" with "Devenir entreprise partenaire" → `navigate("register-recruiter")` and "Nous contacter" → `navigate("contact")`, plus trust line (Comptes vérifiés / Validation sous 48h / Talents préformés).

## Design system adherence

- Brand utility classes from `globals.css` used throughout: `bg-navy`, `bg-brand`, `bg-brand-green`, `bg-italian-red`, `bg-surface`, `text-navy`, `text-brand`, `text-brand-green`, `text-italian-red`, plus shadcn tokens (`bg-card`, `bg-muted`, `text-muted-foreground`, `border`, `bg-accent`).
- No indigo/blue outside the brand blue (`bg-brand` / `text-brand` = #2563A6).
- All headings use `text-navy`. Section titles go through `SectionHeading` (which already styles `text-navy`).
- Mobile-first responsive: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3/4` patterns. Buttons stack on mobile (`flex-col sm:flex-row`).
- Semantic HTML: `<section>`, `<ol>` for timelines, `<h1>` (in PageHeader), `<h2>` (in SectionHeading), `<h3>` for cards, `<h4>` for sub-items.
- Accessible: icon-only elements have `aria-hidden` or `aria-label`; the numbered timeline circles are decorative (`aria-hidden="true"`); each section has descriptive content.
- Disclaimer boxes (File 1) clearly state COORIZON does not guarantee visas/authorizations; the File 3 right CTA card notes that recruiter accounts are validated by admin before publishing offers.
- `transition-all hover:-translate-y-0.5 hover:shadow-md` used on interactive cards for premium feel.
- Final CTA bands use `bg-brand` with `bg-grid opacity-20` overlay, consistent with existing `FinalCtaSection`.

## TypeScript & quality

- All three files start with `"use client";`.
- Strict typing throughout — no `any`. Interfaces defined locally for inline content arrays (`WhyItalyFeature`, `ContractType`, `AdminStep`, `RecruiterStep`, `TrainerFeature`, `PartnerStat`, `PartnerBenefit`).
- No unused imports (Badge import was removed from how-it-works.tsx after review).
- No `console.log`. No fake data — only `partners`, `journeySteps`, `sectors` imported from `@/lib/site-data`.
- `CtaFeature` helper component defined in `how-it-works.tsx` only (mirrors the existing one in `home-sections.tsx` so we don't add cross-file dependencies).

## Notes for downstream agents

- These pages render inside the in-app hash router (the `SiteRouterProvider` in `src/lib/site-router.tsx`). The integrator (task that wires up `site-app.tsx` or the `AppShell`) should add cases for `"work-in-italy"`, `"how-it-works"`, `"partners"` routes that render `<WorkInItalyPage/>`, `<HowItWorksPage/>`, `<PartnersPage/>` respectively. The router already declares these route keys.
- All `navigate()` calls target valid `SiteRoute` values: `jobs`, `register-candidate`, `register-recruiter`, `training`, `partners`, `contact`.
- No API calls were needed (purely informational pages driven by shared static data + local content arrays).
