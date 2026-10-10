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
import BadgeMedal from "../../components/badge-medal";
import BadgeAwardQuickAction from "../../components/badge-award-quick-action";

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
  const authorBadges = badgesByProfile.get(post.author_id) ?? [];
  const visibleAuthorBadges = authorBadges.slice(0, 2);
  const hiddenAuthorBadgeCount = Math.max(0, authorBadges.length - visibleAuthorBadges.length);
  const children = childrenByParent.get(post.id) ?? [];
  const parent = post.parent_post_id ? postsById.get(post.parent_post_id) : null;
  const parentProfile = parent ? (Array.isArray(parent.profiles) ? parent.profiles[0] : parent.profiles) : null;
  const rawBody = typeof post.body === "string" ? post.body : "";
  const legacyQuoteMatch = rawBody.match(/^(?:(?:> ?.*)(?:\n|$))+\s*\n?/);
  const legacyQuote = legacyQuoteMatch?.[0]?.trim();
  const visibleBody = legacyQuote ? rawBody.slice(legacyQuoteMatch[0].length).trim() : rawBody;
  return (
    <div className={"post-thread-node" + (depth ? ` is-nested thread-depth-${Math.min(depth, 4)}` : "")} style={depth ? { borderLeft: "2px solid var(--line)", paddingLeft: "clamp(.35rem, 1vw, .7rem)", marginTop: ".65rem" } : undefined}>
      <article className="post" id={`post-${post.id}`}>
        <aside className="post-author">
          <div className="post-author-identity">
            <Link className="post-author-avatar-link" href={profileHref} aria-label={"Profil de " + (profile?.display_name || "Membre")}>
              <div className="avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt={"Avatar de " + (profile.display_name || "membre")} /> : (profile?.display_name || "M").slice(0, 1).toUpperCase()}</div>
            </Link>
            {authorBadges.length > 0 && <div className="member-badges post-author-badges">{visibleAuthorBadges.map((badge: any, index: number) => <BadgeMedal key={badge?.id || badge?.name || index} badge={badge} size="small" />)}{hiddenAuthorBadgeCount > 0 && <span className="post-author-badge-overflow" title={authorBadges.slice(2).map((badge: any) => badge.name).join(", ")}>+{hiddenAuthorBadgeCount}</span>}</div>}
          </div>
          <Link className={"post-author-display-name " + (profile?.is_admin ? "role-name role-admin" : profile?.is_moderator ? "role-name role-moderator" : "role-name")} href={profileHref}>{profile?.display_name?.trim() || "Membre"}</Link>
          <span className="member-reputation"><strong>{profile?.reputation ?? 0}</strong> réputation · {getReputationTitle(profile?.reputation ?? 0)}</span>
          {profile?.id && <BadgeAwardQuickAction profileId={profile.id} />}
        </aside>
        <div className="post-body">
          <time>{new Date(post.created_at).toLocaleString("fr-FR")}</time>
          {parent && <aside className="post-quoted-context"><span className="post-quoted-label">↪ En réponse à {parentProfile?.display_name || parentProfile?.username || "un membre"}</span><p>{typeof parent.body === "string" && parent.body.startsWith("voice:") ? "Message vocal" : (parent.body || "").slice(0, 220) + ((parent.body || "").length > 220 ? "…" : "")}</p></aside>}
          {legacyQuote && <aside className="post-quoted-context legacy-quote"><span className="post-quoted-label">Citation</span><p>{legacyQuote.split("\n").map((line: string) => line.replace(/^> ?/, "")).join("\n")}</p></aside>}
          {typeof post.body === "string" && post.body.startsWith("voice:") ? <ForumVoice path={post.body.slice(6).split("|durationMs=")[0]} durationMs={Number(post.body.split("|durationMs=")[1]) || undefined} /> : visibleBody ? <RichPostBody text={visibleBody} /> : null}
          <Votes postId={post.id} />
          <div className="post-interactions">
            <Reactions postId={post.id} />
            <div className="post-action-buttons">
              <ReportButton postId={post.id} />
              {!topicLocked && <QuoteReplyButton postId={post.id} body={post.body} author={profile?.display_name || profile?.username || "Membre"} />}
              <ForumModerationActions postId={post.id} />
            </div>
          </div>
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
  const { data: badgeRows } = authorIds.length ? await supabase.from("profile_badges").select("profile_id,badge_id,badges:badge_id(name,icon,tone,description,background_color,image_zoom,image_position_x,image_position_y,border_color,border_width,glow_intensity)").in("profile_id", authorIds) : { data: [] };
  const badgesByProfile = new Map<string, any[]>();
  for (const row of badgeRows ?? []) { const badge = Array.isArray(row.badges) ? row.badges[0] : row.badges; if (!badge) continue; const list = badgesByProfile.get(row.profile_id) ?? []; list.push({ ...badge, id: row.badge_id }); badgesByProfile.set(row.profile_id, list); }
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
