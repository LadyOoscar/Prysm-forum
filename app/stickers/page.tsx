import Link from "next/link";
import StickerCreator from "../components/sticker-creator";

export default function StickersPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link href="/forum">Forum</Link>
          <Link href="/messages">Messages</Link>
          <Link className="active" href="/stickers">Stickers</Link>
          <Link href="/profil">Profil</Link>
        </nav>
      </header>
      <section className="page-head compact">
        <Link className="back" href="/forum">← Forum</Link>
        <p className="eyebrow">Création communautaire</p>
        <h1>Créer un <span>sticker</span></h1>
        <p className="lead">Crée un sticker visible par toute la communauté. Ajoute des tags pour que les autres puissent le retrouver dans le sélecteur de messages.</p>
      </section>
      <StickerCreator />
    </main>
  );
}
