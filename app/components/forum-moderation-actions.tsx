"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

export default function ForumModerationActions({
  topicId,
  postId,
  locked,
  pinned,
}: {
  topicId?: string;
  postId?: string;
  locked?: boolean;
  pinned?: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const [role, setRole] = useState<{ moderator: boolean; admin: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
      if (data) setRole({ moderator: Boolean(data.is_moderator), admin: Boolean(data.is_admin) });
    }
    void load();
  }, []);

  if (!role?.moderator) return null;

  async function updateTopic(field: "locked" | "pinned", value: boolean) {
    if (!topicId) return;
    setBusy(true);
    const { error } = await supabase.from("forum_topics").update({ [field]: value }).eq("id", topicId);
    if (!error) window.location.reload();
    setBusy(false);
  }

  async function deletePost() {
    if (!postId || !window.confirm("Supprimer définitivement ce message ?")) return;
    setBusy(true);
    const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
    if (!error) window.location.reload();
    setBusy(false);
  }

  async function deleteTopic() {
    if (!topicId || !window.confirm("Supprimer définitivement cette discussion et ses messages ?")) return;
    setBusy(true);
    const { error } = await supabase.from("forum_topics").delete().eq("id", topicId);
    if (!error) window.location.href = "/forum";
    setBusy(false);
  }

  return (
    <div className="moderation-inline-actions">
      {topicId && (
        <>
          <button className="button" type="button" disabled={busy} onClick={() => void updateTopic("locked", !locked)}>
            {locked ? "Déverrouiller" : "Verrouiller"}
          </button>
          <button className="button" type="button" disabled={busy} onClick={() => void updateTopic("pinned", !pinned)}>
            {pinned ? "Désépingler" : "Épingler"}
          </button>
          {role.admin && (
            <button className="button danger" type="button" disabled={busy} onClick={() => void deleteTopic()}>
              Supprimer le sujet
            </button>
          )}
        </>
      )}
      {postId && (
        <button className="button danger" type="button" disabled={busy} onClick={() => void deletePost()}>
          Supprimer
        </button>
      )}
    </div>
  );
}
