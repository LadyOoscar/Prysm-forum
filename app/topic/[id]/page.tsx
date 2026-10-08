import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

export const revalidate = 10;

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: topic } = await supabase
    .from("forum_topics")
    .select("id, title, locked, category_id, forum_categories:category_id(slug, name)")
    .eq("id", id)
    .maybeSingle();

  if (!topic) notFound();

  const { data: posts, error } = await supabase
    .from("forum_posts")
    .select("id, body, created_at, profiles:author_id(username, display_name, avatar_url)")
    .eq("topic_id", id)
    .order("created_at", { ascending: true });

  const category = Array.isArray(topic.forum_categories) ? topic.forum_categories[0] : topic.forum_categories;

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
        <Link className="back" href={`/forum/${category?.slug || ""}`}>← {category?.name || "Section"}</Link>
        <p className="eyebrow">Discussion</p>
        <h1>{topic.title}</h1>
      </section>

      {error ? (
        <div className="notice error">Impossible de charger cette discussion.</div>
      ) : (
        <section className="post-list">
          {(posts ?? []).map((post) => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
            return (
              <article className="post" key={post.id}>
                <aside className="post-author">
                  <div className="avatar">{(profile?.display_name || profile?.username || "?").slice(0, 1).toUpperCase()}</div>
                  <strong>{profile?.display_name || profile?.username || "Membre"}</strong>
                  <span>@{profile?.username || "membre"}</span>
                </aside>
                <div className="post-body">
                  <time>{new Date(post.created_at).toLocaleString("fr-FR")}</time>
                  <p>{post.body}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
