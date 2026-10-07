"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Community = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  category: string;
};

type Topic = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_pinned: boolean;
  is_locked: boolean;
};

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [community, setCommunity] = useState<Community | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicCount, setTopicCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("communities")
        .select("id,slug,name,icon,category")
        .eq("slug", slug)
        .maybeSingle();

      if (!c) {
        setLoading(false);
        return;
      }

      const [{ data: topicRows, count: topicsTotal }, { count: postsTotal }] = await Promise.all([
        supabase
          .from("topics")
          .select("id,title,body,created_at,is_pinned,is_locked", { count: "exact" })
          .eq("community_id", c.id)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("posts")
          .select("id,topics!inner(community_id)", { count: "exact", head: true })
          .eq("topics.community_id", c.id),
      ]);

      setCommunity(c);
      setTopics(topicRows ?? []);
      setTopicCount(topicsTotal ?? 0);
      setPostCount(postsTotal ?? 0);
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return <main><div className="authPage"><div className="authCard"><p>Chargement du sous-forum…</p></div></div></main>;
  }

  if (!community) {
    return <main><div className="authPage"><div className="authCard"><h1>Sous-forum introuvable</h1><a href="/">Retour au forum</a></div></div></main>;
  }

  return (
    <main>
      <header>
        <div className="brand">PRYSM<span>✦</span></div>
        <nav><a className="active" href="/">Forum</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav>
        <a className="profile" href="/profile">☾ <span>Mon profil</span></a>
      </header>

      <div className="communityPage">
        <button className="backButton" onClick={() => router.push("/")}>← Retour au forum</button>

        <section className="communityHero">
          <div className="communityHeroIcon">{community.icon}</div>
          <div>
            <p className="eyebrow">{community.category}</p>
            <h1>{community.name}</h1>
            <p>Un espace de discussion de PRYSM. Partagez vos expériences, vos passions et vos idées avec la communauté.</p>
          </div>
          <button className="primary" onClick={() => router.push(`/?community=${community.slug}`)}>+ Créer un sujet</button>
        </section>

        <div className="communityStats">
          <div><strong>{topicCount}</strong><span>sujet{topicCount !== 1 ? "s" : ""}</span></div>
          <div><strong>{postCount}</strong><span>message{postCount !== 1 ? "s" : ""}</span></div>
        </div>

        <section className="communityTopics">
          <div className="feedHead">
            <div><span className="eyebrow">DISCUSSIONS</span><h2>Les sujets du sous-forum</h2></div>
            <button className="filter">Les plus récents ▾</button>
          </div>

          {topics.length === 0 ? (
            <article className="emptyCommunity">
              <div className="communityHeroIcon">{community.icon}</div>
              <h3>Ce sous-forum est encore silencieux.</h3>
              <p>Soyez la première personne à lancer une discussion.</p>
            </article>
          ) : topics.map(topic => (
            <article className="topic" key={topic.id} onClick={() => router.push(`/topic?id=${topic.id}`)}>
              <div className="topicIcon">{topic.is_pinned ? "📌" : community.icon}</div>
              <div className="topicBody">
                <h3>{topic.title}</h3>
                <p>{topic.is_pinned ? "Sujet épinglé · " : ""}{topic.is_locked ? "🔒 Verrouillé · " : ""}{new Date(topic.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
