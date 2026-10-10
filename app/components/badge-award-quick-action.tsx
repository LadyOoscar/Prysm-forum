"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type BadgeOption = { id: string; name: string; tone: "positive" | "negative" | "neutral"; icon: string };

export default function BadgeAwardQuickAction({ profileId }: { profileId: string }) {
  const supabase = createSupabaseBrowser();
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [badgeId, setBadgeId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
      if (!profile?.is_moderator && !profile?.is_admin) return;
      const { data, error } = await supabase.from("badges").select("id,name,tone,icon").order("name");
      if (!active) return;
      if (error) { setNotice("Impossible de charger les badges."); return; }
      setAllowed(true);
      setBadges((data ?? []) as BadgeOption[]);
    }
    void init();
    return () => { active = false; };
  }, []);

  if (!allowed) return null;

  async function award() {
    if (!badgeId) { setNotice("Choisis un badge."); return; }
    setBusy(true); setNotice("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée. Reconnecte-toi.");
      const { data: existing, error: lookupError } = await supabase.from("profile_badges").select("badge_id").eq("profile_id", profileId).eq("badge_id", badgeId).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) throw new Error("Ce membre possède déjà ce badge.");
      const { error } = await supabase.from("profile_badges").insert({ profile_id: profileId, badge_id: badgeId, awarded_by: user.id, reason: reason.trim() });
      if (error) throw error;
      setNotice("Badge attribué !");
      setBadgeId(""); setReason("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Attribution impossible.");
    } finally { setBusy(false); }
  }

  return <div className="badge-quick-action" style={{ display: "inline-flex", flexDirection: "column", gap: 8, maxWidth: 320, marginTop: 8 }}>
    <button className="button" type="button" onClick={() => { setOpen(value => !value); setNotice(""); }}>{open ? "Fermer les badges" : "🏅 Attribuer un badge"}</button>
    {open && <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "rgba(10,14,35,.92)" }}>
      <label style={{ display: "grid", gap: 5, fontSize: ".82rem" }}>Badge
        <select value={badgeId} onChange={event => setBadgeId(event.target.value)}><option value="">Choisir un badge…</option>{badges.map(badge => <option key={badge.id} value={badge.id}>{badge.name}</option>)}</select>
      </label>
      <label style={{ display: "grid", gap: 5, fontSize: ".82rem" }}>Motif (facultatif)
        <input value={reason} maxLength={240} onChange={event => setReason(event.target.value)} placeholder="Pourquoi ce badge ?" />
      </label>
      <button className="button primary" type="button" disabled={busy} onClick={() => void award()}>{busy ? "Attribution…" : "Confirmer l’attribution"}</button>
      {notice && <p role="status" style={{ margin: 0, fontSize: ".82rem" }}>{notice}</p>}
    </div>}
  </div>;
}
