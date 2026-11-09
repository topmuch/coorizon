# Task 5-a — Public pages: job-offers & training

**Agent**: page-builder (LOT 1 — visual identity & public website)
**Scope**: Two client pages for the COORIZON platform, rendered inside the in-app hash router.

## Files created

### 1. `src/components/site/pages/job-offers.tsx` — `JobOffersPage`
- **Hero**: `PageHeader` with eyebrow "Offres d'emploi", title "Trouvez votre poste en Italie", and a French description about partner companies recruiting African talent.
- **Search / filter bar**: white `Card` overlapping the navy header (`-mt-8`, `relative z-10`) containing a 12-column responsive form:
  - keyword `Input` (with `Search` icon, label "Mot-clé")
  - sector `Select` (`Briefcase` icon, options from `sectors` + "Tous les secteurs" = `all`)
  - italian level `Select` (`Languages` icon, A1→C2 + "Tous les niveaux" = `all`)
  - city/region `Input` (`MapPin` icon, placeholder "Florence…")
  - `Rechercher` button + a `Réinitialiser les filtres` ghost button (only shown when filters active).
  - Form is controlled local state; on submit it commits to an `applied` state and shows a `useToast` confirmation.
  - Initial values pre-filled from `useSiteRouter().params` (`q`, `sector`, `city`, `level`).
- **Filtering** (`React.useMemo` on `applied`):
  - keyword → case-insensitive match on title + company + description
  - sector → maps URL slug → `sectors[].name` and compares to `offer.sector`
  - level → strict equality on `offer.italianLevel`
  - city → case-insensitive match on `offer.city` or `offer.region`
- **Results**: `SectionShell` with a `SectionHeading` (left-aligned) + a small count pill (`Users` icon + count). Below: responsive grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` of `JobOfferCard`. Meta line shown in the heading description ("X offres correspondent à votre recherche.").
- **Empty state**: dashed `Card` with `Search` icon, friendly French copy and a `Réinitialiser les filtres` button.
- **CTA band**: `bg-brand` section with white text, eyebrow pill (`Sparkles`), H2, paragraph and two buttons — primary "Créer mon compte candidat" (`navigate("register-candidate")`) and outline "Me former en italien" (`navigate("training")`).

### 2. `src/components/site/pages/training.tsx` — `TrainingPage`
- **Hero**: `PageHeader` with eyebrow "Formation en italien", title "Maîtrisez l'italien, niveau par niveau", description about A1→C2 courses.
- **CECRL levels strip**: `SectionShell` (py-12/14) with `SectionHeading` + `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3` of 6 colored level badges (A1=Débutant, A2=Élémentaire, B1=Intermédiaire, B2=Avancé, C1=Autonome, C2=Maîtrise). Each pill uses a colored disc with the level code + the descriptor below.
- **Courses catalog**: `SectionShell` with `bg-surface`. Renders `courses` array via a local `CourseCard` component (4-column grid on `lg`, 2-col on `sm`, 1-col on mobile):
  - Colored header band (`course.color`) with big `levelLabel` + `GraduationCap` icon + subtitle
  - Title + 3-line clamped description
  - 3-cell stats row: `Clock` duration · `Layers` modules · `ListVideo` lessons
  - Footer `CardFooter` with full-width `S'inscrire à cette formation` button → `navigate("register-candidate")`.
- **"Comment fonctionne la formation"**: `SectionShell` (white) with 4 feature cards (icon in colored rounded box, title, description). Icons: `BookOpen` (Modules & leçons), `PlayCircle` (Vidéos & PDF), `ListChecks` (Exercices & quiz chronométrés), `Award` (Examens & attestations).
- **"Attestations internes"** info card: `Card` with `border-brand/20 bg-brand/5`. Left: `ShieldCheck` in brand-tinted box. Right: title + `Badge` "Interne COORIZON" + descriptive paragraph + a 2-column checklist (`CheckCircle2` items: name, formation, level, note, date, unique number, QR code) + a prominent disclaimer block (`border-italian-red/20 bg-italian-red/5` with `Info` icon) clarifying these are INTERNAL attestations, NOT official certifications (CELI/CILS/PLIDA).
- **Final CTA**: `bg-brand` band with eyebrow pill (`GraduationCap`), H2, paragraph, primary button "Créer mon compte candidat" (`navigate("register-candidate")`) and outline button "Voir les offres d'emploi" (`navigate("jobs")`).

## Conventions respected
- `"use client";` at the top of both files.
- Only the two specified files were written. No other files modified. No new UI components, no new routes, no API routes.
- French copy throughout. Italian handled as secondary via the "italian red" color tokens used in the design system.
- Reused `PageHeader`, `SectionHeading`, `SectionShell`, `JobOfferCard`, `useSiteRouter`, `useToast`, and shadcn/ui `Input`/`Select`/`Button`/`Card`/`Badge`.
- Brand color classes: `bg-navy`, `bg-brand`, `bg-brand-green`, `bg-italian-red`, `bg-surface`, `text-navy`, `text-brand`, `text-brand-green`, `text-italian-red`, `text-ink`.
- All imports are used; no `any`; no `console.log`; no fake data beyond `@/lib/site-data`.
- Responsive: mobile-first (`grid-cols-1` then `sm:` / `md:` / `lg:` breakpoints). Cards align with consistent `p-5`/`p-6` padding and `gap-5` spacing.
- Accessibility: semantic `<section>` blocks, form `<label htmlFor>` + `aria-label`, button text + icon, alt text not needed (no images), keyboard-focusable controls.

## Notes for downstream agents
- The `jobOffers[].sector` field stores the **sector name** (e.g. "Hôtellerie & Restauration"), NOT the slug. The filter maps URL slugs → names via the `sectors` array; if you add new offers, keep the `sector` string consistent with `sectors[].name`.
- The router exposes `params: URLSearchParams` and `navigate(route, params?)`. Initial filter pre-fill happens once on mount via `useState` initializers — subsequent URL changes do not reset the form (intentional, to match the UX of a search page).
- The training page only renders the 4 courses present in `@/lib/site-data` (A1, A2, B1, B2). The CECRL strip shows all 6 levels (A1→C2) for visual completeness; C1/C2 are not yet in the catalog.
