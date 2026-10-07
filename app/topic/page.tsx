"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Topic = { id: string; title: string; body: string; created_at: string; community_id: string };
type Post = { id: string; body: string; created_at: string };

export default function TopicPage() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const supabase = createClient();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [community, setCommunity] = useState<{name:string;icon:string} | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    if (!id) return;
    const { data: t } = await supabase.from("topics").select("id,title,body,created_at,community_id").eq("id", id).maybeSingle();
    if (!t) { setLoading(false); return; }
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("communities").select("name,icon").eq("id", t.community_id).maybeSingle(),
      supabase.from("posts").select("id,body,created_at").eq("topic_id", id).order("created_at")
    ]);
    setTopic(t); setCommunity(c); setPosts(p ?? []); setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

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
      <nav><a href="/">Forum</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav>
      <a className="profile" href="/profile">☾ <span>Mon profil</span></a>
    </header>
    <div className="topicPage">
      <button className="backButton" onClick={() => router.push("/")}>← Retour au forum</button>
      <p className="eyebrow">{community?.icon} {community?.name ?? "COMMUNAUTÉ"}</p>
      <h1>{topic.title}</h1>
      <article className="topicPost"><p className="topicMeta">Publié le {new Date(topic.created_at).toLocaleDateString("fr-FR")}</p><div className="topicContent">{topic.body}</div></article>
      <section className="replies">
        <h2>{posts.length} réponse{posts.length !== 1 ? "s" : ""}</h2>
        {posts.map((post, i) => <article className="reply" key={post.id}><div className="replyNumber">#{i + 1}</div><div><p className="topicMeta">{new Date(post.created_at).toLocaleDateString("fr-FR")}</p><p>{post.body}</p></div></article>)}
      </section>
      <form className="replyForm" onSubmit={submit}>
        <h2>Répondre</h2>
        <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Votre réponse…" maxLength={10000} required />
        {message && <p className="authMessage">{message}</p>}
        <button className="primary" disabled={posting}>{posting ? "Publication…" : "Publier la réponse"}</button>
      </form>
    </div>
  </main>;
}