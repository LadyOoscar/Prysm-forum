"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Badge = { id: string; slug: string; name: string; description: string; icon: string; tone: string };
type Award = { profile_id: string; badge_id: string; reason: string; awarded_at: string; badges: Badge | null };

export default function BadgeManager() {
  const supabase = createSupabaseBrowser();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);

  async function loadBadges() {
    const { data } = await supabase.from("badges").select("id, slug, name, description, icon, tone").order("tone").order("name");
    setBadges((data ?? []) as Badge[]);
  }

  async function loadTarget() {
    setMessage("");
    const clean = username.trim();
    if (!clean) return;
    const { data: profile, error } = await supabase.from("profiles").select("id, username").eq("username", clean).maybeSingle();
    if (error || !profile) {
      setTargetId(null);
      setAwards([]);
      setMessage("Membre introuvable.");
      return;
    }
    setTargetId(profile.id);
    const { data } = await supabase.from("profile_badges").select("profile_id, badge_id, reason, awarded_at, badges:badge_id(id, slug, name, description, icon, tone)").eq("profile_id", profile.id).order("awarded_at", { ascending: false });
    setAwards((data ?? []) as unknown as Award[]);
  }

  useEffect(() => { void loadBadges(); }, []);

  async function award() {
    if (!targetId || !selected) return;
    setBusy(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Session modérateur introuvable."); setBusy(false); return; }
    const { error } = await supabase.from("profile_badges").insert({ profile_id: targetId, badge_id: selected, awarded_by: user.id, reason: reason.trim() });
    if (error) setMessage(error.code === "23505" ? "Ce membre possède déjà ce badge." : "Impossible d'attribuer le badge.");
    else { setReason(""); setMessage("Badge attribué."); await loadTarget(); }
    setBusy(false);
  }

  async function remove(badgeId: string) {
    if (!targetId) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("profile_badges").delete().eq("profile_id", targetId).eq("badge_id", badgeId);
    if (error) setMessage("Impossible de retirer le badge.");
    else { setMessage("Badge retiré."); await loadTarget(); }
    setBusy(false);
  }

  return <section className="badge-manager">
    <div className="section-heading"><div><p className="eyebrow">Distinctions</p><h2>Badges manuels</h2></div><span className="status">MODÉRATION</span></div>
    <p className="badge-manager-intro">Les badges sont attribués uniquement par la modération. Les badges négatifs servent à signaler un comportement communautaire identifié.</p>
    <div className="badge-manager-form">
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nom d'utilisateur" onKeyDown={(e) => { if (e.key === "Enter") void loadTarget(); }} />
      <button className="button" type="button" onClick={() => void loadTarget()}>Charger</button>
    </div>
    {targetId && <div className="badge-manager-controls">
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Choisir un badge</option>
        {badges.map((badge) => <option key={badge.id} value={badge.id}>{badge.icon} {badge.name}</option>)}
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Motif interne (optionnel)" />
      <button className="button primary" type="button" disabled={busy || !selected} onClick={() => void award()}>Attribuer</button>
    </div>}
    {message && <p className="badge-manager-message">{message}</p>}
    {targetId && <div className="badge-manager-awards">{awards.length ? awards.map((award) => <div className={"badge-admin-row " + (award.badges?.tone === "negative" ? "negative" : "")} key={award.badge_id}><span>{award.badges?.icon} <strong>{award.badges?.name}</strong></span><button type="button" disabled={busy} onClick={() => void remove(award.badge_id)}>Retirer</button></div>) : <p className="badge-manager-empty">Aucun badge attribué.</p>}</div>}
  </section>;
}
