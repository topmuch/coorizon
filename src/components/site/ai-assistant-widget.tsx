"use client";

import * as React from "react";
import {
  AlertCircle,
  Bot,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSession } from "@/lib/auth/session-provider";
import { cn } from "@/lib/utils";

/**
 * AiAssistantWidget — floating chatbot widget visible to ALL authenticated
 * users on the dashboard (LOT 9 — Intelligence artificielle, Task 9-b).
 *
 * Behaviour:
 *   • A fixed bottom-right floating button (z-50) opens a chat panel.
 *   • The panel shows an initial greeting the first time it opens.
 *   • Conversation state: Array<{ role: "user" | "assistant"; content }>.
 *     On send → append the user message, call POST /api/ai/chat with the
 *     full messages array, then append the assistant reply.
 *   • Loading → typing indicator. Error → inline error message.
 *   • Enter sends, Shift+Enter inserts a newline.
 *   • Uses `useSession()` — only renders when `user` is present.
 *   • Uses `credentials: "include"` on the fetch.
 *
 * Server-side: the SDK lives in /api/ai/chat (server-only). This widget
 * never imports `z-ai-web-dev-sdk`.
 *
 * No `console.log`, no `any`. French UI.
 */

// ─── Types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatApiResponse {
  reply?: string;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant IA de COORIZON. Comment puis-je vous aider aujourd'hui ?",
};

const ERROR_MESSAGE =
  "L'assistant IA est temporairement indisponible. Réessayez plus tard.";

// ─── Auto-scroll hook ─────────────────────────────────────────────────────

function useScrollToBottom<T extends HTMLElement>(deps: React.DependencyList) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, deps);
  return ref;
}

// ─── Component ────────────────────────────────────────────────────────────

export function AiAssistantWidget() {
  const { user } = useSession();
  const [open, setOpen] = React.useState(false);

  // Only render for authenticated users.
  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {/* Panel: positioned above the floating button */}
      {open && <ChatPanel onClose={() => setOpen(false)} />}

      {/* Floating button */}
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer l'assistant IA" : "Ouvrir l'assistant IA"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="coorizon-ai-panel"
        className="size-12 rounded-full shadow-lg"
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Bot className="size-6" aria-hidden />
        )}
      </Button>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = useScrollToBottom<HTMLDivElement>([messages, loading]);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus the input when the panel opens.
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        const msg = data.error || ERROR_MESSAGE;
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${msg}` },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply as string },
      ]);
    } catch {
      setError(ERROR_MESSAGE);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${ERROR_MESSAGE}` },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline (default behaviour).
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Assistant COORIZON"
      id="coorizon-ai-panel"
      className={cn(
        "absolute bottom-full right-0 mb-2 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl",
        // Width: full-width on mobile (with margins), ~360px on desktop.
        "w-[calc(100vw-2rem)] sm:w-[360px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-4" aria-hidden />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">
              Assistant COORIZON
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              En ligne
            </span>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={onClose}
          aria-label="Fermer le panneau"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="custom-scrollbar flex max-h-80 flex-col gap-3 overflow-y-auto p-4"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <WidgetBubble key={i} message={m} />
        ))}
        {loading && <TypingIndicator />}
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div className="px-4 pb-2">
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="size-3.5" aria-hidden />
            <AlertDescription className="text-[11px]">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message…"
          rows={1}
          disabled={loading}
          aria-label="Message à l'assistant IA"
          className="min-h-9 max-h-32 resize-none py-2 text-sm"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void handleSend()}
          disabled={loading || !input.trim()}
          aria-label="Envoyer le message"
          className="size-9 shrink-0"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </Button>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-1.5 border-t bg-muted/30 px-4 py-1.5 text-[10px] text-muted-foreground">
        <Sparkles className="size-3" aria-hidden />
        <span>
          Entrée pour envoyer · Maj+Entrée pour un saut de ligne ·{" "}
          <MessageSquare className="inline size-3 align-text-bottom" aria-hidden />
          {" "} powered by z-ai-web-dev-sdk
        </span>
      </div>
    </div>
  );
}

// ─── Bubble + typing indicator ────────────────────────────────────────────

function WidgetBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-3.5" aria-hidden />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="size-3.5" aria-hidden />
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2.5">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
        <span className="sr-only">L'assistant rédige une réponse…</span>
      </div>
    </div>
  );
}
