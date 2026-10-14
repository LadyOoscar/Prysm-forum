"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Target = { id: string; username: string; display_name: string };

const durations = [
  { label: "1 heure", hours: 1 },
  { label: "24 heures", hours: 24 },
  { label: "7 jours", hours: 24 * 7 },
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
    if (!user) { setMessage("Connecte-toi pour utiliser cet outil."); return; }
    const { data: me, error: roleError } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
    if (roleError || (!me?.is_moderator && !me?.is_admin)) { setMessage("Accès réservé à la modération."); return; }
    setRole({ moderator: Boolean(me.is_moderator || me.is_admin), admin: Boolean(me.is_admin) });

    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,display_name")
      .or("username.ilike.%"+value+"%,display_name.ilike.%"+value+"%")
      .limit(8);
    if (error) { setMessage("Impossible de rechercher les membres."); return; }
    setTargets((data ?? []) as Target[]);
  }

  async function deletePermanently(target: Target) {
    if (!role?.admin || busy) return;
    const confirmation = window.prompt(
      "SUPPRESSION DÉFINITIVE\n\nLe compte de @" + target.username + " sera supprimé de PRYSM. Cette action est irréversible.\n\nPour confirmer, saisis exactement son pseudo :"
    );
    if (confirmation !== target.username) {
      if (confirmation !== null) setMessage("Confirmation incorrecte. Aucune suppression effectuée.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: target.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setMessage(result.error || "La suppression définitive a échoué.");
        return;
      }
      setTargets((current) => current.filter((item) => item.id !== target.id));
      setMessage("Le compte @" + target.username + " a été supprimé définitivement.");
    } catch {
      setMessage("Erreur réseau : impossible de confirmer la suppression du compte.");
    } finally {
      setBusy(false);
    }
  }

  async function ban(target: Target, hours: number) {
    if (!role?.moderator || busy) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === target.id) { setMessage("Tu ne peux pas te sanctionner toi-même."); return; }
    setBusy(true);
    setMessage("");
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
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
      const { error: logError } = await supabase.from("moderation_logs").insert({
        actor_id: user.id,
        target_user_id: target.id,
        action: "forum_ban",
        reason: "Bannissement temporaire",
        metadata: { duration_hours: hours },
      });
      setMessage("Bannissement de " + durations.find((item) => item.hours === hours)?.label + " appliqué à @" + target.username + "." + (logError ? " (Journalisation indisponible.)" : ""));
    }
    setBusy(false);
  }

  if (role && !role.moderator) return null;

  return (
    <section className="moderation-tool">
      <div className="page-head compact">
        <p className="eyebrow">Sanctions</p>
        <h2>Sanctionner un membre</h2>
        <p className="lead">Les modérateurs peuvent appliquer des sanctions temporaires. Seuls les administrateurs peuvent utiliser la sanction permanente pour supprimer définitivement un compte.</p>
      </div>
      <div className="moderation-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void searchMembers(); }}
          placeholder="Pseudo ou nom affiché"
          aria-label="Rechercher un membre"
        />
        <button className="button" type="button" disabled={busy} onClick={() => void searchMembers()}>Rechercher</button>
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
                {role?.admin && (
                  <button
                    className="button danger"
                    type="button"
                    disabled={busy}
                    onClick={() => void deletePermanently(target)}
                  >
                    Permanent
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {message && <div className="notice" role="status">{message}</div>}
    </section>
  );
}
