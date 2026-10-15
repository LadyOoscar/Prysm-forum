"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Conversation = {
  id: string;
  other: { username: string; display_name: string } | null;
};

export default function MessagesPage() {
  const supabase = createSupabaseBrowser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadConversations() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/auth";
      return;
    }

    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", auth.user.id);

    const ids = (memberships ?? []).map((item) => item.conversation_id);
    if (!ids.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: members } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id, profiles:user_id(username, display_name)")
      .in("conversation_id", ids);

    const next = ids.map((id) => {
      const other = (members ?? []).find((item) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        return item.conversation_id === id && item.user_id !== auth.user.id && profile;
      });
      const profile = other ? (Array.isArray(other.profiles) ? other.profiles[0] : other.profiles) : null;
      return { id, other: profile as Conversation["other"] };
    });
    setConversations(next);
    setLoading(false);
  }

  useEffect(() => {
    void loadConversations();
    const target = new URLSearchParams(window.location.search).get("to");
    if (target) setUsername(target);
  }, []);

  async function startConversation(event: FormEvent) {
    event.preventDefault();
    const target = username.trim();
    if (!target) return;

    setCreating(true);
    setMessage("");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/auth";
      return;
    }

    const { data: conversationId, error } = await supabase.rpc("create_direct_conversation", {
      p_target_username: target,
    });

    if (error || !conversationId) {
      const reason = error?.message ?? "";
      if (reason.includes("MEMBER_NOT_FOUND")) {
        setMessage("Aucun membre ne correspond à ce pseudo.");
      } else if (reason.includes("CANNOT_MESSAGE_SELF")) {
        setMessage("Tu ne peux pas démarrer une conversation avec toi-même.");
      } else if (reason.includes("MEMBER_BLOCKED")) {
        setMessage("Impossible de démarrer cette conversation car un blocage est actif entre ces comptes.");
      } else {
        setMessage("Impossible de créer la conversation. Réessaie dans un instant.");
      }
      setCreating(false);
      return;
    }

    window.location.href = "/messages/" + conversationId;
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
        <p className="eyebrow">Échanges privés</p>
        <h1>Messages.</h1>
        <p className="lead">Des conversations privées entre membres. Pas de suppression de messages, pour garder un historique cohérent.</p>
      </section>

      <section className="messages-layout">
        <div className="profile-box">
          <h2 className="messages-title">Nouvelle conversation</h2>
          <form className="message-start-form" onSubmit={startConversation}>
            <label>
              Pseudo du membre
              <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32} placeholder="ex. alex" />
            </label>
            <button className="button primary" type="submit" disabled={creating}>{creating ? "Création..." : "Ouvrir la conversation"}</button>
          </form>
          {message && <p className="profile-message">{message}</p>}
        </div>

        <div className="conversation-list">
          <div className="section-title"><span>Conversations</span><strong>{conversations.length}</strong></div>
          {loading ? <div className="empty"><p>Chargement…</p></div> : conversations.length === 0 ? (
            <div className="empty"><div className="empty-symbol">◇</div><h2>Aucune conversation</h2><p>Entre le pseudo d’un membre pour commencer à discuter.</p></div>
          ) : conversations.map((conversation) => (
            <Link className="conversation-row" href={"/messages/" + conversation.id} key={conversation.id}>
              <div className="avatar">{(conversation.other?.display_name || conversation.other?.username || "?").slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{conversation.other?.display_name || "Membre"}</strong>
                <span>@{conversation.other?.username || "membre"}</span>
              </div>
              <b>→</b>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
