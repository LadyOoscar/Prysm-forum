"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Message = { id: string; sender_id: string; body: string; created_at: string; edited_at: string | null };
type Profile = { id: string; username: string; display_name: string; avatar_url: string | null };

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) { router.push("/login"); return; }
    setMe(userId);

    const { data: members } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", id);
    const memberIds = (members ?? []).map(x => x.user_id);
    if (!memberIds.includes(userId)) { router.push("/messages"); return; }

    const otherId = memberIds.find(x => x !== userId);
    if (otherId) {
      const { data: person } = await supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", otherId).maybeSingle();
      setOther(person);
      const { data: blockRows } = await supabase.from("user_blocks").select("blocker_id,blocked_id").or("blocker_id.eq." + userId + ",blocked_id.eq." + userId);
      setBlocked((blockRows ?? []).some(b => (b.blocker_id === userId && b.blocked_id === otherId) || (b.blocker_id === otherId && b.blocked_id === userId)));
    }

    const { data: rows } = await supabase.from("messages").select("id,sender_id,body,created_at,edited_at").eq("conversation_id", id).order("created_at");
    setMessages(rows ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel("dm-" + id).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, payload => {
      setMessages(current => current.some(m => m.id === payload.new.id) ? current : [...current, payload.new as Message]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function send(event: FormEvent) {
    const supabase = createClient();
    event.preventDefault();
    if (!body.trim() || blocked || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, body: body.trim() }).select("id,sender_id,body,created_at,edited_at").single();
    if (!error && data) { setMessages(current => current.some(m => m.id === data.id) ? current : [...current, data]); setBody(""); await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id); }
    setSending(false);
  }

  async function toggleBlock() {
    const supabase = createClient();
    if (!other) return;
    if (blocked) {
      await supabase.from("user_blocks").delete().eq("blocker_id", me).eq("blocked_id", other.id);
    } else {
      await supabase.from("user_blocks").insert({ blocker_id: me, blocked_id: other.id });
    }
    setBlocked(!blocked);
  }

  if (loading) return <main className="authPage"><div className="authCard"><p>Chargement…</p></div></main>;

  return <main className="messagesPage">
    <header><div className="brand">PRYSM<span>✦</span></div><nav><a href="/">Forum</a><a className="active" href="/messages">Messages</a><a href="/search">Recherche</a></nav><a className="profile" href="/profile">☾ <span>Mon profil</span></a></header>
    <div className="conversationShell">
      <div className="conversationHeader">
        <button className="backButton" onClick={() => router.push("/messages")}>← Messages</button>
        {other && <a href={"/profile/" + other.username} className="conversationPerson"><div className="mentionAvatar">{other.avatar_url ? <img src={other.avatar_url} alt="" /> : other.display_name.charAt(0).toUpperCase()}</div><div><strong>{other.display_name}</strong><small>@{other.username}</small></div></a>}
        <button className="blockButton" onClick={toggleBlock}>{blocked ? "Débloquer" : "Bloquer"}</button>
      </div>
      <section className="messageThread">
        {messages.length === 0 ? <div className="emptyCommunity"><p>La conversation commence ici.</p></div> : messages.map(message => <article className={message.sender_id === me ? "dmMessage own" : "dmMessage"} key={message.id}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleString("fr-FR")}</time></article>)}
      </section>
      <form className="messageComposer" onSubmit={send}><textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000} disabled={blocked} placeholder={blocked ? "Conversation bloquée." : "Écrire un message…"} /><button className="primary" disabled={sending || blocked || !body.trim()}>{sending ? "Envoi…" : "Envoyer"}</button></form>
    </div>
  </main>;
}
