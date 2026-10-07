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
  description: string;
  banner_url: string | null;
  rules: string;
};

type Profile = { id: string; username: string; display_name: string; reputation: number; avatar_url: string | null };

type Topic = {
  id: string;
  author_id: string;
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
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("communities")
        .select("id,slug,name,icon,category,description,banner_url,rules")
        .eq("slug", slug)
        .maybeSingle();

      if (!c) {
        setLoading(false);
        return;
      }

      const [{ data: topicRows, count: topicsTotal }, { count: postsTotal }] = await Promise.all([
        supabase
          .from("topics")
          .select("id,title,body,created_at,is_pinned,is_locked,author_id", { count: "exact" })
          .eq("community_id", c.id)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("posts")
          .select("id,topics!inner(community_id)", { count: "exact", head: true })
          .eq("topics.community_id", c.id),
      ]);

      const { data: claims } = await supabase.auth.getClaims();
      const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
      const [{ count: membersTotal }, { data: membership }] = await Promise.all([
        supabase.from("community_members").select("user_id", { count: "exact", head: true }).eq("community_id", c.id),
        userId ? supabase.from("community_members").select("user_id").eq("community_id", c.id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const authorIds = [...new Set((topicRows ?? []).map(t => t.author_id))];
      const { data: authorRows } = authorIds.length ? await supabase.from("profiles").select("id,username,display_name,reputation,avatar_url").in("id", authorIds) : { data: [] };
      const topicIds = (topicRows ?? []).map(t => t.id);
      const { data: postRows } = topicIds.length ? await supabase.from("posts").select("topic_id").in("topic_id", topicIds) : { data: [] };
      const counts: Record<string, number> = {};
      for (const row of postRows ?? []) counts[row.topic_id] = (counts[row.topic_id] ?? 0) + 1;
      setProfiles(Object.fromEntries((authorRows ?? []).map(p => [p.id, p])));
      setReplyCounts(counts);
      setMemberCount(membersTotal ?? 0);
      setIsMember(Boolean(membership));
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

  async function toggleMembership() {
    if (!community || membershipLoading) return;
    setMembershipLoading(true);
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
    if (!userId) {
      router.push("/login");
      return;
    }

    if (isMember) {
      const { error } = await supabase.from("community_members").delete().eq("community_id", community.id).eq("user_id", userId);
      if (!error) { setIsMember(false); setMemberCount(value => Math.max(0, value - 1)); }
    } else {
      const { error } = await supabase.from("community_members").insert({ community_id: community.id, user_id: userId, role: "member" });
      if (!error) { setIsMember(true); setMemberCount(value => value + 1); }
    }
    setMembershipLoading(false);
  }

  if (!community) {
    return <main><div className="authPage"><div className="authCard"><h1>Sous-forum introuvable</h1><a href="/">Retour au forum</a></div></div></main>;
  }

  return (
    <main>
      <header>
        <div className="brand">PRYSM<span>✦</span></div>
        <nav><a className="active" href="/">Forum</a><a>Rencontres</a><a href="/">Communautés</a><a href="/pantheon">Panthéon</a></nav>
        <a className="profile" href="/profile">☾ <span>Mon profil</span></a>
      </header>

      <div className="communityPage">
        <button className="backButton" onClick={() => router.push("/")}>← Retour au forum</button>

        <section className="communityHero" style={community.banner_url ? {backgroundImage:`linear-gradient(#17121fe8,#17121ff5),url(${community.banner_url})`,backgroundSize:"cover",backgroundPosition:"center"} : undefined}>
          <div className="communityHeroIcon">{community.icon}</div>
          <div>
            <p className="eyebrow">{community.category}</p>
            <h1>{community.name}</h1>
            <p>{community.description || "Un espace de discussion de PRYSM. Partagez vos expériences, vos passions et vos idées avec la communauté."}</p>
          </div>
          <div className="communityHeroActions"><button className={isMember ? "secondaryButton" : "primary"} onClick={toggleMembership} disabled={membershipLoading}>{membershipLoading ? "…" : isMember ? "✓ Membre" : "Rejoindre"}</button><button className="primary" onClick={() => router.push(`/?community=${community.slug}`)}>+ Créer un sujet</button></div>
        </section>

        <div className="communityStats">
          <div><strong>{topicCount}</strong><span>sujet{topicCount !== 1 ? "s" : ""}</span></div>
          <div><strong>{postCount}</strong><span>message{postCount !== 1 ? "s" : ""}</span></div>
          <div><strong>{memberCount}</strong><span>membre{memberCount !== 1 ? "s" : ""}</span></div>
        </div>

        {community.rules && <section className="communityRules"><p className="eyebrow">RÈGLES</p><p>{community.rules}</p></section>}\n\n        <section className="communityTopics">
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
                <p>{topic.is_pinned ? "Sujet épinglé · " : ""}{topic.is_locked ? "🔒 Verrouillé · " : ""}{profiles[topic.author_id]?.display_name ?? "Membre"} · 💬 {replyCounts[topic.id] ?? 0} · {new Date(topic.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
