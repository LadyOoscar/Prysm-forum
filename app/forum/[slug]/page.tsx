import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

export const revalidate = 15;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabase();

  const { data: category } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!category) notFound();

  const { data: topics, error } = await supabase
    .from("forum_topics")
    .select("id, title, pinned, locked, created_at, updated_at, profiles:author_id(username, display_name)")
    .eq("category_id", category.id)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

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

      <section className="page-head compact">
        <Link className="back" href="/forum">← Toutes les sections</Link>
        <p className="eyebrow">Section</p>
        <h1>{category.name}</h1>
        <p className="lead">{category.description}</p>
      </section>

      {error ? (
        <div className="notice error">Impossible de charger les sujets.</div>
      ) : (topics ?? []).length === 0 ? (
        <div className="empty">
          <div className="empty-symbol">◇</div>
          <h2>La section est encore silencieuse.</h2>
          <p>Le premier sujet pourra bientôt ouvrir la conversation.</p>
          <Link className="button primary" href={`/forum/${slug}/new-topic`}>Nouveau sujet</Link>
        </div>
      ) : (
        <div className="section-actions"><Link className="button primary" href={`/forum/${slug}/new-topic`}>+ Nouveau sujet</Link></div>\n        <section className="topic-list">
          {(topics ?? []).map((topic) => {
            const profile = Array.isArray(topic.profiles) ? topic.profiles[0] : topic.profiles;
            return (
              <Link className="topic-row" href={`/topic/${topic.id}`} key={topic.id}>
                <div className="topic-icon">{topic.pinned ? "★" : topic.locked ? "▣" : "◇"}</div>
                <div className="topic-main">
                  <h2>{topic.title}</h2>
                  <p>par {profile?.display_name || profile?.username || "membre"} · {new Date(topic.updated_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className="arrow">→</span>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
