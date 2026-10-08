import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";
import ReplyBox from "./reply-box";
import Reactions from "./reactions";
import Votes from "./votes";
import ReportButton from "./report-button";
import { getReputationTitle } from "../../../lib/reputation";

export const revalidate = 10;

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();
  const { data: topic } = await supabase.from("forum_topics").select("id, title, locked, category_id, forum_categories:category_id(slug, name)").eq("id", id).maybeSingle();
  if (!topic) notFound();
  const { data: posts, error } = await supabase.from("forum_posts").select("id, body, created_at, author_id, profiles:author_id(username, display_name, avatar_url, reputation)").eq("topic_id", id).order("created_at", { ascending: true });
  const authorIds = [...new Set((posts ?? []).map((post:any) => post.author_id).filter(Boolean))];
  const { data: badgeRows } = authorIds.length ? await supabase.from("profile_badges").select("profile_id, badge_id, badges:badge_id(name, icon, tone)").in("profile_id", authorIds) : { data: [] };
  const badgesByProfile = new Map<string, any[]>();
  for (const row of badgeRows ?? []) { const list = badgesByProfile.get(row.profile_id) ?? []; list.push(row.badges); badgesByProfile.set(row.profile_id, list); }
  const category = Array.isArray(topic.forum_categories) ? topic.forum_categories[0] : topic.forum_categories;

  return (
    <main className="shell">
      <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link className="active" href="/forum">Forum</Link><Link href="/recherche">Recherche</Link><Link href="/profil">Profil</Link></nav></header>
      <section className="page-head compact"><Link className="back" href={"/forum/"+(category?.slug || "")}>← {category?.name || "Section"}</Link><p className="eyebrow">Discussion</p><h1>{topic.title}</h1></section>
      {error ? (
        <div className="notice error">Impossible de charger cette discussion.</div>
      ) : (
        <>
          <section className="post-list">
            {(posts ?? []).map((post) => {
              const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
              const profileHref = "/membre/" + (profile?.username || "");
              return (
                <article className="post" key={post.id}>
                  <aside className="post-author">
                    <Link href={profileHref}>
                      <div className="avatar">{(profile?.display_name || profile?.username || "?").slice(0, 1).toUpperCase()}</div>
                      <strong>{profile?.display_name || profile?.username || "Membre"}</strong>
                    </Link>
                    <Link className="member-handle" href={profileHref}>@{profile?.username || "membre"}</Link><span className="member-reputation"><strong>{profile?.reputation ?? 0}</strong> réputation · {getReputationTitle(profile?.reputation ?? 0)}</span><div className="member-badges">{(badgesByProfile.get(post.author_id) ?? []).map((badge:any)=><span className={badge?.tone === "negative" ? "profile-badge negative" : "profile-badge"} key={badge?.name}>{badge?.icon} {badge?.name}</span>)}</div>
                  </aside>
                  <div className="post-body">
                    <time>{new Date(post.created_at).toLocaleString("fr-FR")}</time>
                    <p>{post.body}</p>
                    <Votes postId={post.id} />
                    <Reactions postId={post.id} />
                    <ReportButton postId={post.id} />
                  </div>
                </article>
              );
            })}
          </section>
          <ReplyBox topicId={topic.id} locked={topic.locked} />
        </>
      )}
    </main>
  );
}
