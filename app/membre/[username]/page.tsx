import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

export const revalidate = 30;

type PublicProfile = {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  pronouns: string | null;
  identity: string | null;
  interests: string[];
  age: number | null;
  location: string | null;
  orientation: string | null;
  looking_for: string | null;
  dating_enabled: boolean;
  created_at: string;
};

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url, pronouns, identity, interests, age, location, orientation, looking_for, dating_enabled, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const person = profile as PublicProfile;
  const initials = (person.display_name || person.username || "?").slice(0, 1).toUpperCase();

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link className="active" href="/forum">Forum</Link>
          <Link href="/recherche">Recherche</Link>
          <Link href="/profil">Profil</Link>
        </nav>
      </header>

      <section className="page-head compact">
        <Link className="back" href="/forum">← Retour au forum</Link>
        <p className="eyebrow">Profil public</p>
        <div className="public-profile-hero">
          <div className="public-avatar">{person.avatar_url ? <img src={person.avatar_url} alt="" /> : initials}</div>
          <div>
            <h1>{person.display_name || person.username}</h1>
            <p className="public-username">@{person.username}</p>
          </div>
        </div>
      </section>

      <section className="public-profile-grid">
        <article className="profile-box public-profile-card">
          <span className="profile-label">À propos</span>
          <p className="public-bio">{person.bio || "Cette personne n’a pas encore écrit de présentation."}</p>

          <div className="public-details">
            {person.pronouns && <div><span>Pronoms</span><strong>{person.pronouns}</strong></div>}
            {person.identity && <div><span>Identité</span><strong>{person.identity}</strong></div>}
            {person.age !== null && <div><span>Âge</span><strong>{person.age} ans</strong></div>}
            {person.location && <div><span>Région</span><strong>{person.location}</strong></div>}
            {person.orientation && <div><span>Orientation</span><strong>{person.orientation}</strong></div>}
            {person.looking_for && <div><span>Recherche</span><strong>{person.looking_for}</strong></div>}
          </div>
        </article>

        <aside className="profile-box public-profile-card">
          <span className="profile-label">Centres d’intérêt</span>
          {person.interests?.length ? (
            <div className="interest-list">
              {person.interests.map((interest) => <span className="interest-tag" key={interest}>{interest}</span>)}
            </div>
          ) : (
            <p className="public-muted">Aucun centre d’intérêt renseigné.</p>
          )}
          <div className="profile-presence">
            <span className={person.dating_enabled ? "presence-dot active" : "presence-dot"} />
            {person.dating_enabled ? "Profil ouvert aux rencontres" : "Rencontres désactivées"}
          </div>
        </aside>
      </section>
    </main>
  );
}
