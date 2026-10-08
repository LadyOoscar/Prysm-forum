"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

type Vote = -1 | 1;

export default function Votes({ postId }: { postId: string }) {
  const [score, setScore] = useState(0);
  const [mine, setMine] = useState<Vote | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.from("forum_votes").select("user_id,value").eq("post_id", postId);
      if (!active) return;
      const rows = data ?? [];
      setScore(rows.reduce((sum, row) => sum + Number(row.value), 0));
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      const own = userId ? rows.find((row) => row.user_id === userId) : null;
      setMine(own ? (Number(own.value) as Vote) : null);
    }
    void load();
    return () => { active = false; };
  }, [postId]);

  async function vote(value: Vote) {
    if (busy) return;
    setBusy(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      window.location.href = "/auth";
      return;
    }

    if (mine === value) {
      const { error } = await supabase.from("forum_votes").delete().eq("post_id", postId).eq("user_id", userId);
      if (!error) {
        setScore((current) => current - value);
        setMine(null);
      }
    } else if (mine === null) {
      const { error } = await supabase.from("forum_votes").insert({ post_id: postId, user_id: userId, value });
      if (!error) {
        setScore((current) => current + value);
        setMine(value);
      } else if (error.message.includes("SELF_VOTE")) {
        alert("Tu ne peux pas voter pour ton propre message.");
      }
    } else {
      const { error } = await supabase.from("forum_votes").update({ value, updated_at: new Date().toISOString() }).eq("post_id", postId).eq("user_id", userId);
      if (!error) {
        setScore((current) => current + value - mine);
        setMine(value);
      }
    }
    setBusy(false);
  }

  return (
    <div className="votes" aria-label="Votes de réputation">
      <button className={mine === 1 ? "vote vote-up selected" : "vote vote-up"} type="button" onClick={() => vote(1)} disabled={busy} aria-pressed={mine === 1} title="Vote positif">▲</button>
      <strong className={score > 0 ? "vote-score positive" : score < 0 ? "vote-score negative" : "vote-score"}>{score > 0 ? "+" : ""}{score}</strong>
      <button className={mine === -1 ? "vote vote-down selected" : "vote vote-down"} type="button" onClick={() => vote(-1)} disabled={busy} aria-pressed={mine === -1} title="Vote négatif">▼</button>
      <small>réputation</small>
    </div>
  );
}
