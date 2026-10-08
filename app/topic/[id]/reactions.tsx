"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

const reactions = [
  { key: "like", label: "👍", name: "J’aime" },
  { key: "love", label: "❤️", name: "J’adore" },
  { key: "laugh", label: "😂", name: "Drôle" },
  { key: "support", label: "✨", name: "Soutien" },
] as const;

type ReactionKey = (typeof reactions)[number]["key"];

export default function Reactions({ postId }: { postId: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.from("forum_reactions").select("user_id, reaction").eq("post_id", postId);
      if (!active) return;
      const next: Record<string, number> = {};
      for (const row of data ?? []) next[row.reaction] = (next[row.reaction] ?? 0) + 1;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      setCounts(next);
      setMine(userId ? (data ?? []).filter((row) => row.user_id === userId).map((row) => row.reaction) : []);
    }
    load();
    return () => { active = false; };
  }, [postId]);

  async function toggle(reaction: ReactionKey) {
    if (busy) return;
    setBusy(reaction);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      window.location.href = "/auth";
      return;
    }
    if (mine.includes(reaction)) {
      const { error } = await supabase.from("forum_reactions").delete().eq("post_id", postId).eq("user_id", userId).eq("reaction", reaction);
      if (!error) {
        setMine((current) => current.filter((item) => item !== reaction));
        setCounts((current) => ({ ...current, [reaction]: Math.max(0, (current[reaction] ?? 1) - 1) }));
      }
    } else {
      const { error } = await supabase.from("forum_reactions").insert({ post_id: postId, user_id: userId, reaction });
      if (!error) {
        setMine((current) => [...current, reaction]);
        setCounts((current) => ({ ...current, [reaction]: (current[reaction] ?? 0) + 1 }));
      }
    }
    setBusy(null);
  }

  return <div className="reactions" aria-label="Réactions">{reactions.map((reaction) => {
    const selected = mine.includes(reaction.key);
    return <button className={selected ? "reaction selected" : "reaction"} key={reaction.key} type="button" onClick={() => toggle(reaction.key)} disabled={busy !== null} title={reaction.name} aria-pressed={selected}><span>{reaction.label}</span><strong>{counts[reaction.key] ?? 0}</strong></button>;
  })}</div>;
}
