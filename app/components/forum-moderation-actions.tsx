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
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
      if (data) setRole({ moderator: Boolean(data.is_moderator), admin: Boolean(data.is_admin) });
    }
    void load();
  }, []);

  if (!role || (!role.moderator && !role.admin)) return null;

  async function updateTopic(field: "locked" | "pinned", value: boolean) {
    if (!topicId) return;
    setBusy(true);
    setActionError("");
    const { error } = await supabase.from("forum_topics").update({ [field]: value }).eq("id", topicId);
    if (error) setActionError(`Action impossible : ${error.message}`);
    else window.location.reload();
    setBusy(false);
  }

  async function deletePost() {
    if (!postId || !window.confirm("Supprimer définitivement ce message ?")) return;
    setBusy(true);
    setActionError("");
    const { data, error } = await supabase.from("forum_posts").delete().eq("id", postId).select("id");
    if (error) setActionError(`Suppression impossible : ${error.message}`);
    else if (!data?.length) setActionError("Aucun message supprimé. Vérifie tes droits de modération puis réessaie.");
    else window.location.reload();
    setBusy(false);
  }

  async function deleteTopic() {
    if (!topicId || !window.confirm("Supprimer définitivement cette discussion et ses messages ?")) return;
    setBusy(true);
    setActionError("");
    const { data, error } = await supabase.from("forum_topics").delete().eq("id", topicId).select("id");
    if (error) setActionError(`Suppression impossible : ${error.message}`);
    else if (!data?.length) setActionError("Aucune discussion supprimée. Vérifie tes droits de modération puis réessaie.");
    else window.location.href = "/forum";
    setBusy(false);
  }

  return (
    <div className="moderation-inline-actions">
      {actionError && <p className="notice error" role="alert">{actionError}</p>}
      {topicId && (
        <>
          <button className="button" type="button" disabled={busy} onClick={() => void updateTopic("locked", !locked)}>
            {locked ? "Déverrouiller" : "Verrouiller"}
          </button>
          <button className="button" type="button" disabled={busy} onClick={() => void updateTopic("pinned", !pinned)}>
            {pinned ? "Désépingler" : "Épingler"}
          </button>
          <button className="button danger" type="button" disabled={busy} onClick={() => void deleteTopic()}>
            Supprimer le sujet
          </button>
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
