import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

export const revalidate = 15;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabase();
  const { data: category } = await supabase.from("forum_categories").select("id, slug, name, description").eq("slug", slug).maybeSingle();
  if (!category) notFound();

  const { data: topics, error } = await supabase
    .from("forum_topics")
    .select("id, title, pinned, locked, created_at, updated_at, profiles:author_id(username, display_name, reputation, is_admin, is_moderator)")
    .eq("category_id", category.id)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  const topicIds = (topics ?? []).map((topic) => topic.id);
  const { data: stats } = topicIds.length
    ? await supabase.from("forum_topic_stats").select("topic_id, post_count, vote_count, vote_score, last_post_at").in("topic_id", topicIds)
    : { data: [] };

  const statsByTopic = new Map((stats ?? []).map((stat) => [stat.topic_id, stat]));

  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link className="active" href="/forum">Forum</Link><Link href="/rencontres">Rencontres</Link><Link href="/messages">Messages</Link><Link href="/profil">Profil</Link></nav></header>
    <section className="page-head compact"><Link className="back" href="/forum">← Toutes les sections</Link><p className="eyebrow">Section</p><h1>{category.name}</h1><p className="lead">{category.description}</p></section>
    {error ? <div className="notice error">Impossible de charger les sujets.</div> : (topics ?? []).length === 0 ? <div className="empty"><div className="empty-symbol">◇</div><h2>La section est encore silencieuse.</h2><p>Le premier sujet pourra bientôt ouvrir la conversation.</p><Link className="button primary" href={"/forum/"+slug+"/new-topic"}>Nouveau sujet</Link></div> : <><div className="section-actions"><Link className="button primary" href={"/forum/"+slug+"/new-topic"}>+ Nouveau sujet</Link></div><section className="topic-list">{(topics ?? []).map((topic) => {
      const profile = Array.isArray(topic.profiles) ? topic.profiles[0] : topic.profiles;
      const stat = statsByTopic.get(topic.id);
      const postCount = stat?.post_count ?? 1;
      const voteCount = stat?.vote_count ?? 0;
      const activity = postCount >= 10 ? "Très discuté" : postCount >= 5 ? "Actif" : "Nouveau";
      return <Link className="topic-row" href={"/topic/"+topic.id} key={topic.id}>
        <div className="topic-icon">{topic.pinned ? "★" : topic.locked ? "▣" : "◇"}</div>
        <div className="topic-main">
          <h2>{topic.title}</h2>
          <p>par {profile?.is_admin ? <span className="role-name role-admin">{profile?.display_name || profile?.username || "membre"}</span> : profile?.is_moderator ? <span className="role-name role-moderator">{profile?.display_name || profile?.username || "membre"}</span> : (profile?.display_name || profile?.username || "membre")} · {new Date(topic.updated_at).toLocaleDateString("fr-FR")}</p>
          <small className="topic-reputation">{activity} · {postCount} message{postCount > 1 ? "s" : ""} · {voteCount} vote{voteCount > 1 ? "s" : ""} · {profile?.reputation ?? 0} réputation</small>
        </div>
        <span className="arrow">→</span>
      </Link>;
    })}</section></>}
  </main>;
}
