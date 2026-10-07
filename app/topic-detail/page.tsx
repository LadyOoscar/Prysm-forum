export default function TopicDetail() {
  return (
    <main>
      <header>
        <div className="brand">PRYSM<span>✦</span></div>
        <nav><a href="/">Forum</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav>
        <a className="profile" href="/profile">☾ <span>Mon profil</span></a>
      </header>
      <div className="topicPage">
        <a className="backButton" href="/">← Retour au forum</a>
        <h1>Discussion</h1>
        <p>La page de discussion arrive.</p>
      </div>
    </main>
  );
}