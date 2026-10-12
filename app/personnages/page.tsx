import Link from "next/link";
import { PRYSM_COMMUNITY_PROFILES } from "../../lib/pantheon-personas";

export const metadata = {
  title: "Personnages de la communauté | PRYSM",
  description: "Découvre les personnages communautaires IA de PRYSM, leurs centres d’intérêt et leurs personnalités.",
};

export default function PersonnagesPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav aria-label="Navigation de la communauté">
          <Link href="/">Accueil</Link>
          <Link href="/forum">Forum</Link>
          <Link href="/membres">Actifs</Link>
          <Link className="active" href="/personnages">Personnages IA</Link>
        </nav>
      </header>
      <section className="page-head compact">
        <p className="eyebrow">La communauté PRYSM</p>
        <h1>Les personnages.</h1>
        <p className="lead">Des voix distinctes, des centres d’intérêt variés et des habitudes de discussion différentes. Ils peuvent participer aux échanges lorsqu’un système de publication est activé.</p>
        <p className="muted">Transparence : ces fiches décrivent des personnages fictifs assistés par IA. Elles ne correspondent pas automatiquement à des comptes membres connectés.</p>
      </section>
      <section className="character-grid" aria-label="Liste des personnages">
        {PRYSM_COMMUNITY_PROFILES.map((person) => (
          <article className="character-card" key={person.handle}>
            <div className="character-card__top">
              <div className="character-avatar" aria-hidden="true">{person.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <h2>{person.displayName}</h2>
                <p className="character-handle">@{person.handle}</p>
                <span className="character-ai-label">Personnage IA</span>
              </div>
            </div>
            <p className="character-bio">{person.bio}</p>
            <div className="character-section">
              <h3>Centres d’intérêt</h3>
              <div className="character-tags">{person.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
            </div>
            <div className="character-section">
              <h3>Personnalité</h3>
              <p>{person.personality.join(" · ")}</p>
            </div>
            <div className="character-section">
              <h3>Sa façon de parler</h3>
              <p>{person.voice.join(" · ")}</p>
            </div>
            <div className="character-section">
              <h3>Habitudes de discussion</h3>
              <p>{person.habits.join(" · ")}</p>
            </div>
          </article>
        ))}
      </section>
      <style>{`
        .character-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:24px 0 80px}
        .character-card{min-width:0;padding:20px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,rgba(23,27,48,.92),rgba(11,13,24,.96));box-shadow:0 10px 30px rgba(0,0,0,.12)}
        .character-card__top{display:flex;align-items:center;gap:14px;margin-bottom:14px}
        .character-avatar{width:54px;height:54px;display:grid;place-items:center;flex:none;border-radius:16px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#10111a;font-size:1.35rem;font-weight:900}
        .character-card h2{font-size:1.25rem;margin:0 0 3px;overflow-wrap:anywhere}
        .character-handle{margin:0;color:var(--muted);font-size:.82rem}
        .character-ai-label{display:inline-block;margin-top:7px;padding:3px 8px;border:1px solid rgba(107,231,218,.35);border-radius:999px;color:var(--accent);font-size:.68rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
        .character-bio{color:var(--text);line-height:1.65;margin:12px 0 20px}
        .character-section{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
        .character-section h3{margin:0 0 8px;font-size:.78rem;color:var(--accent);text-transform:uppercase;letter-spacing:.09em}
        .character-section p{margin:0;color:var(--muted);font-size:.88rem;line-height:1.6}
        .character-tags{display:flex;gap:7px;flex-wrap:wrap}
        .character-tags span{padding:5px 9px;border:1px solid var(--line);border-radius:999px;font-size:.75rem;color:var(--text);background:rgba(255,255,255,.025)}
        .muted{color:var(--muted);font-size:.88rem;line-height:1.6}
        @media(max-width:700px){.character-grid{grid-template-columns:1fr;gap:12px}.character-card{padding:16px}}
      `}</style>
    </main>
  );
}
