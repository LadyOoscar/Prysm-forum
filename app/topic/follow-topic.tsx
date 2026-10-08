"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

export default function FollowTopic({ topicId }: { topicId: string }) {
  const supabase = createSupabaseBrowser();
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (active) setReady(true); return; }
      const { data } = await supabase.from("forum_topic_follows").select("id").eq("topic_id", topicId).eq("user_id", auth.user.id).maybeSingle();
      if (active) { setFollowing(Boolean(data)); setReady(true); }
    })();
    return () => { active = false; };
  }, [topicId]);

  async function toggle() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = "/auth"; return; }
    if (following) {
      await supabase.from("forum_topic_follows").delete().eq("topic_id", topicId).eq("user_id", auth.user.id);
      setFollowing(false);
    } else {
      const { error } = await supabase.from("forum_topic_follows").insert({ topic_id: topicId, user_id: auth.user.id });
      if (!error) setFollowing(true);
    }
    setBusy(false);
  }

  if (!ready) return null;
  return <button className="button secondary" type="button" onClick={toggle} disabled={busy}>{following ? "🔔 Sujet suivi" : "☆ Suivre le sujet"}</button>;
}
