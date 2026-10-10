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
import RichPostBody from "./rich-post-body";
import QuoteReplyButton from "./quote-reply-button";
import { ForumVoice } from "./forum-voice";
import { getBadgeFrameStyle } from "../../../lib/badge-style";

export const revalidate = 10;

type ForumPost = any;

function ForumPostCard({ post, childrenByParent, postsById, badgesByProfile, topicLocked, depth = 0 }: {
  post: ForumPost;
  childrenByParent: Map<string, ForumPost[]>;
  postsById: Map<string, ForumPost>;
  badgesByProfile: Map<string, any[]>;
  topicLocked: boolean;
  depth?: number;
}) {
  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const profileHref = "/membre/" + (profile?.username || "");
  const children = childrenByParent.get(post.id) ?? [];
  const parent = post.parent_post_id ? postsById.get(post.parent_post_id) : null;
  const parentProfile = parent ? (Array.isArray(parent.profiles) ? parent.profiles[0] : parent.profiles) : null;
  const rawBody = typeof post.body === "string" ? post.body : "";
  const legacyQuoteMatch = rawBody.match(/^(?:(?:> ?.*)(?:\n|$))+\s*\n?/);
  const legacyQuote = legacyQuoteMatch?.[0]?.trim();
  const visibleBody = legacyQuote ? rawBody.slice(legacyQuoteMatch[0].length).trim() : rawBody;
  return (
    <div className="post-thread-node" style={depth ? { marginLeft: `clamp(0px, ${Math.min(depth, 4) * 1.25}rem, 5rem)`, borderLeft: "2px solid var(--line)", paddingLeft: "clamp(.5rem, 2vw, 1rem)", marginTop: ".85rem" } : undefined}>
      <article className="post" id={`post-${post.id}`}>
        <aside className="post-author">
          <Link href={profileHref}>
            <div className="avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt={"Avatar de " + (profile.display_name || profile.username || "membre")} /> : (profile?.display_name || profile?.username || "?").slice(0, 1).toUpperCase()}</div>
            <span className={profile?.is_admin ? "role-name role-admin" : profile?.is_moderator ? "role-name role-moderator" : "role-name"}>{profile?.display_name || profile?.username || "Membre"}</span>
          </Link>
          <Link className="member-handle" href={profileHref}>@{profile?.username || "membre"}</Link>
          <span className="member-reputation"><strong>{profile?.reputation ?? 0}</strong> réputation · {getReputationTitle(profile?.reputation ?? 0)}</span>
          <div className="member-badges">{(badgesByProfile.get(post.author_id) ?? []).map((badge: any) => <span className={badge?.tone === "negative" ? "profile-badge negative" : "profile-badge"} key={badge?.name} title={`${badge?.name || "Badge"}${badge?.description ? " · " + badge.description : ""}`} aria-label={badge?.name || "Badge"} style={getBadgeFrameStyle(badge)}>{badge?.icon?.startsWith("http")?<img className="badge-mark" src={badge.icon} alt="" />:<span className="badge-mark-emoji" aria-hidden="true">{badge?.icon||"🏷️"}</span>}</span>)}</div>
        </aside>
        <div className="post-body">
          <time>{new Date(post.created_at).toLocaleString("fr-FR")}</time>
          {parent && <aside className="post-quoted-context"><span className="post-quoted-label">↪ En réponse à {parentProfile?.display_name || parentProfile?.username || "un membre"}</span><p>{typeof parent.body === "string" && parent.body.startsWith("voice:") ? "Message vocal" : (parent.body || "").slice(0, 220) + ((parent.body || "").length > 220 ? "…" : "")}</p></aside>}
          {legacyQuote && <aside className="post-quoted-context legacy-quote"><span className="post-quoted-label">Citation</span><p>{legacyQuote.split("\n").map((line: string) => line.replace(/^> ?/, "")).join("\n")}</p></aside>}
          {typeof post.body === "string" && post.body.startsWith("voice:") ? <ForumVoice path={post.body.slice(6).split("|durationMs=")[0]} durationMs={Number(post.body.split("|durationMs=")[1]) || undefined} /> : visibleBody ? <RichPostBody text={visibleBody} /> : null}
          <Votes postId={post.id} />
          <Reactions postId={post.id} />
          <ReportButton postId={post.id} />
          {!topicLocked && <QuoteReplyButton postId={post.id} body={post.body} author={profile?.display_name || profile?.username || "Membre"} />}
          <ForumModerationActions postId={post.id} />
        </div>
      </article>
      {children.length > 0 && <div className="post-thread-children">{children.map(child => <ForumPostCard key={child.id} post={child} childrenByParent={childrenByParent} postsById={postsById} badgesByProfile={badgesByProfile} topicLocked={topicLocked} depth={depth + 1} />)}</div>}
    </div>
  );
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();
  const { data: topic } = await supabase.from("forum_topics").select("id, title, locked, pinned, category_id, forum_categories:category_id(slug, name)").eq("id", id).maybeSingle();
  if (!topic) notFound();
  const { data: posts, error } = await supabase.from("forum_posts").select("id, body, created_at, author_id, parent_post_id, profiles:author_id(username, display_name, avatar_url, reputation, is_admin, is_moderator)").eq("topic_id", id).order("created_at", { ascending: true });
  const { data: poll } = await supabase.from("forum_polls").select("id").eq("topic_id", id).maybeSingle();
  const authorIds = [...new Set((posts ?? []).map((post: any) => post.author_id).filter(Boolean))];
  const { data: badgeRows } = authorIds.length ? await supabase.from("profile_badges").select("profile_id, badge_id, badges:badge_id(name, icon, tone, description, background_color, image_zoom, image_position_x, image_position_y, border_color, border_width, glow_intensity)").in("profile_id", authorIds) : { data: [] };
  const badgesByProfile = new Map<string, any[]>();
  for (const row of badgeRows ?? []) { const list = badgesByProfile.get(row.profile_id) ?? []; list.push(row.badges); badgesByProfile.set(row.profile_id, list); }
  const childrenByParent = new Map<string, ForumPost[]>();
  for (const post of posts ?? []) {
    if (post.parent_post_id) {
      const children = childrenByParent.get(post.parent_post_id) ?? [];
      children.push(post);
      childrenByParent.set(post.parent_post_id, children);
    }
  }
  const postsById = new Map<string, ForumPost>((posts ?? []).map((post: ForumPost) => [post.id, post]));
  const category = Array.isArray(topic.forum_categories) ? topic.forum_categories[0] : topic.forum_categories;
  const rootPosts = (posts ?? []).filter((post: any) => !post.parent_post_id);

  return (
    <main className="shell">
      <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link className="active" href="/forum">Forum</Link><Link href="/recherche">Recherche</Link><Link href="/profil">Profil</Link></nav></header>
      <section className="page-head compact"><Link className="back" href={"/forum/" + (category?.slug || "")}>← {category?.name || "Section"}</Link><p className="eyebrow">Discussion</p><h1>{topic.title}</h1><div className="section-actions"><FollowTopic topicId={topic.id} /><ForumModerationActions topicId={topic.id} locked={topic.locked} pinned={topic.pinned} /></div></section>
      {error ? (
        <div className="notice error">Impossible de charger cette discussion.</div>
      ) : (
        <>
          {poll?.id && <Poll pollId={poll.id} />}
          <section className="post-list">
            {rootPosts.map((post: any) => <ForumPostCard key={post.id} post={post} childrenByParent={childrenByParent} postsById={postsById} badgesByProfile={badgesByProfile} topicLocked={topic.locked} />)}
          </section>
          <ReplyBox topicId={topic.id} locked={topic.locked} />
        </>
      )}
    </main>
  );
}
