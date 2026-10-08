import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export const revalidate = 30;

type HotTopic = {
  id: string;
  title: string;
  categoryName: string;
  controversy: number;
  votes: number;
  updatedAt: string;
};

export default async function ForumPage() {
  const supabase = getSupabase();

  const [{ data: categories, error }, { data: topics }] = await Promise.all([
    supabase
      .from("forum_categories")
      .select("id, slug, name, description")
      .order("position", { ascending: true }),
    supabase
      .from("forum_topics")
      .select("id, title, category_id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  let hotTopics: HotTopic[] = [];

  if (topics?.length) {
    const topicIds = topics.map((topic) => topic.id);
    const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));

    const { data: posts } = await supabase
      .from("forum_posts")
      .select("id, topic_id")
      .in("topic_id", topicIds);

    const postIds = (posts ?? []).map((post) => post.id);
    const postTopic = new Map((posts ?? []).map((post) => [post.id, post.topic_id]));

    if (postIds.length) {
      const { data: votes } = await supabase
        .from("forum_votes")
        .select("post_id, value")
        .in("post_id", postIds);

      const stats = new Map<string, { up: number; down: number }>();

      for (const vote of votes ?? []) {
        const topicId = postTopic.get(vote.post_id);
        if (!topicId) continue;
        const current = stats.get(topicId) ?? { up: 0, down: 0 };
        if (vote.value === 1) current.up += 1;
        else current.down += 1;
        stats.set(topicId, current);
      }

      hotTopics = topics
        .map((topic) => {
          const stat = stats.get(topic.id) ?? { up: 0, down: 0 };
          const total = stat.up + stat.down;
          const balance = total ? 1 - Math.abs(stat.up - stat.down) / total : 0;
          const controversy = Math.round(total * balance);
          return {
            id: topic.id,
            title: topic.title,
            categoryName: categoryById.get(topic.category_id)?.name ?? "Forum",
            controversy,
            votes: total,
            updatedAt: topic.updated_at,
          };
        })
        .filter((topic) => topic.votes > 0)
        .sort((a, b) => b.controversy - a.controversy || b.votes - a.votes)
        .slice(0, 6);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link className="active" href="/forum">Forum</Link>
          <Link href="/rencontres">Rencontres</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/profil">Profil</Link>
        </nav>
      </header>

      <section className="page-head">
        <p className="eyebrow">Communauté</p>
        <h1>Le forum.</h1>
        <p className="lead">Les discussions sont le centre de gravité de PRYSM. Choisis une section et entre dans la conversation.</p>
      </section>

      {!error && hotTopics.length > 0 && (
        <section className="hot-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">🔥 Ça chauffe</p>
              <h2>Sujets brûlants</h2>
            </div>
            <span className="status">ÇA DIVISE</span>
          </div>
          <p className="hot-intro">Les discussions qui font le plus réagir en ce moment. Les sujets où les avis s’affrontent remontent naturellement.</p>
          <div className="hot-list">
            {hotTopics.map((topic) => (
              <Link className="hot-row" href={`/topic/${topic.id}`} key={topic.id}>
                <div className="hot-rank">#{hotTopics.indexOf(topic) + 1}</div>
                <div className="hot-main">
                  <span>{topic.categoryName}</span>
                  <h3>{topic.title}</h3>
                  <small>{topic.votes} vote{topic.votes > 1 ? "s" : ""} · mis à jour le {new Date(topic.updatedAt).toLocaleDateString("fr-FR")}</small>
                </div>
                <strong className="controversy-score">{topic.controversy}<small> intensité</small></strong>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="forum-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Toutes les sections</p>
            <h2>Choisis ton terrain.</h2>
          </div>
        </div>
        {error ? (
          <div className="notice error">Impossible de charger le forum pour le moment.</div>
        ) : (
          <div className="forum-list">
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
          </div>
        )}
      </section>
    </main>
  );
}
