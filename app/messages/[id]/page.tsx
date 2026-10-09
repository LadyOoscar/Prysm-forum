"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";
import StickerPicker, { StickerText } from "../../components/sticker-picker";
import { VoiceMessage, VoiceRecorder } from "./voice-tools";

type Message = { id: string; body: string; sender_id: string; created_at: string };
type Member = { user_id: string; profiles: { username: string; display_name: string } | null };

function friendlyError(message: string) {
  if (message.includes("ANTI_SPAM_DUPLICATE")) return "Ce message ressemble trop à un message récent. Modifie-le avant de réessayer.";
  if (message.includes("rate limit") || message.includes("check_rate_limit")) return "Tu envoies trop de messages rapidement. Attends un peu avant de réessayer.";
  return "Impossible d’envoyer le message.";
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseBrowser();
  const [conversationId, setConversationId] = useState("");
  const [userId, setUserId] = useState("");
  const [other, setOther] = useState<Member["profiles"]>(null);
  const [otherId, setOtherId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);

  async function load(id: string, current: string) {
    const { data: members } = await supabase.from("conversation_members")
      .select("user_id, profiles:user_id(username, display_name)")
      .eq("conversation_id", id);
    const om = (members ?? []).find((member) => member.user_id !== current);
    if (!om) {
      setError("Conversation introuvable.");
      setLoading(false);
      return;
    }
    const profile = Array.isArray(om.profiles) ? om.profiles[0] : om.profiles;
    setOther(profile as Member["profiles"]);
    setOtherId(om.user_id);

    const { data: block } = await supabase.from("user_blocks").select("blocked_id")
      .eq("blocker_id", current).eq("blocked_id", om.user_id).maybeSingle();
    setBlocked(Boolean(block));

    const { data, error: loadError } = await supabase.from("messages")
      .select("id, body, sender_id, created_at")
      .eq("conversation_id", id).order("created_at", { ascending: true });
    if (loadError) setError("Impossible de charger les messages.");
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
          setMessages((current) => current.some((message) => message.id === payload.new.id) ? current : [...current, payload.new as Message]);
        })
        .subscribe();
    }
    void init();
    return () => { if (channel) void supabase.removeChannel(channel); };
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !conversationId || !userId || blocked) return;
    setSending(true);
    setError("");
    const { data, error: sendError } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body: text })
      .select("id, body, sender_id, created_at").single();
    if (sendError) setError(friendlyError(sendError.message));
    else if (data) setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as Message]);
    if (!sendError) setBody("");
    setSending(false);
  }

  async function toggleBlock() {
    if (!otherId) return;
    setSending(true);
    if (blocked) {
      await supabase.from("user_blocks").delete().eq("blocker_id", userId).eq("blocked_id", otherId);
      setBlocked(false);
    } else {
      await supabase.from("user_blocks").insert({ blocker_id: userId, blocked_id: otherId });
      setBlocked(true);
      setBody("");
    }
    setSending(false);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link href="/forum">Forum</Link>
          <Link className="active" href="/messages">Messages</Link>
          <Link href="/profil">Profil</Link>
        </nav>
      </header>
      <section className="page-head compact">
        <Link className="back" href="/messages">← Toutes les conversations</Link>
        <p className="eyebrow">Conversation privée</p>
        <h1>{other?.display_name || "Conversation"}</h1>
        {other?.username && <p className="lead">@{other.username}</p>}
        <div style={{ marginTop: 16 }}>
          <button className="button" onClick={() => void toggleBlock()} disabled={sending}>
            {blocked ? "Débloquer ce membre" : "Bloquer ce membre"}
          </button>
        </div>
      </section>
      {blocked && <div className="notice error">Ce membre est bloqué. Tu ne peux plus lui envoyer de message.</div>}
      {error && <div className="notice error" role="status">{error}</div>}
      <section className="private-chat">
        {loading ? <div className="empty"><p>Chargement…</p></div> : messages.length === 0 ? (
          <div className="empty"><div className="empty-symbol">◇</div><h2>Début de conversation</h2><p>Écris le premier message ou envoie un vocal.</p></div>
        ) : (
          <div className="private-message-list">
            {messages.map((message) => (
              <article className={"private-message " + (message.sender_id === userId ? "mine" : "")} key={message.id}>
                {message.body.startsWith("voice:") ? <VoiceMessage path={message.body.slice(6).split("|durationMs=")[0]} durationMs={Number(message.body.split("|durationMs=")[1]) || undefined} /> : <p><StickerText text={message.body} /></p>}
                <time>{new Date(message.created_at).toLocaleString("fr-FR")}</time>
              </article>
            ))}
          </div>
        )}
        {!blocked && (
          <>
            <form className="private-compose" onSubmit={send}>
              <StickerPicker onPick={(token) => setBody((current) => current ? current + " " + token : token)} />
              <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} placeholder="Écrire un message..." />
              <button className="button primary" type="submit" disabled={sending || !body.trim()}>Envoyer</button>
            </form>
            {!loading && conversationId && userId && (
              <VoiceRecorder
                conversationId={conversationId}
                userId={userId}
                disabled={blocked || sending}
                onSent={(message) => setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])}
                onError={setError}
              />
            )}
          </>
        )}
        <p className="chat-note">Les messages envoyés ne peuvent pas être supprimés. Les vocaux durent au maximum 90 secondes.</p>
      </section>
    </main>
  );
}
