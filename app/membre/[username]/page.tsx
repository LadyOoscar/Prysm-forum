import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";
import BlockButton from "./block-button";
import DatingFavorite from "../../../components/dating-favorite";
import CompatibilityScore from "../../../components/compatibility-score";
import { getReputationTitle } from "../../../lib/reputation";

export const revalidate = 30;

type PublicProfile = {
  id:string;
  username:string; display_name:string; bio:string; avatar_url:string|null; pronouns:string|null; identity:string|null;
  interests:string[]; age:number|null; location:string|null; orientation:string|null; looking_for:string|null; dating_enabled:boolean; reputation:number; created_at:string;
};

export default async function PublicProfilePage({params}:{params:Promise<{username:string}>}) {
  const {username}=await params;
  const {data:profile}=await getSupabase().from("profiles").select("id, username, display_name, bio, avatar_url, pronouns, identity, interests, age, location, orientation, looking_for, dating_enabled, reputation, created_at").eq("username",username).maybeSingle();
  if(!profile) notFound();
  const person=profile as PublicProfile;
  const { data: badgeRows } = await getSupabase().from("profile_badges").select("badge_id, badges:badge_id(name, icon, tone, description)").eq("profile_id", profile.id).order("awarded_at", { ascending: false });
  const initials=(person.display_name||person.username||"?").slice(0,1).toUpperCase();
  return <main className="shell">
    <style>{`.public-profile-hero{display:flex;align-items:center;gap:20px}.public-avatar{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#0d0d14;font-size:2rem;font-weight:900;flex:none}.public-avatar img{width:100%;height:100%;object-fit:cover}.public-profile-hero h1{font-size:clamp(2.6rem,6vw,4.8rem);margin:0 0 8px}.public-username{margin:0;color:var(--muted);font-size:.9rem}.public-profile-grid{display:grid;grid-template-columns:1.4fr .8fr;gap:14px;padding-bottom:80px}.public-profile-card{margin:0}.profile-label{display:block;color:var(--accent);font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;font-weight:800;margin-bottom:18px}.public-bio{white-space:pre-wrap;line-height:1.75;color:var(--text)!important;margin:0 0 26px!important}.public-details{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.public-details div{padding:14px;border:1px solid var(--line);border-radius:12px;background:#0d0f16}.public-details span{display:block;color:var(--muted);font-size:.72rem;margin-bottom:5px}.public-details strong{font-size:.9rem}.interest-list{display:flex;gap:8px;flex-wrap:wrap}.interest-tag{padding:7px 10px;border:1px solid var(--line);border-radius:999px;background:#0d0f16;color:var(--text);font-size:.78rem}.public-muted{color:var(--muted)!important}.profile-presence{display:flex;align-items:center;gap:8px;margin-top:28px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:.78rem}@media(max-width:700px){.public-profile-grid{grid-template-columns:1fr}.public-details{grid-template-columns:1fr}.public-profile-hero{align-items:flex-start}}`}</style>
    <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link className="active" href="/forum">Forum</Link><Link href="/recherche">Recherche</Link><Link href="/messages">Messages</Link><Link href="/profil">Profil</Link></nav></header>
    <section className="page-head compact"><Link className="back" href="/forum">← Retour au forum</Link><p className="eyebrow">Profil public</p><div className="public-profile-hero"><div className="public-avatar">{person.avatar_url?<img src={person.avatar_url} alt=""/>:initials}</div><div><h1>{person.display_name||person.username}</h1><p className="public-username">@{person.username}</p><p className="reputation-line"><strong>{person.reputation}</strong> réputation · {getReputationTitle(person.reputation)}</p><div className="public-badges">{(badgeRows ?? []).map((row:any)=><span className={"profile-badge " + (row.badges?.tone === "negative" ? "negative" : "")} title={row.badges?.description || "Badge PRYSM"} key={row.badge_id}>{row.badges?.icon} {row.badges?.name}</span>)}</div></div></div></section>
    <section className="public-profile-grid">
      <article className="profile-box public-profile-card"><span className="profile-label">À propos</span><p className="public-bio">{person.bio||"Cette personne n’a pas encore écrit de présentation."}</p><div className="public-details">{person.pronouns&&<div><span>Pronoms</span><strong>{person.pronouns}</strong></div>}{person.identity&&<div><span>Identité</span><strong>{person.identity}</strong></div>}{person.age!==null&&<div><span>Âge</span><strong>{person.age} ans</strong></div>}{person.location&&<div><span>Région</span><strong>{person.location}</strong></div>}{person.orientation&&<div><span>Orientation</span><strong>{person.orientation}</strong></div>}{person.looking_for&&<div><span>Recherche</span><strong>{person.looking_for}</strong></div>}</div></article>
      <aside className="profile-box public-profile-card"><span className="profile-label">Centres d’intérêt</span>{person.interests?.length?<div className="interest-list">{person.interests.map(i=><span className="interest-tag" key={i}>{i}</span>)}</div>:<p className="public-muted">Aucun centre d’intérêt renseigné.</p>}<div className="profile-presence"><span className={person.dating_enabled?"presence-dot active":"presence-dot"}/>{person.dating_enabled?"Profil ouvert aux rencontres":"Rencontres désactivées"}</div><div style={{marginTop:18,display:"flex",gap:8,flexWrap:"wrap"}}><BlockButton username={person.username}/>{person.dating_enabled&&<DatingFavorite profileId={person.id}/>}</div><CompatibilityScore profileId={person.id}/></aside>
    </section>
  </main>;
}