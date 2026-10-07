"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; display_name: string; bio: string; avatar_url: string | null; banner_url: string | null; pronouns: string | null; identity: string | null; interests: string[]; reputation: number };
type Topic = { id: string; title: string; created_at: string; community_id: string };
type Community = { name: string; icon: string; slug: string };

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [communities, setCommunities] = useState<Record<string, Community>>({});
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from("profiles").select("id,username,display_name,bio,avatar_url,banner_url,pronouns,identity,interests,reputation").eq("username", username).maybeSingle();
      if (!p) { setLoading(false); return; }

      const [{ data: topicRows }, { count }] = await Promise.all([
        supabase.from("topics").select("id,title,created_at,community_id").eq("author_id", p.id).order("created_at", { ascending: false }).limit(12),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", p.id),
      ]);

      const ids = [...new Set((topicRows ?? []).map(t => t.community_id))];
      const { data: communityRows } = ids.length
        ? await supabase.from("communities").select("id,name,icon,slug").in("id", ids)
        : { data: [] };

      setProfile(p as Profile);
      setTopics(topicRows ?? []);
      setPostCount(count ?? 0);
      setCommunities(Object.fromEntries((communityRows ?? []).map(c => [c.id, c])));
      setLoading(false);
    }
    load();
  }, [username]);

  if (loading) return <main className="authPage"><div className="authCard"><p>Chargement du profil…</p></div></main>;
  if (!profile) return <main className="authPage"><div className="authCard"><a className="brand authBrand" href="/">PRYSM<span>✦</span></a><h1>Profil introuvable</h1><p className="authIntro">Ce membre n'existe pas ou son profil n'est plus disponible.</p><a className="authSwitch" href="/">← Retour au forum</a></div></main>;

  return (
    <main>
      <header>
        <div className="brand">PRYSM<span>✦</span></div>
        <nav><a href="/">Forum</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav>
        <a className="profile" href="/profile">☾ <span>Mon profil</span></a>
      </header>
      <div className="publicProfilePage">
        <button className="backButton" onClick={() => router.push("/")}>← Retour au forum</button>
        <section className="publicProfileHero">
          <div className="publicAvatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile.display_name || profile.username).charAt(0).toUpperCase()}</div>
          <div className="publicIdentity">
            <p className="eyebrow">MEMBRE PRYSM</p>
            <h1>{profile.display_name || profile.username}</h1>
            <p className="username">@{profile.username}{profile.pronouns ? ` · ${profile.pronouns}` : ""}</p>
            {profile.bio && <p className="publicBio">{profile.bio}</p>}
          </div>
          <div className="reputationCard"><strong>⭐ {profile.reputation}</strong><span>réputation</span></div>
        </section>
        <div className="publicStats">
          <div><strong>{topics.length}</strong><span>sujets récents</span></div>
          <div><strong>{postCount}</strong><span>réponses</span></div>
        </div>
        <section className="publicActivity">
          <div className="feedHead"><div><span className="eyebrow">ACTIVITÉ</span><h2>Sujets récents</h2></div></div>
          {topics.length === 0 ? <article className="emptyCommunity"><p>Ce membre n'a encore créé aucun sujet.</p></article> : topics.map(topic => {
            const community = communities[topic.community_id];
            return <article className="topic" key={topic.id} onClick={() => router.push(`/topic?id=${topic.id}`)}>
              <div className="topicIcon">{community?.icon ?? "✦"}</div>
              <div className="topicBody"><h3>{topic.title}</h3><p>{community?.name ?? "Discussion"} · {new Date(topic.created_at).toLocaleDateString("fr-FR")}</p></div>
            </article>;
          })}
        </section>
      </div>
    </main>
  );
}
