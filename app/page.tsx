import Link from "next/link";

const sections = [
  { title: "Discussions générales", text: "Parler, débattre, partager et rencontrer la communauté.", count: "Forum" },
  { title: "Culture & passions", text: "Jeux, musique, lecture, cinéma et tout ce qui mérite une discussion.", count: "Communauté" },
  { title: "Rencontres", text: "Faire connaissance sans transformer PRYSM en catalogue de profils.", count: "Social" }
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link className="active" href="/">Accueil</Link>
          <Link href="#forum">Forum</Link>
          <Link href="#rencontres">Rencontres</Link>
          <Link href="#messages">Messages</Link>
          <Link href="#profil">Profil</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">PRYSM · nouvelle base</p>
          <h1>Le forum d’abord.<br /><span>Les rencontres ensuite.</span></h1>
          <p className="lead">
            Un espace communautaire où les conversations comptent autant que les profils.
            Cette version repart d&apos;une base propre, prête pour Supabase et Render.
          </p>
          <div className="actions">
            <a className="button primary" href="#forum">Entrer sur le forum</a>
            <a className="button" href="#rencontres">Découvrir les rencontres</a>
          </div>
        </div>
        <aside className="prism">
          <div className="prism-core" />
          <p>communauté<br />sécurité<br />rencontres</p>
        </aside>
      </section>

      <section id="forum" className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Le cœur de PRYSM</p>
            <h2>Les conversations avant les algorithmes.</h2>
          </div>
          <span className="status">BASE 0.1</span>
        </div>
        <div className="cards">
          {sections.map((section) => (
            <article className="card" key={section.title}>
              <span>{section.count}</span>
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="rencontres" className="feature">
        <div>
          <p className="eyebrow">Rencontres intégrées</p>
          <h2>Une extension sociale du forum, pas une appli de swipe.</h2>
        </div>
        <p>
          Profils, centres d&apos;intérêt, affinités, likes réciproques et messages privés
          arriveront sur cette même fondation, avec blocage et signalement intégrés dès le départ.
        </p>
      </section>

      <footer>PRYSM · Forum social · Fondation propre 0.1</footer>
    </main>
  );
}