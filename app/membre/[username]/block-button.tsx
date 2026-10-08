"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

export default function BlockButton({ username }: { username: string }) {
  const supabase = createSupabaseBrowser();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
      if (!profile || profile.id === auth.user.id) return;
      setTargetId(profile.id);
      const { data } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", auth.user.id).eq("blocked_id", profile.id).maybeSingle();
      setBlocked(Boolean(data));
    }
    void load();
  }, [username]);

  async function toggle() {
    if (!targetId) return;
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = "/auth"; return; }
    if (blocked) {
      await supabase.from("user_blocks").delete().eq("blocker_id", auth.user.id).eq("blocked_id", targetId);
      setBlocked(false);
    } else {
      await supabase.from("user_blocks").insert({ blocker_id: auth.user.id, blocked_id: targetId });
      setBlocked(true);
    }
    setBusy(false);
  }

  if (!targetId) return null;
  return <button className="button" onClick={() => void toggle()} disabled={busy}>{blocked ? "Débloquer ce membre" : "Bloquer ce membre"}</button>;
}
