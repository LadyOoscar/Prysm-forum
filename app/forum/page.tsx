import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export const revalidate = 30;

export default async function ForumPage() {
  const supabase = getSupabase();
  const { data: categories, error } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description")
    .order("position", { ascending: true });

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link className="active" href="/forum">Forum</Link>
          <Link href="/#rencontres">Rencontres</Link>
          <Link href="/#messages">Messages</Link>
          <Link href="/#profil">Profil</Link>
        </nav>
      </header>

      <section className="page-head">
        <p className="eyebrow">Communauté</p>
        <h1>Le forum.</h1>
        <p className="lead">Les discussions sont le centre de gravité de PRYSM. Choisis une section et entre dans la conversation.</p>
      </section>

      {error ? (
        <div className="notice error">Impossible de charger le forum pour le moment.</div>
      ) : (
        <section className="forum-list">
          {(categories ?? []).map((category) => (
            <Link className="forum-row" href={`/forum/${category.slug}`} key={category.id}>
              <div>
                <span className="forum-kicker">Section</span>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
              </div>
              <span className="arrow">→</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
