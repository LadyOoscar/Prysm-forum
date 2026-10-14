"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

const reactions = [
  { key: "like", label: "👍", name: "J’aime" },
  { key: "love", label: "❤️", name: "J’adore" },
  { key: "laugh", label: "😂", name: "Drôle" },
  { key: "support", label: "✨", name: "Soutien" },
  { key: "disagree", label: "👎", name: "Pas d’accord" },
  { key: "cuck", label: "🫵", name: "Cuck" },
  { key: "cringe", label: "🙄", name: "Cringe" },
  { key: "absurd", label: "🤦", name: "Absurde" },
] as const;

type ReactionKey = (typeof reactions)[number]["key"];

export default function Reactions({ postId }: { postId: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("forum_reactions")
        .select("user_id, reaction")
        .eq("post_id", postId);
      if (!active) return;
      if (error) {
        setMessage("Impossible de charger les réactions. Réessaie dans un instant.");
        return;
      }
      const next: Record<string, number> = {};
      for (const row of data ?? []) next[row.reaction] = (next[row.reaction] ?? 0) + 1;
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) {
        setMessage("Impossible de vérifier ta session. Recharge la page puis réessaie.");
        return;
      }
      const userId = sessionData.session?.user.id;
      setCounts(next);
      setMine(userId ? (data ?? []).filter((row) => row.user_id === userId).map((row) => row.reaction) : []);
      setMessage(null);
    }
    void load();
    return () => { active = false; };
  }, [postId, supabase]);

  async function toggle(reaction: ReactionKey) {
    if (busy) return;
    setBusy(reaction);
    setMessage(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setMessage("Ta session n’a pas pu être vérifiée. Recharge la page puis réessaie.");
        return;
      }
      const userId = sessionData.session?.user.id;
      if (!userId) {
        window.location.href = "/auth";
        return;
      }

      if (mine.includes(reaction)) {
        const { error } = await supabase
          .from("forum_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
          .eq("reaction", reaction);
        if (error) {
          setMessage("La réaction n’a pas été retirée. Vérifie ta connexion puis réessaie.");
          return;
        }
        setMine((current) => current.filter((item) => item !== reaction));
        setCounts((current) => ({ ...current, [reaction]: Math.max(0, (current[reaction] ?? 1) - 1) }));
      } else {
        const previous = mine[0];
        if (previous) {
          const { error: removeError } = await supabase
            .from("forum_reactions")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId);
          if (removeError) {
            setMessage("Impossible de remplacer ta réaction. Réessaie dans un instant.");
            return;
          }
        }
        const { error } = await supabase
          .from("forum_reactions")
          .insert({ post_id: postId, user_id: userId, reaction });
        if (error) {
          if (previous) {
            setMine([]);
            setCounts((current) => ({ ...current, [previous]: Math.max(0, (current[previous] ?? 1) - 1) }));
          }
          setMessage("PRYSM n’a pas pu enregistrer cette réaction. Les droits de la base ou la connexion peuvent être en cause.");
          return;
        }
        setMine([reaction]);
        setCounts((current) => ({
          ...current,
          ...(previous ? { [previous]: Math.max(0, (current[previous] ?? 1) - 1) } : {}),
          [reaction]: (current[reaction] ?? 0) + 1,
        }));
      }
    } catch {
      setMessage("Une erreur inattendue a bloqué la réaction. Recharge la page puis réessaie.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="reactions" aria-label="Réactions">
      <small className="reaction-hint">Une réaction par message • positives ou piquantes, à vous de choisir</small>
      {reactions.map((reaction) => {
        const selected = mine.includes(reaction.key);
        return (
          <button
            className={selected ? "reaction selected" : "reaction"}
            key={reaction.key}
            type="button"
            onClick={() => void toggle(reaction.key)}
            disabled={busy !== null}
            title={reaction.name}
            aria-label={`${reaction.name}, ${counts[reaction.key] ?? 0} réactions`}
            aria-pressed={selected}
          >
            <span>{reaction.label}</span>
            <strong>{counts[reaction.key] ?? 0}</strong>
          </button>
        );
      })}
      {message && <small className="reaction-error" role="status" aria-live="polite">{message}</small>}
    </div>
  );
}
