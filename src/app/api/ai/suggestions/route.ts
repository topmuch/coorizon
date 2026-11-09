import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

/**
 * AI content-suggestions endpoint (LOT 9 — Intelligence artificielle, Task 9-b).
 *
 * POST /api/ai/suggestions
 *   Body: {
 *     type:   "job_description" | "email_template" | "cover_letter",
 *     prompt: string
 *   }
 *
 * Auth: recruiters and admins only (requireSession + role check).
 *
 * The route builds a type-specific system prompt, then forwards the user's
 * prompt to the z-ai-web-dev-sdk LLM (server-side only — the SDK is never
 * imported in client code).
 *
 * Response:
 *   200 { suggestion: string }
 *   400 { error: string }        — malformed body
 *   401 { error: string }        — not authenticated
 *   403 { error: string }        — not a recruiter/admin
 *   500 { error: string }        — LLM failure
 */

// ─── Types ────────────────────────────────────────────────────────────────

type SuggestionType = "job_description" | "email_template" | "cover_letter";

interface SuggestionsRequestBody {
  type?: unknown;
  prompt?: unknown;
}

// ─── Validation helpers ───────────────────────────────────────────────────

/** Coerce an unknown value into a trimmed string, defaulting to "". */
function toStringValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Roles allowed to call this endpoint. */
const ALLOWED_ROLES = new Set<string>(["Recruiter", "Admin", "SuperAdmin"]);

// ─── Type-specific system prompts ─────────────────────────────────────────

const SYSTEM_PROMPTS: Record<SuggestionType, string> = {
  job_description:
    "Tu es un assistant de rédaction pour la plateforme COORIZON (recrutement " +
    "international vers l'Italie, formation en italien, accompagnement à " +
    "l'immigration). Rédige une description d'offre d'emploi claire et " +
    "professionnelle pour un poste en Italie, en français. Structure le texte " +
    "avec un court résumé du poste, les responsabilités, les compétences " +
    "requises et les conditions. Reste concis et factuel.",
  email_template:
    "Tu es un assistant de rédaction pour la plateforme COORIZON. Rédige un " +
    "email professionnel en français, structuré (objet, salutation, corps, " +
    "formule de politesse, signature). Le ton doit être courtois et adapté au " +
    "contexte de recrutement, de formation ou d'accompagnement à l'immigration.",
  cover_letter:
    "Tu es un assistant de rédaction pour la plateforme COORIZON. Rédige une " +
    "lettre de motivation en français pour un poste en Italie. Structure-la " +
    "avec une introduction, une présentation des compétences pertinentes, une " +
    "explication de l'intérêt pour le poste et l'entreprise, et une formule " +
    "de politesse. Reste professionnel et convaincant.",
};

const SUGGESTION_LABELS: Record<SuggestionType, string> = {
  job_description: "description d'offre d'emploi",
  email_template: "modèle d'email",
  cover_letter: "lettre de motivation",
};

function isValidType(value: unknown): value is SuggestionType {
  return (
    typeof value === "string" &&
    (value === "job_description" ||
      value === "email_template" ||
      value === "cover_letter")
  );
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    // Authorization: recruiters and admins only.
    if (!ALLOWED_ROLES.has(session.user.role) && !isAdmin(session.user.role)) {
      return Response.json(
        { error: "Réservé aux recruteurs et administrateurs." },
        { status: 403 }
      );
    }

    // Parse JSON body defensively.
    let body: SuggestionsRequestBody;
    try {
      body = (await req.json()) as SuggestionsRequestBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    if (!isValidType(body.type)) {
      return Response.json(
        {
          error:
            "Le champ 'type' doit valoir 'job_description', 'email_template' ou 'cover_letter'.",
        },
        { status: 400 }
      );
    }

    const prompt = toStringValue(body.prompt);
    if (!prompt) {
      return Response.json(
        { error: "Le champ 'prompt' est requis." },
        { status: 400 }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[body.type];
    const label = SUGGESTION_LABELS[body.type];

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const suggestion =
      completion?.choices?.[0]?.message?.content?.trim() ||
      `Je n'ai pas pu générer la ${label}. Reformulez votre demande.`;

    return Response.json({ suggestion });
  } catch (error) {
    // Auth errors (401/403) funnel through authErrorResponse.
    const authResp = authErrorResponse(error);
    if (authResp.status !== 500) return authResp;

    // Anything else (LLM failure, network, …) → 500 with a friendly message.
    return Response.json(
      { error: "La génération de contenu est temporairement indisponible. Réessayez." },
      { status: 500 }
    );
  }
}
