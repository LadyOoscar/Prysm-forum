"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Target = { id: string; username: string; display_name: string };

const durations = [
  { label: "1 heure", hours: 1 },
  { label: "24 heures", hours: 24 },
  { label: "7 jours", hours: 24 * 7 },
  { label: "Permanent", hours: null },
];

export default function ModerationSanction() {
  const supabase = createSupabaseBrowser();
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [role, setRole] = useState<{ moderator: boolean; admin: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function searchMembers() {
    setMessage("");
    const value = query.trim();
    if (value.length < 2) {
      setTargets([]);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
    if (!me?.is_moderator) return;
    setRole({ moderator: Boolean(me.is_moderator), admin: Boolean(me.is_admin) });

    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name")
      .or("username.ilike.%"+value+"%,display_name.ilike.%"+value+"%")
      .limit(8);
    setTargets((data ?? []) as Target[]);
  }

  async function ban(target: Target, hours: number | null) {
    if (!role?.moderator) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === target.id) return;
    setBusy(true);
    setMessage("");
    const expiresAt = hours === null ? null : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("user_sanctions").insert({
      user_id: target.id,
      actor_id: user.id,
      type: "forum_ban",
      community_id: null,
      reason: "Bannissement appliqué par la modération.",
      expires_at: expiresAt,
    });
    if (error) {
      setMessage("Impossible d'appliquer le bannissement.");
    } else {
      await supabase.from("moderation_logs").insert({
        actor_id: user.id,
        target_user_id: target.id,
        action: "forum_ban",
        reason: hours === null ? "Bannissement permanent" : "Bannissement temporaire",
        metadata: { duration_hours: hours },
      });
      setMessage("Bannissement appliqué à @"+target.username+".");
    }
    setBusy(false);
  }

  if (role && !role.moderator) return null;

  return (
    <section className="moderation-tool">
      <div className="page-head compact">
        <p className="eyebrow">Sanctions</p>
        <h2>Sanctionner un membre</h2>
        <p className="lead">Les modérateurs peuvent bannir l’accès au forum pour une durée limitée ou indéfinie.</p>
      </div>
      <div className="moderation-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void searchMembers(); }}
          placeholder="Pseudo ou nom affiché"
          aria-label="Rechercher un membre"
        />
        <button className="button" type="button" onClick={() => void searchMembers()}>Rechercher</button>
      </div>
      {targets.length > 0 && (
        <div className="moderation-list">
          {targets.map((target) => (
            <article className="moderation-card" key={target.id}>
              <div className="moderation-meta">
                <strong>{target.display_name || target.username}</strong>
                <span>@{target.username}</span>
              </div>
              <div className="moderation-actions">
                {durations.map((duration) => (
                  <button
                    className="button"
                    type="button"
                    key={duration.label}
                    disabled={busy}
                    onClick={() => void ban(target, duration.hours)}
                  >
                    {duration.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {message && <div className="notice">{message}</div>}
    </section>
  );
}
