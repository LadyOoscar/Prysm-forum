import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export const revalidate = 60;

type HotTopic = {
  id: string;
  title: string;
  categoryName: string;
  controversy: number;
  votes: number;
  postCount: number;
  updatedAt: string;
  intensity: "HOT" | "TENDANCE" | "ACTIF";
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
      .limit(40),
  ]);

  let hotTopics: HotTopic[] = [];

  if (topics?.length) {
    const topicIds = topics.map((topic) => topic.id);
    const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
    const { data: stats } = await supabase
      .from("forum_topic_stats")
      .select("topic_id, post_count, vote_count, up_votes, down_votes, last_post_at")
      .in("topic_id", topicIds);

    const statsByTopic = new Map((stats ?? []).map((stat) => [stat.topic_id, stat]));
    const now = Date.now();

    hotTopics = topics
      .map((topic) => {
        const stat = statsByTopic.get(topic.id);
        const up = stat?.up_votes ?? 0;
        const down = stat?.down_votes ?? 0;
        const votes = up + down;
        const postCount = stat?.post_count ?? 0;
        const balance = votes ? 1 - Math.abs(up - down) / votes : 0;
        const controversy = Math.round(votes * balance);
        const lastActivity = new Date(stat?.last_post_at ?? topic.updated_at).getTime();
        const hoursSinceActivity = Math.max(0, (now - lastActivity) / 36e5);
        const intensity = controversy >= 5 || (votes >= 3 && hoursSinceActivity <= 24)
          ? "HOT"
          : postCount >= 6 || votes >= 2
            ? "TENDANCE"
            : "ACTIF";

        return {
          id: topic.id,
          title: topic.title,
          categoryName: categoryById.get(topic.category_id)?.name ?? "Forum",
          controversy,
          votes,
          postCount,
          updatedAt: topic.updated_at,
          intensity,
        };
      })
      .filter((topic) => topic.postCount > 1)
      .sort((a, b) => b.controversy - a.controversy || b.postCount - a.postCount || b.votes - a.votes)
      .slice(0, 6);
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
          <p className="hot-intro">Les discussions qui font le plus réagir en ce moment. Activité, réponses et désaccords alimentent le classement.</p>
          <div className="hot-list">
            {hotTopics.map((topic, index) => (
              <Link className="hot-row" href={`/topic/${topic.id}`} key={topic.id}>
                <div className="hot-rank">#{index + 1}</div>
                <div className="hot-main">
                  <span>{topic.categoryName} · {topic.intensity}</span>
                  <h3>{topic.title}</h3>
                  <small>{topic.postCount} message{topic.postCount > 1 ? "s" : ""} · {topic.votes} vote{topic.votes > 1 ? "s" : ""} · mis à jour le {new Date(topic.updatedAt).toLocaleDateString("fr-FR")}</small>
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
