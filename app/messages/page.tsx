"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PrysmNav from "@/components/PrysmNav";

type Conversation = { id: string; updated_at: string; created_by: string; direct_recipient_id: string };
type Profile = { id: string; username: string; display_name: string; avatar_url: string | null };

function MessagesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [me, setMe] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [username, setUsername] = useState(params.get("user") ?? "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const id = claims?.claims?.sub;
      if (!id) { router.push("/login"); return; }
      setMe(id);

      const { data: memberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", id);
      const ids = (memberships ?? []).map(row => row.conversation_id);
      if (!ids.length) { setLoading(false); return; }

      const { data: rows } = await supabase.from("conversations").select("id,updated_at,created_by,direct_recipient_id").in("id", ids).order("updated_at", { ascending: false });
      const convs = rows ?? [];
      setConversations(convs);

      const { data: memberRows } = await supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids);
      const allOtherIds = [...new Set((memberRows ?? []).map(row => row.user_id).filter(memberId => memberId !== id))];
      const { data: people } = allOtherIds.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", allOtherIds) : { data: [] };
      setProfiles(Object.fromEntries((people ?? []).map(p => [p.id, p])));
      setLoading(false);
    }
    load();
  }, []);

  async function startConversation(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    setBusy(true); setMessage("");
    const target = username.trim().replace(/^@/, "").toLowerCase();
    const { data: person } = await supabase.from("profiles").select("id").eq("username", target).maybeSingle();
    if (!person || person.id === me) { setMessage(!person ? "Membre introuvable." : "Tu ne peux pas t'envoyer un message à toi-même."); setBusy(false); return; }

    const { data: blocked } = await supabase.from("user_blocks").select("blocker_id,blocked_id").or("blocker_id.eq." + me + ",blocked_id.eq." + me);
    if ((blocked ?? []).some(b => (b.blocker_id === me && b.blocked_id === person.id) || (b.blocker_id === person.id && b.blocked_id === me))) {
      setMessage("Cette conversation est bloquée."); setBusy(false); return;
    }

    const { data: existingMemberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", me);
    const existingIds = (existingMemberships ?? []).map(x => x.conversation_id);
    if (existingIds.length) {
      const { data: existing } = await supabase.from("conversations").select("id").in("id", existingIds).eq("direct_recipient_id", person.id).eq("created_by", me).limit(1).maybeSingle();
      if (existing) { router.push("/messages/" + existing.id); setBusy(false); return; }
    }

    const { data: conversation, error } = await supabase.from("conversations").insert({ created_by: me, direct_recipient_id: person.id }).select("id").single();
    if (error || !conversation) { setMessage("Impossible de créer la conversation."); setBusy(false); return; }

    const { error: memberError } = await supabase.from("conversation_members").insert([{ conversation_id: conversation.id, user_id: me }, { conversation_id: conversation.id, user_id: person.id }]);
    if (memberError) { setMessage("Impossible d'ouvrir la conversation."); setBusy(false); return; }
    router.push("/messages/" + conversation.id);
  }

  return <main className="messagesPage">
    <PrysmNav active="messages" />
    <div className="messagesShell">
      <div className="messagesIntro"><p className="eyebrow">MESSAGERIE PRIVÉE</p><h1>Vos conversations.</h1><p>Des échanges entre membres, avec blocage intégré.</p></div>
      <form className="messageStartForm" onSubmit={startConversation}><input value={username} onChange={e => setUsername(e.target.value)} placeholder="@pseudo" /><button className="primary" disabled={busy}>{busy ? "Ouverture…" : "Nouvelle conversation"}</button></form>
      {message && <p className="authMessage">{message}</p>}
      <section className="conversationList">
        {loading ? <p className="profileMuted">Chargement…</p> : conversations.length === 0 ? <div className="emptyCommunity"><p>Aucune conversation pour le moment.</p></div> : conversations.map(c => {
          const otherId = c.created_by === me ? c.direct_recipient_id : c.created_by;
          const other = profiles[otherId];
          return <button className="conversationRow" key={c.id} onClick={() => router.push("/messages/" + c.id)}>
            <div className="mentionAvatar">{other?.avatar_url ? <img src={other.avatar_url} alt="" /> : (other?.display_name ?? "?").charAt(0).toUpperCase()}</div>
            <div><strong>{other?.display_name ?? "Membre"}</strong><small>@{other?.username ?? "inconnu"}</small></div>
            <time>{new Date(c.updated_at).toLocaleDateString("fr-FR")}</time>
          </button>;
        })}
      </section>
    </div>
  </main>;
}

export default function MessagesPage() {
  return <Suspense fallback={<main className="authPage"><div className="authCard"><p>Chargement…</p></div></main>}><MessagesContent /></Suspense>;
}
