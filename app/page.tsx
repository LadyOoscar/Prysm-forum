import Link from "next/link";

const sections = [
  { title: "Discussions générales", text: "Parler, débattre, partager et faire vivre la communauté.", href: "/forum/general" },
  { title: "Culture & passions", text: "Jeux, musique, lecture, cinéma et tout ce qui mérite une discussion.", href: "/forum/culture" },
  { title: "Entraide & quotidien", text: "Questions, conseils et coups de main entre membres.", href: "/forum/entraide" },
  { title: "Rencontres", text: "Faire connaissance sans transformer PRYSM en catalogue de profils.", href: "/forum/rencontres" }
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link className="active" href="/">Accueil</Link>
          <Link href="/forum">Forum</Link>
          <Link href="/forum/rencontres">Rencontres</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/#profil">Profil</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">PRYSM · forum social</p>
          <h1>Le forum d’abord.<br /><span>Les rencontres ensuite.</span></h1>
          <p className="lead">Un espace communautaire où les conversations comptent autant que les profils. Le socle est maintenant relié à Supabase et prêt à accueillir les premiers échanges.</p>
          <div className="actions">
            <Link className="button primary" href="/forum">Entrer sur le forum</Link>
            <Link className="button" href="/forum/rencontres">Découvrir les rencontres</Link>
          </div>
        </div>
        <aside className="prism">
          <div className="prism-core" />
          <p>communauté<br />sécurité<br />rencontres</p>
        </aside>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Le cœur de PRYSM</p>
            <h2>Les conversations avant les algorithmes.</h2>
          </div>
          <span className="status">FORUM 0.2</span>
        </div>
        <div className="cards">
          {sections.map((section) => (
            <Link className="card" href={section.href} key={section.title}>
              <span>Section</span>
              <h3>{section.title}</h3>
              <p>{section.text}</p>
              <strong>Ouvrir →</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="feature">
        <div>
          <p className="eyebrow">Fondation</p>
          <h2>Catégories, sujets et messages sont maintenant branchés sur la base.</h2>
        </div>
        <p>La prochaine couche sera l&apos;authentification, puis la création de sujets et de réponses. Ensuite viendront profils, réactions, modération et les Rencontres.</p>
      </section>

      <footer>PRYSM · Forum social · Fondation 0.2</footer>
    </main>
  );
}
