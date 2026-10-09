"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import CommunityCalendar from "./components/community-calendar";

const sections = [
  { title: "Discussions générales", text: "Parler, débattre, partager et faire vivre la communauté.", href: "/forum/general" },
  { title: "Culture & passions", text: "Jeux, musique, lecture, cinéma et tout ce qui mérite une discussion.", href: "/forum/culture" },
  { title: "Entraide & quotidien", text: "Questions, conseils et coups de main entre membres.", href: "/forum/entraide" },
  { title: "Rencontres", text: "Faire connaissance sans transformer PRYSM en catalogue de profils.", href: "/rencontres" },
  { title: "PRYSM Orbite", text: "Découvrir les membres autour de toi dans un système d’orbites animé.", href: "/orbite" },
];

export default function HomePage() {
  const [canModerate, setCanModerate] = useState(false);
  const [orbitAvatar, setOrbitAvatar] = useState<string | null>(null);
  const [orbitName, setOrbitName] = useState("P");

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
    <section className="hero"><div><p className="eyebrow">PRYSM · forum social</p><h1>Le forum d’abord.<br/><span>Les rencontres ensuite.</span></h1><p className="lead">Un espace communautaire où les conversations comptent autant que les profils. Le socle est maintenant relié à Supabase et prêt à accueillir les premiers échanges.</p><div className="actions"><Link className="button primary" href="/forum">Entrer sur le forum</Link><Link className="button" href="/rencontres">Découvrir les rencontres</Link></div></div><Link className="home-orbit" href="/orbite" aria-label="Découvrir PRYSM Orbite"><span className="home-orbit-stars" aria-hidden="true"/><span className="home-orbit-ring home-orbit-ring-1"><i className="home-orbit-dot"/></span><span className="home-orbit-ring home-orbit-ring-2"><i className="home-orbit-dot"/></span><span className="home-orbit-ring home-orbit-ring-3"><i className="home-orbit-dot"/></span><span className="home-orbit-ring home-orbit-ring-4"><i className="home-orbit-dot"/></span><span className="home-orbit-sun">{orbitAvatar ? <img src={orbitAvatar} alt=""/> : <b>{orbitName}</b>}</span><span className="home-orbit-caption"><strong>PRYSM ORBITE</strong><small>Les membres dans ta galaxie</small></span></Link></section>
    <section className="section"><div className="section-heading"><div><p className="eyebrow">Le cœur de PRYSM</p><h2>Les conversations avant les algorithmes.</h2></div><span className="status">FORUM 0.2</span></div><div className="cards">{sections.map(s => <Link className="card" href={s.href} key={s.title}><span>Section</span><h3>{s.title}</h3><p>{s.text}</p><strong>Ouvrir →</strong></Link>)}</div></section>
    <section className="feature"><div><p className="eyebrow">Fondation</p><h2>Le forum, les profils et les premiers outils sociaux sont branchés sur la base.</h2></div><p>Les Rencontres disposent maintenant d’une découverte de profils et de likes. Les prochains paliers seront les matchs, les filtres et la protection renforcée des données.</p></section>
    <CommunityCalendar />
    <footer>PRYSM · Forum social · Fondation 0.3</footer>
  </main>;
}