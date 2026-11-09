"use client";

import * as React from "react";
import { MessageSquare, Send, ArrowLeft, Search, RefreshCw, AlertCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
}

interface Conversation {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string | null;
  body: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  Candidate: "Candidat", Recruiter: "Recruteur", Trainer: "Formateur",
  RecruitmentAgent: "Agent recrutement", ImmigrationAgent: "Agent immigration",
  Admin: "Admin", SuperAdmin: "Super Admin",
};

export function CandidateMessaging() {
  const { toast } = useToast();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activePartner, setActivePartner] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = React.useState(false);
  const [newMessage, setNewMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [showNewChat, setShowNewChat] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [convRes, contactRes] = await Promise.all([
        fetch("/api/messages", { credentials: "include" }),
        fetch("/api/messages/contacts", { credentials: "include" }),
      ]);
      if (!convRes.ok) throw new Error("Échec du chargement.");
      const convData = await convRes.json();
      const contactData = await contactRes.json();
      setConversations(convData.conversations || []);
      setContacts(contactData.contacts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const openConversation = async (partnerId: string) => {
    setActivePartner(partnerId);
    setShowNewChat(false);
    setMsgLoading(true);
    try {
      const res = await fetch(`/api/messages?with=${partnerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Échec du chargement.");
      const data = await res.json();
      setMessages(data.messages || []);
      // Mark as read
      await fetch("/api/messages", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ partnerId }) });
      // Update unread count locally
      setConversations(prev => prev.map(c => c.id === partnerId ? { ...c, unread: 0 } : c));
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  };

  const handleSend = async () => {
    if (!activePartner || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: activePartner, message: newMessage.trim() }),
      });
      if (!res.ok) throw new Error("Échec de l'envoi.");
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setNewMessage("");
      toast({ title: "Message envoyé" });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de l'envoi du message." });
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  });

  const activeConv = conversations.find(c => c.id === activePartner) || contacts.find(c => c.id === activePartner);
  const activeName = activeConv ? `${activeConv.firstName ?? ""} ${activeConv.lastName ?? ""}`.trim() || activeConv.email : "";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MessageSquare className="h-6 w-6 text-brand" />
            Messagerie
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Échangez avec l'équipe COORIZON et vos contacts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ minHeight: "500px" }}>
        {/* Conversation list / Contact list */}
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <div className="border-b p-3">
              <div className="flex items-center gap-2">
                <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
                <Button size="sm" variant={showNewChat ? "default" : "outline"} onClick={() => setShowNewChat(!showNewChat)}>
                  Nouveau
                </Button>
              </div>
            </div>

            {showNewChat ? (
              // Contact list for new conversation
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">Aucun contact disponible.</p>
                ) : (
                  filteredContacts.map(c => (
                    <button key={c.id} onClick={() => openConversation(c.id)} className="flex w-full items-center gap-3 border-b p-3 text-left transition-colors hover:bg-accent">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="bg-brand/10 text-xs text-brand">{(c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.firstName} {c.lastName}</div>
                        <div className="truncate text-xs text-muted-foreground">{ROLE_LABELS[c.role] || c.role}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Existing conversations
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">Aucune conversation. Cliquez sur "Nouveau" pour démarrer.</p>
                ) : (
                  conversations.map(c => (
                    <button key={c.id} onClick={() => openConversation(c.id)} className={cn("flex w-full items-center gap-3 border-b p-3 text-left transition-colors hover:bg-accent", activePartner === c.id && "bg-accent")}>
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="bg-brand/10 text-xs text-brand">{(c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{c.firstName} {c.lastName}</span>
                          {c.unread > 0 && <Badge className="shrink-0 bg-brand text-white">{c.unread}</Badge>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{c.lastMessage}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="lg:col-span-2">
          <CardContent className="flex h-full flex-col p-0" style={{ minHeight: "500px" }}>
            {!activePartner ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucune conversation sélectionnée</h3>
                <p className="mt-1 text-sm text-muted-foreground">Choisissez une conversation ou démarrez un nouveau message.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 border-b p-3">
                  <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setActivePartner(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-brand/10 text-xs text-brand">{(activeConv?.firstName?.[0] ?? "") + (activeConv?.lastName?.[0] ?? "")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-semibold">{activeName}</div>
                    <div className="text-xs text-muted-foreground">{activeConv && ROLE_LABELS[activeConv.role] ? ROLE_LABELS[activeConv.role] : ""}</div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-2 overflow-y-auto p-4 custom-scrollbar" style={{ maxHeight: "380px" }}>
                  {msgLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-2/3" />)}
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Aucun message. Démarrez la conversation !</p>
                  ) : (
                    messages.map(m => {
                      const isMe = m.senderId !== activePartner;
                      return (
                        <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", isMe ? "bg-brand text-white" : "bg-muted")}>
                            {m.body}
                            <div className={cn("mt-1 text-[10px]", isMe ? "text-white/70" : "text-muted-foreground")}>
                              {new Date(m.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                <div className="border-t p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Écrivez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                      {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
