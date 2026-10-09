"use client";
import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";
import MentionInput from "../../components/mention-input";
import StickerPicker from "../../components/sticker-picker";
import ForumVoiceRecorder from "./forum-voice";

function friendlyError(message: string) {
  if (message.includes("ANTI_SPAM_DUPLICATE")) return "Cette réponse ressemble trop à un message récent. Modifie-la avant de réessayer.";
  if (message.includes("rate limit") || message.includes("check_rate_limit")) return "Tu publies trop rapidement. Attends un peu avant de réessayer.";
  if (message.includes("forum_posts_parent_post_id_fkey") || message.includes("same topic")) return "Le message auquel tu réponds n’est plus disponible. Choisis un autre message.";
  return message;
}

export default function ReplyBox({ topicId, locked }: { topicId: string; locked: boolean }) {
  const supabase = createSupabaseBrowser();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotedAuthor, setQuotedAuthor] = useState("");
  const [quotedBody, setQuotedBody] = useState("");
  const [parentPostId, setParentPostId] = useState<string | null>(null);

  useEffect(() => {
    const handleQuote = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string; body: string; author: string }>).detail;
      if (!detail?.body || !detail?.postId) return;
      const attribution = detail.author || "membre";
      setParentPostId(detail.postId);
      setQuotedAuthor(attribution);
      setQuotedBody(detail.body);
    };
    window.addEventListener("prysm:quote-post", handleQuote);
    return () => window.removeEventListener("prysm:quote-post", handleQuote);
  }, []);

  if (locked) return <div className="notice">Cette discussion est verrouillée.</div>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    const { error } = await supabase.from("forum_posts").insert({
      topic_id: topicId,
      author_id: user.id,
      body,
      parent_post_id: parentPostId,
    });
    if (error) setError(friendlyError(error.message));
    else window.location.reload();
    setLoading(false);
  }

  return (
    <form className="reply-box" onSubmit={submit}>
      <h2>{parentPostId ? "Répondre à un message" : "Répondre"}</h2>
      {parentPostId && <aside className="quote-preview">
        <div className="quote-preview-head">
          <strong>En réponse à {quotedAuthor}</strong>
          <button type="button" className="button ghost" onClick={() => { setParentPostId(null); setQuotedBody(""); setQuotedAuthor(""); }}>Répondre au sujet entier</button>
        </div>
        <p>{quotedBody.length > 240 ? quotedBody.slice(0, 240).trimEnd() + "…" : quotedBody}</p>
        <span className="muted">Ta réponse sera affichée juste sous ce message. Le texte cité reste séparé de ta réponse.</span>
      </aside>}
      <MentionInput required maxLength={10000} placeholder="Écris ta réponse… Utilise @pseudo pour mentionner quelqu’un." value={body} onChange={setBody} />
      <StickerPicker onPick={(token) => setBody(current => current ? current + " " + token : token)} />
      <ForumVoiceRecorder topicId={topicId} parentPostId={parentPostId} disabled={loading} onSent={() => window.location.reload()} />
      {error && <div className="notice error">{error}</div>}
      <button className="button primary" disabled={loading}>{loading ? "Envoi…" : "Publier la réponse"}</button>
    </form>
  );
}
