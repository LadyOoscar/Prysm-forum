"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

type Message = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

type Member = {
  user_id: string;
  profiles: { username: string; display_name: string } | null;
};

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseBrowser();
  const [conversationId, setConversationId] = useState("");
  const [userId, setUserId] = useState("");
  const [other, setOther] = useState<Member["profiles"]>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function load(id: string, currentUser: string) {
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id, profiles:user_id(username, display_name)")
      .eq("conversation_id", id);

    const otherMember = (members ?? []).find((member) => member.user_id !== currentUser);
    if (!otherMember) {
      setError("Conversation introuvable.");
      setLoading(false);
      return;
    }
    const profile = Array.isArray(otherMember.profiles) ? otherMember.profiles[0] : otherMember.profiles;
    setOther(profile as Member["profiles"]);

    const { data, error: messageError } = await supabase
      .from("messages")
      .select("id, body, sender_id, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (messageError) setError("Impossible de charger les messages.");
    else setMessages((data ?? []) as Message[]);
    setLoading(false);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/auth";
        return;
      }
      const resolved = await params;
      setConversationId(resolved.id);
      setUserId(auth.user.id);
      await load(resolved.id, auth.user.id);

      channel = supabase.channel("messages-" + resolved.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + resolved.id }, (payload) => {
          setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new as Message]);
        })
        .subscribe();
    }
    void init();
    return () => { if (channel) void supabase.removeChannel(channel); };
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !conversationId || !userId) return;

    setSending(true);
    setError("");
    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body: text })
      .select("id, body, sender_id, created_at")
      .single();

    if (sendError) setError("Impossible d’envoyer le message.");
    else if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
    if (!sendError) setBody("");
    setSending(false);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link className="active" href="/messages">Messages</Link><Link href="/profil">Profil</Link></nav>
      </header>

      <section className="page-head compact">
        <Link className="back" href="/messages">← Toutes les conversations</Link>
        <p className="eyebrow">Conversation privée</p>
        <h1>{other?.display_name || "Conversation"}</h1>
        {other?.username && <p className="lead">@{other.username}</p>}
      </section>

      {error && <div className="notice error">{error}</div>}
      <section className="private-chat">
        {loading ? <div className="empty"><p>Chargement…</p></div> : messages.length === 0 ? (
          <div className="empty"><div className="empty-symbol">◇</div><h2>Début de conversation</h2><p>Écris le premier message.</p></div>
        ) : (
          <div className="private-message-list">
            {messages.map((message) => (
              <article className={"private-message " + (message.sender_id === userId ? "mine" : "")} key={message.id}>
                <p>{message.body}</p>
                <time>{new Date(message.created_at).toLocaleString("fr-FR")}</time>
              </article>
            ))}
          </div>
        )}
        <form className="private-compose" onSubmit={send}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder="Écrire un message..." />
          <button className="button primary" type="submit" disabled={sending || !body.trim()}>{sending ? "Envoi..." : "Envoyer"}</button>
        </form>
        <p className="chat-note">Les messages envoyés ne peuvent pas être supprimés.</p>
      </section>
    </main>
  );
}
