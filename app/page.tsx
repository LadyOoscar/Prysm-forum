"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import CommunityCalendar from "./components/community-calendar";
import Stories from "./components/stories";
import SiteBanner from "./components/site-banner";

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
        <Link href="/gaydar">Orbite</Link>
        <Link href="/messages">Messages</Link>
        <Link href="/profil">Profil</Link>
        {canModerate && <Link href="/moderation" aria-label="Espace Modo/Admin">Modo/Admin</Link>}
      </nav>
    </header>
    <SiteBanner />
    <Stories />
    <section className="hero home-community-hero home-community-hero-no-orbit"><div><p className="eyebrow">PRYSM · réseau communautaire queer</p><h1>Bienvenue dans<br/><span>ta galaxie.</span></h1><p className="lead">Un forum queer, mille façons d’être soi. On échange, on s’entraide et on refait le monde. Tu peux participer sans avoir à expliquer qui tu es.</p><div className="actions"><Link className="button primary" href="/forum">Rejoindre les discussions <span aria-hidden="true">↗</span></Link><Link className="button" href="/gaydar">Explorer Orbite</Link></div><p className="home-community-note"><span aria-hidden="true">✳</span> Identités libres · Communauté vivante · Respect mutuel</p></div></section>
    <style jsx>{`
      .home-community-hero-no-orbit { grid-template-columns: minmax(0, 1fr); min-height: 0; padding: 43px 0 32px; }
      .home-community-hero-no-orbit > div { max-width: 80.64%; }
      .home-community-hero-no-orbit h1 { font-size: 80.64%; line-height: 1.08; }
      .home-community-hero-no-orbit .eyebrow, .home-community-hero-no-orbit .lead, .home-community-hero-no-orbit .home-community-note { font-size: 80.64%; }
      .home-community-hero-no-orbit .lead { max-width: 80.64%; }
      .home-community-hero-no-orbit .actions { gap: 6px; }
      .home-community-hero-no-orbit .button { transform: scale(.3584); transform-origin: left center; }
      .home-community-hero-no-orbit .home-community-note { margin-top: 10px; }
      @media (max-width: 640px) {
        .home-community-hero-no-orbit > div, .home-community-hero-no-orbit .lead { max-width: 100%; }
        .home-community-hero-no-orbit .actions { gap: 6px; flex-wrap: wrap; }
        .home-community-hero-no-orbit .button { transform: scale(.448); transform-origin: left center; }
      }
    `}</style>
    <section className="home-popular">
      <div className="section-heading home-popular-heading"><div><p className="eyebrow">À suivre en ce moment</p><h2>Topics populaires</h2></div><Link className="home-popular-all" href="/forum">Tout le forum <span>↗</span></Link></div>
      {popularTopics.length > 0 ? <div className="home-popular-list">{popularTopics.map((topic, index) => <Link className={"home-popular-topic category-" + topic.categorySlug} href={"/topic/" + topic.id} key={topic.id}><span className="home-popular-rank">{String(index + 1).padStart(2, "0")}</span><span className="home-popular-copy"><span className="home-popular-category">{topic.categoryName}</span><strong>{topic.title}</strong><small>{topic.postCount} message{topic.postCount > 1 ? "s" : ""} · {topic.voteCount} vote{topic.voteCount > 1 ? "s" : ""}</small></span><span className="home-popular-arrow">↗</span></Link>)}</div> : <div className="home-popular-empty">{topicsLoaded ? "Les premières discussions apparaîtront ici dès qu’elles seront actives." : "Recherche des discussions actives…"}</div>}
      <div className="home-category-legend"><span className="legend-general">Général</span><span className="legend-culture">Culture & passions</span><span className="legend-entraide">Entraide & quotidien</span></div>
    </section>
    <CommunityCalendar />
    <footer>PRYSM · Forum social</footer>
  </main>;
}
