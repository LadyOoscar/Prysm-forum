"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import CommunityCalendar from "./components/community-calendar";
import Stories from "./components/stories";

type PopularTopic = {
  id: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  postCount: number;
  voteCount: number;
  activity: number;
};

export default function HomePage() {
  const [canModerate, setCanModerate] = useState(false);
  const [orbitAvatar, setOrbitAvatar] = useState<string | null>(null);
  const [orbitName, setOrbitName] = useState("P");
  const [popularTopics, setPopularTopics] = useState<PopularTopic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("profiles").select("is_moderator,is_admin,display_name,username,avatar_url").eq("id", user.id).maybeSingle();
      if (active && !error) {
        setCanModerate(Boolean(data?.is_moderator || data?.is_admin));
        setOrbitAvatar(data?.avatar_url ?? null);
        setOrbitName((data?.display_name || data?.username || "P").slice(0, 1).toUpperCase());
      }
    }
    void checkRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void checkRole(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    async function loadPopularTopics() {
      const [{ data: categories }, { data: topics }] = await Promise.all([
        supabase.from("forum_categories").select("id,slug,name"),
        supabase.from("forum_topics").select("id,title,category_id,updated_at").order("updated_at", { ascending: false }).limit(40),
      ]);
      if (!active) return;
      if (!topics?.length) {
        setPopularTopics([]);
        setTopicsLoaded(true);
        return;
      }
      const ids = topics.map((topic) => topic.id);
      const { data: stats } = await supabase.from("forum_topic_stats").select("topic_id,post_count,vote_count,up_votes,down_votes,last_post_at").in("topic_id", ids);
      if (!active) return;
      const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
      const statsByTopic = new Map((stats ?? []).map((stat) => [stat.topic_id, stat]));
      const now = Date.now();
      const ranked = topics.map((topic) => {
        const stat = statsByTopic.get(topic.id);
        const postCount = stat?.post_count ?? 1;
        const voteCount = stat?.vote_count ?? 0;
        const lastActivity = new Date(stat?.last_post_at ?? topic.updated_at).getTime();
        const hoursSinceActivity = Math.max(0, (now - lastActivity) / 36e5);
        const freshness = Math.max(0, 48 - hoursSinceActivity) / 8;
        const activity = postCount * 2 + voteCount * 1.5 + freshness;
        const category = categoryById.get(topic.category_id);
        return {
          id: topic.id,
          title: topic.title,
          categoryName: category?.name ?? "Forum",
          categorySlug: category?.slug ?? "other",
          postCount,
          voteCount,
          activity,
        };
      }).sort((a, b) => b.activity - a.activity).slice(0, 5);
      setPopularTopics(ranked);
      setTopicsLoaded(true);
    }
    void loadPopularTopics();
    return () => { active = false; };
  }, []);

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/">PRYSM</Link>
      <nav>
        <Link className="active" href="/">Accueil</Link>
        <Link href="/forum">Forum</Link>
        <Link href="/rencontres">Rencontres</Link>
        <Link href="/orbite">Orbite</Link>
        <Link href="/messages">Messages</Link>
        <Link href="/profil">Profil</Link>
        {canModerate && <Link href="/moderation" aria-label="Espace Modo/Admin">Modo/Admin</Link>}
      </nav>
    </header>
    <Stories />
    <section className="hero"><div><p className="eyebrow">PRYSM · forum social</p><h1>Le forum d’abord.<br/><span>Les rencontres ensuite.</span></h1><p className="lead">Un espace communautaire où les conversations comptent autant que les profils.</p></div><Link className="home-orbit" href="/orbite" aria-label="Découvrir PRYSM Orbite"><span className="home-orbit-stars" aria-hidden="true"/><span className="home-orbit-ring home-orbit-ring-1"><i className="home-orbit-dot"/></span><span className="home-orbit-ring home-orbit-ring-2"><i className="home-orbit-dot"/></span><span className="home-orbit-ring home-orbit-ring-3"><i className="home-orbit-dot"/></span><span className="home-orbit-ring home-orbit-ring-4"><i className="home-orbit-dot"/></span><span className="home-orbit-sun">{orbitAvatar ? <img src={orbitAvatar} alt=""/> : <b>{orbitName}</b>}</span><span className="home-orbit-caption"><strong>PRYSM ORBITE</strong><small>Les membres dans ta galaxie</small></span></Link></section>
    <section className="home-popular">
      <div className="section-heading home-popular-heading"><div><p className="eyebrow">À suivre en ce moment</p><h2>Topics populaires</h2></div><Link className="home-popular-all" href="/forum">Tout le forum <span>↗</span></Link></div>
      {popularTopics.length > 0 ? <div className="home-popular-list">{popularTopics.map((topic, index) => <Link className={"home-popular-topic category-" + topic.categorySlug} href={"/topic/" + topic.id} key={topic.id}><span className="home-popular-rank">{String(index + 1).padStart(2, "0")}</span><span className="home-popular-copy"><span className="home-popular-category">{topic.categoryName}</span><strong>{topic.title}</strong><small>{topic.postCount} message{topic.postCount > 1 ? "s" : ""} · {topic.voteCount} vote{topic.voteCount > 1 ? "s" : ""}</small></span><span className="home-popular-arrow">↗</span></Link>)}</div> : <div className="home-popular-empty">{topicsLoaded ? "Les premières discussions apparaîtront ici dès qu’elles seront actives." : "Recherche des discussions actives…"}</div>}
      <div className="home-category-legend"><span className="legend-general">Général</span><span className="legend-culture">Culture & passions</span><span className="legend-entraide">Entraide & quotidien</span></div>
    </section>
    <CommunityCalendar />
    <footer>PRYSM · Forum social</footer>
  </main>;
}
