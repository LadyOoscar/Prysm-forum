"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REACTIONS = ["❤️","👍","😂","😮","😢"];

type Props = { topicId?: string; postId?: string };

export default function ReactionBar({ topicId, postId }: Props) {
  const supabase = createClient();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const filter = topicId ? { topic_id: topicId } : { post_id: postId };
    const { data } = await supabase.from("reactions").select("reaction,user_id").match(filter);
    const next: Record<string, number> = {};
    const mineNext: string[] = [];
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    for (const row of data ?? []) {
      next[row.reaction] = (next[row.reaction] ?? 0) + 1;
      if (userId && row.user_id === userId) mineNext.push(row.reaction);
    }
    setCounts(next);
    setMine(mineNext);
  }

  useEffect(() => { load(); }, [topicId, postId]);

  async function toggle(reaction: string) {
    if (busy) return;
    setBusy(true);
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) { setBusy(false); return; }

    if (mine.includes(reaction)) {
      if (topicId) {
        await supabase.from("reactions").delete().match({ user_id: userId, topic_id: topicId, reaction });
      } else if (postId) {
        await supabase.from("reactions").delete().match({ user_id: userId, post_id: postId, reaction });
      }
    } else {
      if (topicId) {
        await supabase.from("reactions").insert({ user_id: userId, topic_id: topicId, reaction });
      } else if (postId) {
        await supabase.from("reactions").insert({ user_id: userId, post_id: postId, reaction } as any);
      }
    }

    await load();
    setBusy(false);
  }

  return <div className="reactionBar" aria-label="Réactions">
    {REACTIONS.map(reaction => <button key={reaction} type="button" className={mine.includes(reaction) ? "reaction active" : "reaction"} onClick={() => toggle(reaction)} disabled={busy}>
      <span>{reaction}</span>{counts[reaction] ? <small>{counts[reaction]}</small> : null}
    </button>)}
  </div>;
}
