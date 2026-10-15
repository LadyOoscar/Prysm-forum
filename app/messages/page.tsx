"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Conversation = {
  id: string;
  other: { username: string; display_name: string | null } | null;
};

function describeError(action: string, error: { message?: string; code?: string; details?: string; hint?: string; status?: number } | null | undefined) {
  const status = error?.status === 403 || error?.code === "42501" ? " (accès refusé)" : "";
  const code = error?.code ? ` [${error.code}]` : "";
  console.error(`[PRYSM messagerie] ${action}`, error);
  return `${action}${status}. ${error?.message || "Erreur inconnue"}${code}`;
}

export default function MessagesPage() {
  const supabase = createSupabaseBrowser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [listError, setListError] = useState("");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(describeError("Vérification de la session", authError));
      if (!auth.user) {
        window.location.href = "/auth";
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", auth.user.id);
      if (membershipError) throw new Error(describeError("Chargement des conversations", membershipError));

      const ids = [...new Set((memberships ?? []).map((item) => item.conversation_id))];
      if (!ids.length) {
        setConversations([]);
        return;
      }

      const { data: members, error: membersError } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, profiles:user_id(username, display_name)")
        .in("conversation_id", ids);
      if (membersError) throw new Error(describeError("Chargement des participants", membersError));

      const next = ids.map((id) => {
        const other = (members ?? []).find((item) => {
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return item.conversation_id === id && item.user_id !== auth.user!.id && profile;
        });
        const profile = other ? (Array.isArray(other.profiles) ? other.profiles[0] : other.profiles) : null;
        return { id, other: profile as Conversation["other"] };
      });
      setConversations(next);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Erreur inattendue pendant le chargement.";
      console.error("[PRYSM messagerie] Impossible de charger la boîte de réception", err);
      setListError(detail);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadConversations();
    const target = new URLSearchParams(window.location.search).get("to");
    if (target) setUsername(target);
  }, [loadConversations]);

  async function startConversation(event: FormEvent) {
    event.preventDefault();
    const target = username.trim();
    if (!target || creating) return;

    setCreating(true);
    setMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(describeError("Vérification de la session", authError));
      if (!auth.user) {
        window.location.href = "/auth";
        return;
      }

      const { data: conversationId, error } = await supabase.rpc("create_direct_conversation", {
        p_target_username: target,
      });

      if (error || !conversationId) {
        console.error("[PRYSM messagerie] Création de conversation refusée", error);
        const reason = error?.message ?? "";
        if (reason.includes("MEMBER_NOT_FOUND")) setMessage("Aucun membre ne correspond à ce pseudo.");
        else if (reason.includes("CANNOT_MESSAGE_SELF")) setMessage("Tu ne peux pas démarrer une conversation avec toi-même.");
        else if (reason.includes("MEMBER_BLOCKED")) setMessage("Impossible de démarrer cette conversation car un blocage est actif entre ces comptes.");
        else if (error?.code === "42501" || error?.status === 403) setMessage("Accès refusé par la base de données (403). La requête a été journalisée pour diagnostic.");
        else if (error?.code === "28000" || reason.includes("AUTH_REQUIRED")) setMessage("Ta session a expiré. Reconnecte-toi puis réessaie.");
        else setMessage(`Impossible de créer la conversation. ${error?.message || "Réessaie dans un instant."}${error?.code ? ` [${error.code}]` : ""}`);
        return;
      }

      window.location.href = "/messages/" + conversationId;
    } catch (err) {
      console.error("[PRYSM messagerie] Erreur inattendue à la création", err);
      setMessage(err instanceof Error ? err.message : "Erreur inattendue. Réessaie.");
    } finally {
      setCreating(false);
    }
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
            <button className="button primary" type="submit" disabled={creating || !username.trim()}>{creating ? "Création..." : "Ouvrir la conversation"}</button>
          </form>
          {message && <p className="profile-message" role="status">{message}</p>}
        </div>

        <div className="conversation-list">
          <div className="section-title"><span>Conversations</span><strong>{conversations.length}</strong></div>
          {loading ? <div className="empty"><p>Chargement…</p></div> : listError ? (
            <div className="empty" role="alert"><h2>La boîte de réception est indisponible</h2><p>{listError}</p><button className="button" type="button" onClick={() => void loadConversations()}>Réessayer</button></div>
          ) : conversations.length === 0 ? (
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
