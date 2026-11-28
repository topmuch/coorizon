"use client";

import * as React from "react";
import {
  Scale,
  ShieldCheck,
  FileText,
  Cookie,
  Building2,
  MapPin,
  Mail,
  Phone,
  Server,
  Copyright,
  AlertCircle,
  UserCheck,
  Database,
  Clock,
  Lock,
  Users,
  FileSignature,
  Wallet,
  Ban,
  RefreshCw,
  Gavel,
  HelpCircle,
  CheckCircle2,
  Eye,
  XCircle,
  ArrowRight,
  Briefcase,
  Plane,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/site/sections/page-header";
import { SectionShell } from "@/components/site/sections/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSiteRouter, type SiteRoute } from "@/lib/site-router";

/**
 * Legal pages accessible from the site footer:
 *   • Mentions légales            (/mentions-legales)
 *   • Politique de confidentialité (/politique-confidentialite)
 *   • Conditions générales         (/conditions-generales)
 *   • Cookies                      (/cookies)
 *
 * Content is static French legal copy written for COORIZON (recrutement
 * international, formation en italien, accompagnement à l'immigration
 * professionnelle vers l'Italie — basé à Dakar, Sénégal).
 */

const LAST_UPDATE = "28/11/2026";

// ─── Shared building blocks ────────────────────────────────────────────────

interface LegalSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

function LegalSection({ icon: Icon, title, children }: LegalSectionProps) {
  return (
    <section className="scroll-mt-24" aria-labelledby={`legal-${title}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
        <h2 id={`legal-${title}`} className="text-lg font-bold text-navy sm:text-xl">
          {title}
        </h2>
      </div>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function LegalList({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="ml-1 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LegalHighlight({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success";
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
      : tone === "success"
        ? "border-brand-green/40 bg-brand-green/5 dark:border-brand-green/30 dark:bg-brand-green/10"
        : "border-brand/30 bg-brand/5 dark:border-brand/30 dark:bg-brand/10";
  const titleColor =
    tone === "warning"
      ? "text-amber-800 dark:text-amber-300"
      : tone === "success"
        ? "text-brand-green dark:text-brand-green"
        : "text-brand dark:text-brand";
  return (
    <div className={`rounded-lg border p-4 ${styles}`}>
      <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function LegalInfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-navy dark:text-foreground">{value}</p>
      </div>
    </div>
  );
}

/** Summary card + inter-links shared by every legal page. */
function LegalPageFooter({
  summary,
  related,
}: {
  summary: string;
  related: { label: string; route: SiteRoute }[];
}) {
  const { navigate } = useSiteRouter();
  return (
    <div className="mx-auto mt-12 max-w-4xl space-y-6">
      <Card>
        <CardContent className="p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Dernière mise à jour : {LAST_UPDATE}
          </p>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-navy dark:text-foreground">Voir aussi :</span>
        {related.map((r) => (
          <Button
            key={r.route}
            variant="outline"
            size="sm"
            onClick={() => navigate(r.route)}
            className="gap-1.5"
          >
            {r.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Mentions légales
// ═══════════════════════════════════════════════════════════════════════════

export function MentionsLegalesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Informations légales"
        title="Mentions légales"
        description="Informations relatives à l'éditeur du site COORIZON, à son hébergement et aux règles qui encadrent son utilisation."
      />
      <SectionShell>
        <div className="mx-auto max-w-4xl space-y-10">
          <LegalSection icon={Building2} title="Éditeur du site">
            <p>
              Le présent site est édité et exploité par <strong>COORIZON</strong>, plateforme de
              recrutement international, de formation en langue italienne et d&apos;accompagnement à
              l&apos;immigration professionnelle vers l&apos;Italie.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <LegalInfoRow icon={Building2} label="Raison sociale" value="COORIZON" />
              <LegalInfoRow
                icon={MapPin}
                label="Siège social"
                value="Sicap Liberté 4 N°5260, Dakar — Sénégal"
              />
              <LegalInfoRow icon={Phone} label="Téléphone" value="+221 71 090 70 70" />
              <LegalInfoRow icon={Mail} label="Email" value="contact@coorizon.com" />
            </div>
          </LegalSection>

          <LegalSection icon={UserCheck} title="Directeur de la publication">
            <p>
              La direction générale de COORIZON assure la direction de la publication du site et de
              l&apos;ensemble des contenus éditoriaux qui y sont diffusés (présentation des services,
              actualités, offres d&apos;emploi publiées par les entreprises partenaires).
            </p>
          </LegalSection>

          <LegalSection icon={Server} title="Hébergement">
            <p>
              Le site est hébergé sur une infrastructure cloud professionnelle. Les serveurs assurent
              une disponibilité continue du service ; les sauvegardes et la maintenance sont gérées
              par l&apos;équipe d&apos;exploitation de COORIZON. Les données des utilisateurs sont
              conservées dans des centres de données sécurisés, conformément à la politique de
              confidentialité de la plateforme.
            </p>
          </LegalSection>

          <LegalSection icon={Copyright} title="Propriété intellectuelle">
            <p>
              L&apos;ensemble des éléments du site (marque COORIZON, logo, chartes graphiques,
              textes, contenus pédagogiques, bases de données, code source) est la propriété
              exclusive de COORIZON ou de ses partenaires, et est protégé par le droit de la
              propriété intellectuelle.
            </p>
            <LegalList
              items={[
                "Toute reproduction, représentation, modification ou exploitation, totale ou partielle, sans autorisation écrite préalable est interdite.",
                "Les documents transmis par les candidats (CV, diplômes, attestations) demeurent la propriété de leur auteur ; COORIZON n'y accède que pour le traitement de leur dossier.",
                "Les marques citées (entreprises partenaires, institutions) appartiennent à leurs propriétaires respectifs.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={AlertCircle} title="Responsabilité">
            <LegalList
              items={[
                "COORIZON met en œuvre des moyens raisonnables pour garantir l'exactitude des informations publiées ; elle ne peut toutefois garantir l'absence d'erreurs, d'omissions ou d'interruptions temporaires du service.",
                "Les offres d'emploi sont publiées par des entreprises partenaires préalablement vérifiées ; les décisions de recrutement relèvent exclusivement de ces entreprises.",
                "Les décisions administratives (visas, titres de séjour, autorisations de travail) relèvent des autorités compétentes italiennes et sénégalaises : aucune n'est garantie par COORIZON.",
                "Les attestations de formation délivrées sont internes à COORIZON et ne constituent pas des certifications officielles ou universitaires.",
              ]}
            />
            <LegalHighlight tone="warning" title="Avertissement important">
              COORIZON est une plateforme d&apos;accompagnement. Aucune offre d&apos;emploi,
              attestation ou visa n&apos;est garanti. Méfiez-vous de toute personne se réclamant de
              COORIZON en dehors des canaux officiels (site, email @coorizon.com, numéro officiel).
            </LegalHighlight>
          </LegalSection>

          <LegalSection icon={Scale} title="Droit applicable">
            <p>
              Le présent site et ses mentions légales sont soumis au droit sénégalais. En cas de
              litige, et à défaut de résolution amiable, compétence est attribuée aux tribunaux
              compétents de Dakar. Pour toute question relative à ces mentions, écrivez à{" "}
              <strong>contact@coorizon.com</strong>.
            </p>
          </LegalSection>

          <LegalPageFooter
            summary="Les mentions légales identifient l'éditeur du site et encadrent l'utilisation de ses contenus. Elles se lisent avec la politique de confidentialité, les conditions générales et la politique cookies."
            related={[
              { label: "Politique de confidentialité", route: "politique-confidentialite" },
              { label: "Conditions générales", route: "conditions-generales" },
              { label: "Cookies", route: "cookies" },
            ]}
          />
        </div>
      </SectionShell>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Politique de confidentialité
// ═══════════════════════════════════════════════════════════════════════════

export function PolitiqueConfidentialitePage() {
  return (
    <>
      <PageHeader
        eyebrow="Protection des données"
        title="Politique de confidentialité"
        description="Comment COORIZON collecte, utilise, conserve et protège vos données personnelles, et quels sont vos droits."
      />
      <SectionShell>
        <div className="mx-auto max-w-4xl space-y-10">
          <LegalHighlight tone="success" title="Engagement de confiance">
            Vos données servent uniquement à traiter votre dossier (candidature, formation,
            immigration), à vous informer et à améliorer la plateforme. COORIZON ne vend jamais vos
            données personnelles à des tiers.
          </LegalHighlight>

          <LegalSection icon={Database} title="1. Données collectées">
            <LegalList
              items={[
                "Données d'identité et de contact : nom, prénom, email, téléphone, pays de résidence.",
                "Données de dossier candidat : CV, photo (facultative), niveau de langue, expériences, diplômes, documents administratifs (passeport, attestations).",
                "Données de parcours sur la plateforme : inscriptions aux formations, résultats d'examens, candidatures aux offres, candidatures d'immigration.",
                "Données de paiement : référence du forfait de formation, statut de validation (aucun numéro de carte bancaire n'est stocké sur la plateforme).",
                "Données entreprise : raison sociale, numéro d'enregistrement, documents légaux, offres publiées.",
                "Données techniques : journaux de connexion et d'audit (adresse IP, horodatage) pour la sécurité du service.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Eye} title="2. Finalités du traitement">
            <LegalList
              items={[
                "Créer et gérer votre compte, vérifier votre identité et valider votre dossier.",
                "Traiter vos candidatures aux offres d'emploi et les transmettre aux entreprises concernées.",
                "Organiser votre parcours de formation (cours, examens, attestations) et suivre votre progression.",
                "Instruire votre dossier d'immigration et coordonner les étapes avec les agents habilités.",
                "Vous notifier les décisions, échéances et messages importants (notifications internes et emails).",
                "Assurer la sécurité de la plateforme, la traçabilité des actions sensibles et la lutte contre la fraude.",
                "Établir des statistiques agrégées et anonymisées pour améliorer nos services.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={CheckCircle2} title="3. Bases légales">
            <LegalList
              items={[
                "Votre consentement lors de la création du compte et pour les communications facultatives.",
                "L'exécution du contrat : fourniture des services (recrutement, formation, accompagnement) auxquels vous avez souscrit.",
                "L'intérêt légitime de COORIZON : sécurité, prévention de la fraude, amélioration du service.",
                "Le respect des obligations légales et administratives applicables au Sénégal et à l'Italie.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Users} title="4. Destinataires des données">
            <LegalList
              items={[
                "Les équipes habilitées de COORIZON (administration, agents de recrutement et d'immigration, formateurs).",
                "Les entreprises partenaires, uniquement pour les éléments de votre dossier nécessaires à l'examen de votre candidature, et après validation de votre dossier par l'administration.",
                "Les prestataires techniques strictement nécessaires à l'exploitation (hébergement, envoi d'emails), liés par des engagements de confidentialité.",
                "Les autorités publiques lorsque la loi l'exige.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Clock} title="5. Durées de conservation">
            <LegalList
              items={[
                "Compte actif : vos données sont conservées pendant toute la durée d'utilisation de la plateforme.",
                "Compte inactif : conservation limitée puis anonymisation ou suppression conformément aux délais légaux de prescription.",
                "Documents de candidature et de dossier : durée nécessaire au traitement, puis archivage restreint.",
                "Journaux d'audit : conservation limitée à la durée nécessaire à la traçabilité de sécurité.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={ShieldCheck} title="6. Sécurité">
            <LegalList
              items={[
                "Chiffrement des échanges (HTTPS/TLS) et mots de passe hachés (bcrypt) — jamais stockés en clair.",
                "Contrôle d'accès par rôles : chaque agent n'accède qu'aux dossiers nécessaires à sa mission.",
                "Journalisation des actions sensibles (modifications de dossiers, décisions administratives) dans un journal d'audit.",
                "Journal des emails de notification pour garantir la traçabilité des envois.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={FileText} title="7. Vos droits">
            <p>
              Conformément au RGPD (règlement européen 2016/679) et à la loi sénégalaise n° 2008-12
              sur la protection des données personnelles (sous le contrôle de la CDP), vous
              disposez des droits suivants :
            </p>
            <LegalList
              items={[
                "Droit d'accès : obtenir la confirmation et la copie des données vous concernant.",
                "Droit de rectification : faire corriger des données inexactes ou incomplètes.",
                "Droit à l'effacement : demander la suppression de vos données (droit à l'oubli).",
                "Droit d'opposition et de limitation : vous opposer à certains traitements.",
                "Droit à la portabilité : recevoir vos données dans un format structuré (export JSON disponible depuis la plateforme).",
                "Droit de retirer votre consentement à tout moment pour les traitements qui en dépendent.",
              ]}
            />
            <LegalHighlight tone="info" title="Exercer vos droits">
              Depuis votre espace, la section « Paramètres » permet de demander l&apos;export ou la
              suppression de vos données personnelles. Vous pouvez aussi écrire à{" "}
              <strong>contact@coorizon.com</strong> ou par courrier au siège : Sicap Liberté 4
              N°5260, Dakar — Sénégal. Une réponse vous sera apportée dans un délai maximum de 30
              jours. Vous pouvez également introduire une réclamation auprès de la CDP (Sénégal)
              ou de l&apos;autorité de contrôle compétente.
            </LegalHighlight>
          </LegalSection>

          <LegalSection icon={Lock} title="8. Contact">
            <p>
              Pour toute question relative à cette politique ou au traitement de vos données :
              contact@coorizon.com — +221 71 090 70 70 (Sicap Liberté 4 N°5260, Dakar — Sénégal).
            </p>
          </LegalSection>

          <LegalPageFooter
            summary="Cette politique explique quelles données sont collectées sur COORIZON, pourquoi, pendant combien de temps, qui y accède et comment exercer vos droits."
            related={[
              { label: "Mentions légales", route: "mentions-legales" },
              { label: "Conditions générales", route: "conditions-generales" },
              { label: "Cookies", route: "cookies" },
            ]}
          />
        </div>
      </SectionShell>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Conditions générales
// ═══════════════════════════════════════════════════════════════════════════

export function ConditionsGeneralesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cadre d'utilisation"
        title="Conditions générales"
        description="Les règles qui régissent l'utilisation de la plateforme COORIZON et la relation entre la plateforme, les candidats et les entreprises partenaires."
      />
      <SectionShell>
        <div className="mx-auto max-w-4xl space-y-10">
          <LegalSection icon={FileSignature} title="1. Objet et acceptation">
            <p>
              Les présentes conditions générales encadrent l&apos;accès et l&apos;utilisation de la
              plateforme COORIZON, qui propose trois familles de services : le recrutement
              international (mise en relation candidats/entreprises), la formation en langue
              italienne (cours, examens, attestations internes) et l&apos;accompagnement à
              l&apos;immigration professionnelle vers l&apos;Italie.
            </p>
            <p>
              L&apos;inscription, la connexion ou l&apos;utilisation de la plateforme vaut
              acceptation sans réserve des présentes conditions. Si vous ne les acceptez pas, ne
              créez pas de compte et n&apos;utilisez pas les services.
            </p>
          </LegalSection>

          <LegalSection icon={UserCheck} title="2. Comptes et inscriptions">
            <LegalList
              items={[
                "Chaque utilisateur fournit des informations exactes, complètes et à jour lors de son inscription (identité, coordonnées, documents).",
                "Un compte est strictement personnel : il est interdit de le partager, de le céder ou de créer plusieurs comptes.",
                "Les comptes entreprises font l'objet d'une validation préalable par l'administration COORIZON avant toute publication d'offre.",
                "Les comptes candidats accèdent à l'ensemble des modules (formation, offres, immigration) après validation du forfait de formation.",
                "COORIZON se réserve le droit de suspendre ou désactiver un compte en cas de fausse déclaration, d'activité frauduleuse ou de non-respect des présentes conditions.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Wallet} title="3. Forfait de formation et paiements">
            <LegalList
              items={[
                "L'accès complet de l'espace candidat est conditionné au paiement du forfait de formation affiché sur la plateforme (montant et devise indiqués dans l'onglet « Forfait »).",
                "Le paiement est unique et soumis à validation par l'administration COORIZON ; l'accès est ouvert après cette validation, sans délai injustifié.",
                "Le forfait couvre l'accès aux formations en italien, aux examens internes, à la médiathèque de formation, aux offres d'emploi publiées et aux outils de candidature, pour la durée indiquée (« Accès permanent » par défaut).",
                "Sauf disposition légale contraire, le forfait n'est ni remboursable après validation de l'accès, ni transférable à un tiers.",
                "Toute prestation complémentaire éventuelle fait l'objet d'une information préalable claire avant paiement.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Briefcase} title="4. Offres d'emploi et candidatures">
            <LegalList
              items={[
                "Les offres sont publiées par des entreprises partenaires préalablement vérifiées ; COORIZON n'est pas l'employeur et ne conclut aucun contrat de travail au nom des parties.",
                "Les candidatures sont transmises aux entreprises concernées ; l'entretien, la sélection et la signature du contrat relèvent de la seule responsabilité de l'entreprise et du candidat.",
                "Les entreprises s'engagent à publier des offres sincères, conformes à la loi et sans discrimination.",
              ]}
            />
            <LegalHighlight tone="warning" title="Aucune garantie d'emploi">
              COORIZON facilite la mise en relation et la préparation : aucune embauche, aucune
              durée d&apos;emploi ni aucune rémunération n&apos;est garantie.
            </LegalHighlight>
          </LegalSection>

          <LegalSection icon={FileText} title="5. Formation et attestations">
            <LegalList
              items={[
                "Les cours, examens et attestations relèvent de la formation interne COORIZON (niveaux A1 à C2).",
                "Les attestations délivrées attestent du suivi et des résultats internes : elles ne constituent ni un diplôme universitaire, ni une certification officielle de langue (CELI, CILS, PLIDA).",
                "La présentation régulière aux évaluations et le respect du règlement des cours conditionnent la délivrance des attestations.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Plane} title="6. Accompagnement à l'immigration">
            <LegalList
              items={[
                "L'accompagnement couvre la préparation et le suivi administratif du dossier (constitution, vérifications, orientation vers les procédures applicables).",
                "Les décisions finales (visa, permis de travail, titre de séjour) appartiennent exclusivement aux autorités italiennes et sénégalaises compétentes.",
                "COORIZON ne perçoit jamais de paiement « au nom » d'une administration publique ; méfiez-vous de toute demande de ce type.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Ban} title="7. Obligations des utilisateurs">
            <LegalList
              items={[
                "Ne pas déposer de contenus illicites, diffamatoires, discriminatoires ou trompeurs (faux CV, faux documents).",
                "Ne pas contourner la plateforme pour contourner les validations administratives ou frauder sur les paiements.",
                "Ne pas tenter d'accéder aux comptes d'autres utilisateurs, ni perturber le fonctionnement du service.",
                "Respecter la confidentialité des documents et informations d'autres utilisateurs auxquels vous pourriez avoir accès dans le cadre de la plateforme.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={XCircle} title="8. Suspension et résiliation">
            <LegalList
              items={[
                "Vous pouvez demander la fermeture de votre compte à tout moment depuis votre espace ou par email.",
                "COORIZON peut suspendre l'accès en cas de manquement aux présentes conditions, après notification lorsque cela est possible.",
                "En cas de fermeture, les données personnelles sont traitées conformément à la politique de confidentialité (export possible avant suppression).",
              ]}
            />
          </LegalSection>

          <LegalSection icon={AlertCircle} title="9. Responsabilité">
            <p>
              COORIZON fournit ses services avec diligence mais ne garantit pas un résultat
              (embauche, visa, admission). Sa responsabilité ne saurait être engagée pour les
              décisions des entreprises ou des administrations, ni pour les interruptions
              temporaires du service dues à la maintenance ou à des causes extérieures.
            </p>
          </LegalSection>

          <LegalSection icon={RefreshCw} title="10. Évolution des conditions">
            <p>
              COORIZON peut faire évoluer les présentes conditions pour refléter l&apos;évolution
              des services ou des règles applicables. Les utilisateurs sont informés de toute
              modification substantielle ; la poursuite de l&apos;utilisation après publication
              vaut acceptation de la version en vigueur.
            </p>
          </LegalSection>

          <LegalSection icon={Gavel} title="11. Droit applicable et litiges">
            <p>
              Les présentes conditions sont soumises au droit sénégalais. Toute réclamation doit
              d&apos;abord être adressée à <strong>contact@coorizon.com</strong> ; à défaut de
              résolution amiable dans un délai de 60 jours, compétence est attribuée aux tribunaux
              compétents de Dakar.
            </p>
          </LegalSection>

          <LegalPageFooter
            summary="Ces conditions définissent le cadre des services COORIZON : comptes, forfait de formation, offres d'emploi, formation, immigration et responsabilités de chacun."
            related={[
              { label: "Mentions légales", route: "mentions-legales" },
              { label: "Politique de confidentialité", route: "politique-confidentialite" },
              { label: "Cookies", route: "cookies" },
            ]}
          />
        </div>
      </SectionShell>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Cookies
// ═══════════════════════════════════════════════════════════════════════════

export function CookiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Traceurs & préférences"
        title="Cookies"
        description="Quels cookies COORIZON utilise, pourquoi, pour combien de temps et comment les contrôler depuis votre navigateur."
      />
      <SectionShell>
        <div className="mx-auto max-w-4xl space-y-10">
          <LegalSection icon={HelpCircle} title="1. Qu'est-ce qu'un cookie ?">
            <p>
              Un cookie est un petit fichier déposé sur votre appareil lors de la visite d&apos;un
              site. Il permet notamment de garder votre session active, de mémoriser vos
              préférences et de mesurer l&apos;audience. Aucun cookie publicitaire n&apos;est
              déposé par COORIZON.
            </p>
          </LegalSection>

          <LegalSection icon={Cookie} title="2. Cookies utilisés sur COORIZON">
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-surface text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Cookie</th>
                      <th className="px-4 py-3 font-semibold">Rôle</th>
                      <th className="px-4 py-3 font-semibold">Durée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      {
                        name: "next-auth.session-token",
                        role: "Session de connexion — maintient votre authentification entre les pages (essentiel).",
                        duration: "30 jours (supprimé à la déconnexion)",
                      },
                      {
                        name: "next-auth.csrf-token",
                        role: "Protection CSRF des formulaires de connexion (essentiel, sécurité).",
                        duration: "Session",
                      },
                      {
                        name: "next-auth.callback-url",
                        role: "Mémorise la page de retour après connexion (essentiel).",
                        duration: "Session",
                      },
                      {
                        name: "theme",
                        role: "Préférence d'affichage clair/sombre de l'interface (fonctionnel).",
                        duration: "1 an",
                      },
                    ].map((c) => (
                      <tr key={c.name}>
                        <td className="px-4 py-3 font-mono text-xs text-navy dark:text-foreground">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.role}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Les cookies « essentiels » sont nécessaires au fonctionnement du site (connexion,
              sécurité). Ils ne peuvent pas être désactivés sans perdre l&apos;accès à votre espace.
            </p>
          </LegalSection>

          <LegalSection icon={Eye} title="3. Mesure d'audience">
            <p>
              La plateforme n&apos;utilise pas de traceurs publicitaires ni de réseaux sociaux qui
              déposent des cookies lors de votre navigation. Les statistiques internes (nombre
              d&apos;inscriptions, offres publiées) sont calculées de façon agrégée à partir des
              données de la plateforme, sans profilage individuel.
            </p>
          </LegalSection>

          <LegalSection icon={Settings} title="4. Gérer les cookies">
            <p>
              Vous pouvez à tout moment accepter, bloquer ou supprimer les cookies depuis les
              paramètres de votre navigateur (généralement dans « Confidentialité et sécurité »).
              La suppression des cookies essentiels vous déconnectera de votre espace COORIZON ;
              une nouvelle connexion sera nécessaire.
            </p>
            <LegalList
              items={[
                "Chrome : Paramètres → Confidentialité et sécurité → Cookies.",
                "Firefox : Paramètres → Vie privée et sécurité → Cookies.",
                "Safari : Préférences → Confidentialité → Gérer les cookies.",
                "Edge : Paramètres → Autorisations du site → Cookies.",
              ]}
            />
          </LegalSection>

          <LegalSection icon={Mail} title="5. Questions">
            <p>
              Une question sur les traceurs ou sur vos données ? Écrivez à{" "}
              <strong>contact@coorizon.com</strong> ou consultez la politique de confidentialité.
            </p>
          </LegalSection>

          <LegalPageFooter
            summary="COORIZON n'utilise que des cookies essentiels (session, sécurité) et fonctionnels (thème) — aucun cookie publicitaire."
            related={[
              { label: "Politique de confidentialité", route: "politique-confidentialite" },
              { label: "Mentions légales", route: "mentions-legales" },
              { label: "Conditions générales", route: "conditions-generales" },
            ]}
          />
        </div>
      </SectionShell>
    </>
  );
}
