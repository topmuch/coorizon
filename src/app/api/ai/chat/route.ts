import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

/**
 * AI assistant chat endpoint (LOT 9 — Intelligence artificielle, Task 9-b).
 *
 * POST /api/ai/chat
 *   Body: {
 *     messages: Array<{ role: "user" | "assistant"; content: string }>,
 *     context?: string
 *   }
 *
 * Auth: any authenticated user (requireSession).
 *
 * The route builds a COORIZON-aware system prompt, augments it with the
 * connected user's role and an optional caller-supplied context, then
 * forwards the full conversation to the z-ai-web-dev-sdk LLM (server-side
 * only — the SDK is never imported in client code).
 *
 * Response:
 *   200 { reply: string }
 *   400 { error: string }        — malformed body
 *   401 { error: string }        — not authenticated
 *   500 { error: string }        — LLM failure
 */

// ─── Types ────────────────────────────────────────────────────────────────

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages?: unknown;
  context?: unknown;
}

type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

// ─── Validation helpers ───────────────────────────────────────────────────

/** Coerce an unknown value into a trimmed string, defaulting to "". */
function toStringValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/**
 * Validate the incoming `messages` array.
 * - Must be an array.
 * - Each entry must have role ∈ {"user","assistant"} and a non-empty content.
 * - The most recent entry must be from the user (otherwise the LLM has nothing
 *   to respond to).
 * - Cap history at 20 turns to bound token usage.
 */
function validateMessages(raw: unknown): IncomingMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const cleaned: IncomingMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const obj = item as { role?: unknown; content?: unknown };
    if (obj.role !== "user" && obj.role !== "assistant") return null;
    const content = toStringValue(obj.content);
    if (!content) return null;
    cleaned.push({ role: obj.role, content });
  }

  // The last message must come from the user.
  if (cleaned[cleaned.length - 1].role !== "user") return null;

  // Bound the history to the last 20 messages.
  return cleaned.slice(-20);
}

// ─── System prompt ────────────────────────────────────────────────────────

const COORIZON_SYSTEM_PROMPT =
  "Tu es l'assistant IA de COORIZON, une plateforme de recrutement international, " +
  "de formation en italien et d'accompagnement à l'immigration vers l'Italie. " +
  "Tu aides les candidats, recruteurs et agents. Réponds en français, de manière " +
  "concise et utile. Si on te pose une question hors sujet, redirige poliment vers " +
  "le support COORIZON.";

/**
 * Build the system prompt for the LLM: base COORIZON description + the
 * connected user's role + an optional caller context.
 */
function buildSystemPrompt(roleLabel: string, context: string): string {
  const parts: string[] = [COORIZON_SYSTEM_PROMPT];
  parts.push(`L'utilisateur connecté est un ${roleLabel}.`);
  if (context) {
    parts.push(`Contexte additionnel fourni par l'utilisateur : ${context}`);
  }
  return parts.join("\n");
}

// ─── Role label (French, human-readable) ──────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  Candidate: "candidat",
  Recruiter: "recruteur",
  Trainer: "formateur",
  RecruitmentAgent: "agent de recrutement",
  ImmigrationAgent: "agent d'immigration",
  Admin: "administrateur",
  SuperAdmin: "super administrateur",
};

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    // Parse JSON body defensively.
    let body: ChatRequestBody;
    try {
      body = (await req.json()) as ChatRequestBody;
    } catch {
      return Response.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const messages = validateMessages(body.messages);
    if (!messages) {
      return Response.json(
        { error: "Le tableau 'messages' est invalide ou vide." },
        { status: 400 }
      );
    }

    const context = toStringValue(body.context);
    const roleLabel = ROLE_LABELS[session.user.role] ?? "utilisateur";

    // Assemble the full LLM message list (system + conversation).
    const llmMessages: LLMMessage[] = [
      { role: "system", content: buildSystemPrompt(roleLabel, context) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Je n'ai pas pu générer de réponse. Reformulez votre question.";

    return Response.json({ reply });
  } catch (error) {
    // Auth errors (401/403) funnel through authErrorResponse.
    const authResp = authErrorResponse(error);
    if (authResp.status !== 500) return authResp;

    // Anything else (LLM failure, network, …) → 500 with a friendly message.
    return Response.json(
      { error: "L'assistant IA est temporairement indisponible. Réessayez." },
      { status: 500 }
    );
  }
}
