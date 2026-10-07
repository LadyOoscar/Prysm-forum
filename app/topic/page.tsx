"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MentionTextarea from "@/components/MentionTextarea";
import ReactionBar from "@/components/ReactionBar";

type Topic = { id: string; title: string; body: string; created_at: string; community_id: string; author_id: string };
type Post = { id: string; body: string; created_at: string; author_id: string };
type Profile = { id: string; display_name: string; username: string; reputation: number; avatar_url: string | null };

function TopicContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const supabase = createClient();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [community, setCommunity] = useState<{name:string;icon:string} | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [voting, setVoting] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{type: "topic" | "post"; id: string} | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState("");

  async function load() {
    if (!id) return;
    const { data: t } = await supabase.from("topics").select("id,title,body,created_at,community_id,author_id").eq("id", id).maybeSingle();
    if (!t) { setLoading(false); return; }
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("communities").select("name,icon").eq("id", t.community_id).maybeSingle(),
      supabase.from("posts").select("id,body,created_at,author_id").eq("topic_id", id).order("created_at")
    ]);
    const { data: voteRows } = await supabase.from("votes").select("topic_id,post_id,value,user_id").or(`topic_id.eq.${t.id},post_id.in.(${(p ?? []).map(post => post.id).join(",") || "00000000-0000-0000-0000-000000000000"})`);
    const totals: Record<string, number> = {};
    const mine: Record<string, number> = {};
    for (const vote of voteRows ?? []) { const key = vote.topic_id ?? vote.post_id; if (key) totals[key] = (totals[key] ?? 0) + vote.value; }
    const { data: claims } = await supabase.auth.getClaims();
    if (claims?.claims?.sub) { for (const vote of voteRows ?? []) { const key = vote.topic_id ?? vote.post_id; if (key && vote.user_id === claims.claims.sub) mine[key] = vote.value; } }
    setVotes(totals); setMyVotes(mine);
    const authors = [...new Set([t.author_id, ...(p ?? []).map(post => post.author_id)])];
    const { data: profileRows } = await supabase.from("profiles").select("id,display_name,username,reputation,avatar_url").in("id", authors);
    setProfiles(Object.fromEntries((profileRows ?? []).map(profile => [profile.id, profile])));
    setTopic(t); setCommunity(c); setPosts(p ?? []); setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function vote(targetId: string, targetType: "topic" | "post", value: number) {
    if (voting) return;
    setVoting(targetId);
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) { setVoting(null); router.push("/login"); return; }
    const current = myVotes[targetId] ?? 0;
    const target = targetType === "topic" ? { topic_id: targetId, post_id: null } : { topic_id: null, post_id: targetId };
    let error = null;
    if (current === value) { ({ error } = await supabase.from("votes").delete().match({ user_id: claims.claims.sub, ...target })); }
    else if (current !== 0) { ({ error } = await supabase.from("votes").update({ value }).match({ user_id: claims.claims.sub, ...target })); }
    else { ({ error } = await supabase.from("votes").insert({ user_id: claims.claims.sub, value, ...target })); }
    if (!error) { const delta = current === value ? -current : value - current; setVotes(prev => ({ ...prev, [targetId]: (prev[targetId] ?? 0) + delta })); setMyVotes(prev => ({ ...prev, [targetId]: current === value ? 0 : value })); }
    setVoting(null);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportTarget || reportReason.trim().length < 3) return;
    setReporting(true);
    setReportMessage("");
    const { data: claims } = await supabase.auth.getClaims();
    const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (!userId) { setReporting(false); router.push("/login"); return; }
    const payload: { reporter_id: string; topic_id: string | null; post_id: string | null; reason: string } = reportTarget.type === "topic"
      ? { reporter_id: userId, topic_id: reportTarget.id, post_id: null, reason: reportReason.trim() }
      : { reporter_id: userId, topic_id: null, post_id: reportTarget.id, reason: reportReason.trim() };
    const { error } = await supabase.from("reports").insert(payload);
    setReporting(false);
    if (error) { setReportMessage("Impossible d’envoyer le signalement."); return; }
    setReportMessage("Signalement envoyé aux modérateurs.");
    setReportReason("");
  }

  function openReport(type: "topic" | "post", targetId: string) {
    setReportMessage("");
    setReportReason("");
    setReportTarget({ type, id: targetId });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (reply.trim().length < 2 || !id) return;
    setPosting(true);
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) { router.push("/login"); return; }
    const { error } = await supabase.from("posts").insert({ topic_id: id, author_id: claims.claims.sub, body: reply.trim() });
    setPosting(false);
    if (error) { setMessage("Impossible de publier la réponse."); return; }
    setReply("");
    load();
  }

  if (loading) return <main><div className="authPage"><div className="authCard"><p>Chargement…</p></div></div></main>;
  if (!topic) return <main><div className="authPage"><div className="authCard"><h1>Sujet introuvable</h1><a href="/">Retour au forum</a></div></div></main>;

  return <main>
    <header>
      <div className="brand">PRYSM<span>✦</span></div>
      <nav><a href="/">Forum</a><a>Rencontres</a><a href="/">Communautés</a><a href="/pantheon">Panthéon</a></nav>
      <a className="profile" href="/profile">☾ <span>Mon profil</span></a>
    </header>
    <div className="topicPage">
      <button className="backButton" onClick={() => router.push("/")}>← Retour au forum</button>
      <p className="eyebrow">{community?.icon} {community?.name ?? "COMMUNAUTÉ"}</p>
      <h1>{topic.title}</h1>
      <article className="topicPost"><p className="topicMeta"><strong>{profiles[topic.author_id]?.display_name ?? "Membre"}</strong> · ⭐ {profiles[topic.author_id]?.reputation ?? 0} · publié le {new Date(topic.created_at).toLocaleDateString("fr-FR")}</p><div className="topicContent">{topic.body}</div><div className="postActions"><div><div className="voteBar"><button className={myVotes[topic.id] === 1 ? "vote active" : "vote"} onClick={() => vote(topic.id, "topic", 1)}>▲</button><strong>{votes[topic.id] ?? 0}</strong><button className={myVotes[topic.id] === -1 ? "vote active" : "vote"} onClick={() => vote(topic.id, "topic", -1)}>▼</button></div><ReactionBar topicId={topic.id} /></div><button className="reportButton" onClick={() => openReport("topic", topic.id)}>⚑ Signaler</button></div></article>
      <section className="replies">
        <h2>{posts.length} réponse{posts.length !== 1 ? "s" : ""}</h2>
        {posts.map((post, i) => <article className="reply" key={post.id}><div className="replyNumber">#{i + 1}</div><div><p className="topicMeta"><strong>{profiles[post.author_id]?.display_name ?? "Membre"}</strong> · ⭐ {profiles[post.author_id]?.reputation ?? 0} · {new Date(post.created_at).toLocaleDateString("fr-FR")}</p><p>{post.body}</p><div className="postActions"><div><div className="voteBar"><button className={myVotes[post.id] === 1 ? "vote active" : "vote"} onClick={() => vote(post.id, "post", 1)}>▲</button><strong>{votes[post.id] ?? 0}</strong><button className={myVotes[post.id] === -1 ? "vote active" : "vote"} onClick={() => vote(post.id, "post", -1)}>▼</button></div><ReactionBar postId={post.id} /></div><button className="reportButton" onClick={() => openReport("post", post.id)}>⚑ Signaler</button></div></div></article>)}
      </section>
      <form className="replyForm" onSubmit={submit}>
        <h2>Répondre</h2>
        <MentionTextarea value={reply} onChange={setReply} placeholder="Votre réponse…"/>
        {message && <p className="authMessage">{message}</p>}
        <button className="primary" disabled={posting}>{posting ? "Publication…" : "Publier la réponse"}</button>
      </form>
    </div>
    {reportTarget && <div className="modalBackdrop" onClick={() => setReportTarget(null)}><div className="modalCard reportCard" onClick={event => event.stopPropagation()}><h2>Signaler {reportTarget.type === "topic" ? "ce sujet" : "ce message"}</h2><p className="reportIntro">Décrivez brièvement le problème afin que les modérateurs puissent l’examiner.</p><form onSubmit={submitReport}><textarea value={reportReason} onChange={event => setReportReason(event.target.value)} minLength={3} maxLength={1000} placeholder="Motif du signalement…" required />{reportMessage && <p className="authMessage">{reportMessage}</p>}<div className="modalActions"><button type="button" className="secondary" onClick={() => setReportTarget(null)}>Annuler</button><button className="primary" disabled={reporting}>{reporting ? "Envoi…" : "Envoyer le signalement"}</button></div></form></div></div>}
  </main>;
}

export default function TopicPage() {
  return <Suspense fallback={<main><div className="authPage"><div className="authCard"><p>Chargement…</p></div></div></main>}><TopicContent /></Suspense>;
}