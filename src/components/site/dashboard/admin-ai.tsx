"use client";

import * as React from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * AdminAi — back-office section for the AI assistant (LOT 9 — Intelligence
 * artificielle, Task 9-b).
 *
 * An admin can:
 *   • read the AI status card (powered by z-ai-web-dev-sdk, server-side);
 *   • test the assistant chat endpoint (POST /api/ai/chat);
 *   • test the content-suggestion endpoint
 *     (POST /api/ai/suggestions) with three content types;
 *   • read the security note (SDK server-side only, API keys in server
 *     secrets, human support still required for complex questions).
 *
 * All UI strings are in French. Toasts confirm successful actions and
 * surface server-side error messages. No `console.log`, no `any`.
 */

// ─── Types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type SuggestionType = "job_description" | "email_template" | "cover_letter";

interface ChatApiResponse {
  reply?: string;
  error?: string;
}

interface SuggestionsApiResponse {
  suggestion?: string;
  error?: string;
}

// ─── Suggestion type metadata ─────────────────────────────────────────────

const SUGGESTION_TYPES: Array<{
  value: SuggestionType;
  label: string;
  description: string;
}> = [
  {
    value: "job_description",
    label: "Description d'offre",
    description: "Description d'offre d'emploi claire et professionnelle.",
  },
  {
    value: "email_template",
    label: "Modèle d'email",
    description: "Email professionnel structuré.",
  },
  {
    value: "cover_letter",
    label: "Lettre de motivation",
    description: "Lettre de motivation pour un poste en Italie.",
  },
];

// ─── Auto-scroll hook ─────────────────────────────────────────────────────

/** Scroll a ref to the bottom whenever `deps` change. */
function useScrollToBottom<T extends HTMLElement>(deps: React.DependencyList) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, deps);
  return ref;
}

// ─── Component ────────────────────────────────────────────────────────────

export function AdminAi() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Bot className="size-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">
            Intelligence artificielle
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pilotez et testez l'assistant IA de COORIZON. Le SDK est exécuté
          côté serveur uniquement.
        </p>
      </div>

      {/* Status + Security row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AiStatusCard />
        <SecurityNoteCard />
      </div>

      <Separator />

      {/* Chat tester */}
      <ChatTester />

      <Separator />

      {/* Suggestions tester */}
      <SuggestionsTester />
    </div>
  );
}

// ─── 1. AI status card ────────────────────────────────────────────────────

function AiStatusCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base">Statut de l'assistant IA</CardTitle>
              <CardDescription className="text-xs">
                Service z-ai-web-dev-sdk
              </CardDescription>
            </div>
          </div>
          <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Actif
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            L'assistant IA est opérationnel et accessible à tous les
            utilisateurs connectés via le widget flottant et l'API{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/api/ai/chat</code>.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            Génération de contenu (offres, emails, lettres) disponible pour les
            recruteurs et administrateurs via{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/api/ai/suggestions</code>.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            Powered by{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              z-ai-web-dev-sdk
            </code>{" "}
            — exécuté côté serveur uniquement. Les clés API ne sont jamais
            exposées au navigateur.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 2. Security note card ────────────────────────────────────────────────

function SecurityNoteCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Shield className="size-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-base">Sécurité &amp; confidentialité</CardTitle>
            <CardDescription className="text-xs">
              Bonnes pratiques d'utilisation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <Shield className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          <AlertTitle className="text-sm">Notes importantes</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            L'assistant IA utilise le SDK{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              z-ai-web-dev-sdk
            </code>{" "}
            côté serveur uniquement. Les clés API sont stockées dans les
            secrets du serveur, jamais dans le navigateur. L'IA ne remplace pas
            le support humain — les questions complexes doivent être
            redirigées vers l'équipe COORIZON.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// ─── 3. Chat tester ───────────────────────────────────────────────────────

function ChatTester() {
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = useScrollToBottom<HTMLDivElement>([messages, loading]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSend = React.useCallback(async () => {
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data: ChatApiResponse = await res.json();
      if (!res.ok || !data.reply) {
        const msg = data.error || "Réponse invalide du serveur.";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ ${msg}`,
          },
        ]);
        toast({
          variant: "destructive",
          title: "Échec de la requête",
          description: msg,
        });
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply as string },
      ]);
    } catch {
      const msg = "Impossible de joindre l'assistant IA.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${msg}` },
      ]);
      toast({
        variant: "destructive",
        title: "Erreur réseau",
        description: msg,
      });
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [input, loading, messages, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setInput("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MessageSquare className="size-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base">Testeur de l'assistant</CardTitle>
              <CardDescription className="text-xs">
                Simule une conversation avec le chatbot COORIZON.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={messages.length === 0 || loading}
          >
            Effacer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="custom-scrollbar max-h-96 min-h-64 space-y-3 overflow-y-auto rounded-md border bg-muted/30 p-4"
          aria-live="polite"
        >
          {messages.length === 0 && !loading && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Bot className="size-8 opacity-40" aria-hidden />
              <p>
                Démarrez une conversation pour tester l'assistant IA.
                <br />
                Exemple : « Comment postuler à une offre en Italie ? »
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}

          {loading && <TypingIndicator />}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Saisissez votre message…"
            disabled={loading}
            aria-label="Message à envoyer à l'assistant IA"
          />
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">Envoyer</span>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Appuyez sur <kbd className="rounded border bg-muted px-1">Entrée</kbd>{" "}
          pour envoyer. L'historique est limité aux 20 derniers messages.
        </p>
      </CardContent>
    </Card>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex items-start gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-4" aria-hidden />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background border text-foreground"
        )}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Sparkles className="size-4" aria-hidden />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="size-4" aria-hidden />
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2.5">
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
        <span className="sr-only">L'assistant rédige une réponse…</span>
      </div>
    </div>
  );
}

// ─── 4. Suggestions tester ───────────────────────────────────────────────

function SuggestionsTester() {
  const { toast } = useToast();
  const [type, setType] = React.useState<SuggestionType>("job_description");
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedMeta = SUGGESTION_TYPES.find((t) => t.value === type);

  const handleGenerate = React.useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, prompt: trimmed }),
      });
      const data: SuggestionsApiResponse = await res.json();
      if (!res.ok || !data.suggestion) {
        const msg = data.error || "Réponse invalide du serveur.";
        setError(msg);
        toast({
          variant: "destructive",
          title: "Échec de la génération",
          description: msg,
        });
        return;
      }
      setSuggestion(data.suggestion as string);
      toast({
        title: "Contenu généré",
        description: "La suggestion IA est prête ci-dessous.",
      });
    } catch {
      const msg = "Impossible de joindre le service de génération.";
      setError(msg);
      toast({
        variant: "destructive",
        title: "Erreur réseau",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, type, toast]);

  const handleCopy = async () => {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
      toast({ title: "Copié", description: "La suggestion a été copiée dans le presse-papiers." });
    } catch {
      toast({
        variant: "destructive",
        title: "Copie impossible",
        description: "Le presse-papiers n'est pas accessible.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-base">Génération de contenu</CardTitle>
            <CardDescription className="text-xs">
              Testez la rédaction automatique d'offres, d'emails et de lettres.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type + prompt */}
        <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-start">
          <div className="space-y-1.5">
            <Label htmlFor="suggestion-type" className="text-xs">
              Type de contenu
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as SuggestionType)}
            >
              <SelectTrigger id="suggestion-type" className="w-full">
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {SUGGESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMeta && (
              <p className="text-[11px] text-muted-foreground">
                {selectedMeta.description}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suggestion-prompt" className="text-xs">
              Votre demande
            </Label>
            <Textarea
              id="suggestion-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex : Poste de chef de cuisine dans un restaurant à Rome, 3 ans d'expérience requis, CDI."
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || !prompt.trim()}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Générer
          </Button>
          {suggestion && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopy()}
              className="gap-2"
            >
              <FileText className="size-4" aria-hidden />
              Copier
            </Button>
          )}
        </div>

        {/* Output */}
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertTitle className="text-sm">Erreur</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {!loading && suggestion && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" aria-hidden />
              Suggestion générée
            </div>
            <div className="custom-scrollbar max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
              {suggestion}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
