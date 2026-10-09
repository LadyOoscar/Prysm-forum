import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";
import ReplyBox from "./reply-box";
import Reactions from "./reactions";
import Votes from "./votes";
import ReportButton from "./report-button";
import Poll from "../poll";
import FollowTopic from "../follow-topic";
import ForumModerationActions from "../../components/forum-moderation-actions";
import { getReputationTitle } from "../../../lib/reputation";
import { StickerText } from "../../components/sticker-picker";
import QuoteReplyButton from "./quote-reply-button";

export const revalidate = 10;

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();
  const { data: topic } = await supabase.from("forum_topics").select("id, title, locked, pinned, category_id, forum_categories:category_id(slug, name)").eq("id", id).maybeSingle();
  if (!topic) notFound();
  const { data: posts, error } = await supabase.from("forum_posts").select("id, body, created_at, author_id, profiles:author_id(username, display_name, avatar_url, reputation, is_admin, is_moderator)").eq("topic_id", id).order("created_at", { ascending: true });
  const { data: poll } = await supabase.from("forum_polls").select("id").eq("topic_id", id).maybeSingle();
  const authorIds = [...new Set((posts ?? []).map((post:any) => post.author_id).filter(Boolean))];
  const { data: badgeRows } = authorIds.length ? await supabase.from("profile_badges").select("profile_id, badge_id, badges:badge_id(name, icon, tone)").in("profile_id", authorIds) : { data: [] };
  const badgesByProfile = new Map<string, any[]>();
  for (const row of badgeRows ?? []) { const list = badgesByProfile.get(row.profile_id) ?? []; list.push(row.badges); badgesByProfile.set(row.profile_id, list); }
  const category = Array.isArray(topic.forum_categories) ? topic.forum_categories[0] : topic.forum_categories;

  return (
    <main className="shell">
      <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link className="active" href="/forum">Forum</Link><Link href="/recherche">Recherche</Link><Link href="/profil">Profil</Link></nav></header>
      <section className="page-head compact"><Link className="back" href={"/forum/"+(category?.slug || "")}>← {category?.name || "Section"}</Link><p className="eyebrow">Discussion</p><h1>{topic.title}</h1><div className="section-actions"><FollowTopic topicId={topic.id} /><ForumModerationActions topicId={topic.id} locked={topic.locked} pinned={topic.pinned} /></div></section>
      {error ? (
        <div className="notice error">Impossible de charger cette discussion.</div>
      ) : (
        <>
          {poll?.id && <Poll pollId={poll.id} />}
          <section className="post-list">
            {(posts ?? []).map((post) => {
              const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
              const profileHref = "/membre/" + (profile?.username || "");
              return (
                <article className="post" key={post.id}>
                  <aside className="post-author">
                    <Link href={profileHref}>
                      <div className="avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt={"Avatar de " + (profile.display_name || profile.username || "membre")} /> : (profile?.display_name || profile?.username || "?").slice(0, 1).toUpperCase()}</div>
                      <span className={profile?.is_admin ? "role-name role-admin" : profile?.is_moderator ? "role-name role-moderator" : "role-name"}>{profile?.display_name || profile?.username || "Membre"}</span>
                    </Link>
                    <Link className="member-handle" href={profileHref}>@{profile?.username || "membre"}</Link><span className="member-reputation"><strong>{profile?.reputation ?? 0}</strong> réputation · {getReputationTitle(profile?.reputation ?? 0)}</span><div className="member-badges">{(badgesByProfile.get(post.author_id) ?? []).map((badge:any)=><span className={badge?.tone === "negative" ? "profile-badge negative" : "profile-badge"} key={badge?.name}>{badge?.icon} {badge?.name}</span>)}</div>
                  </aside>
                  <div className="post-body">
                    <time>{new Date(post.created_at).toLocaleString("fr-FR")}</time>
                    <p><StickerText text={post.body} /></p>
                    <Votes postId={post.id} />
                    <Reactions postId={post.id} />
                    <ReportButton postId={post.id} />
                    {!topic.locked && <QuoteReplyButton body={post.body} author={profile?.display_name || profile?.username || "Membre"} />
                    <ForumModerationActions postId={post.id} />
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
