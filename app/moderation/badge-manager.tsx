"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Badge = { id: string; slug: string; name: string; description: string; icon: string; tone: "positive" | "negative" | "neutral"; background_color: string; image_zoom: number; image_position_x: number; image_position_y: number; border_color: string; border_width: number; glow_intensity: number };
type Award = { profile_id: string; badge_id: string; reason: string; awarded_at: string; badges: Badge | null };
type BadgeDraft = { slug: string; name: string; description: string; icon: string; tone: Badge["tone"]; background_color: string; image_zoom: number; image_position_x: number; image_position_y: number; border_color: string; border_width: number; glow_intensity: number };
const emptyDraft: BadgeDraft = { slug: "", name: "", description: "", icon: "🏷️", tone: "neutral", background_color: "#171b43", image_zoom: 100, image_position_x: 50, image_position_y: 50, border_color: "#45efff", border_width: 2, glow_intensity: 25 };
const badgeColors = ["#171b43", "#182d4a", "#164e63", "#14532d", "#365314", "#713f12", "#7c2d12", "#7f1d1d", "#831843", "#581c87", "#3730a3", "#334155", "#f1f5f9", "#fef3c7"];
function BadgeMark({ icon, label }: { icon: string; label: string }) {
  return icon.startsWith("https://") || icon.startsWith("http://")
    ? <img className="badge-mark" src={icon} alt={label} />
    : <span className="badge-mark-emoji" aria-hidden="true">{icon || "🏷️"}</span>;
}
const toneLabels: Record<Badge["tone"], string> = { positive: "Positif", negative: "Négatif", neutral: "Neutre" };

function badgeStyle(badge: Pick<BadgeDraft, "background_color" | "image_zoom" | "image_position_x" | "image_position_y" | "border_color" | "border_width" | "glow_intensity">): React.CSSProperties {
  return { backgroundColor: badge.border_color, boxShadow: badge.glow_intensity ? `0 0 ${(badge.glow_intensity / 7).toFixed(1)}px ${badge.border_color}80` : "none", "--badge-fill": badge.background_color, "--badge-border-width": `${badge.border_width}px`, "--badge-zoom": badge.image_zoom / 100, "--badge-position-x": `${badge.image_position_x}%`, "--badge-position-y": `${badge.image_position_y}%` } as React.CSSProperties;
}

function makeSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export default function BadgeManager() {
  const supabase = createSupabaseBrowser();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingPng, setUploadingPng] = useState(false);
  const [pngStatus, setPngStatus] = useState("");
  const [message, setMessage] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BadgeDraft>(emptyDraft);
  const [filter, setFilter] = useState<"all" | Badge["tone"]>("all");
  const [badgeSearch, setBadgeSearch] = useState("");

  async function loadBadges() {
    const { data, error } = await supabase.from("badges").select("id, slug, name, description, icon, tone, background_color, image_zoom, image_position_x, image_position_y, border_color, border_width, glow_intensity").order("tone").order("name");
    if (error) { setMessage("Impossible de charger les badges."); return; }
    setBadges((data ?? []) as Badge[]);
  }

  async function loadTarget() {
    setMessage("");
    const clean = username.trim().replace(/^@/, "");
    if (!clean) { setMessage("Saisis un nom d'utilisateur."); return; }
    const { data: profile, error } = await supabase.from("profiles").select("id, username").eq("username", clean).maybeSingle();
    if (error || !profile) {
      setTargetId(null); setAwards([]); setMessage("Membre introuvable."); return;
    }
    setTargetId(profile.id);
    const { data, error: awardsError } = await supabase.from("profile_badges")
      .select("profile_id, badge_id, reason, awarded_at, badges:badge_id(id, slug, name, description, icon, tone, background_color, image_zoom, image_position_x, image_position_y, border_color, border_width, glow_intensity)")
      .eq("profile_id", profile.id).order("awarded_at", { ascending: false });
    if (awardsError) { setMessage("Le membre est chargé, mais ses badges n'ont pas pu être lus."); return; }
    setAwards((data ?? []) as unknown as Award[]);
  }

  useEffect(() => { void loadBadges(); }, []);

  function startCreate() {
    setEditingId(null); setDraft(emptyDraft); setIsEditorOpen(true); setMessage("");
  }

  function startEdit(badge: Badge) {
    setEditingId(badge.id);
    setDraft({ slug: badge.slug, name: badge.name, description: badge.description ?? "", icon: badge.icon || "🏷️", tone: badge.tone, background_color: badge.background_color || "#171b43", image_zoom: badge.image_zoom ?? 100, image_position_x: badge.image_position_x ?? 50, image_position_y: badge.image_position_y ?? 50, border_color: badge.border_color || "#45efff", border_width: badge.border_width ?? 2, glow_intensity: badge.glow_intensity ?? 25 });
    setIsEditorOpen(true); setMessage("");
  }

  async function uploadBadgePng(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const isPng = file.type === "image/png" || (file.type === "" && file.name.toLowerCase().endsWith(".png"));
    if (!isPng) { setPngStatus("Choisis une image PNG. Les photos JPEG/WebP ne sont pas acceptées pour les badges."); return; }
    if (file.size > 5 * 1024 * 1024) { setPngStatus("Le PNG doit peser 5 Mo maximum."); return; }
    setUploadingPng(true); setPngStatus("Envoi du PNG vers le stockage…"); setMessage("");
    const base = makeSlug(draft.slug || draft.name || "badge") || "badge";
    const path = base + "/" + Date.now() + ".png";
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const uploadResult = await Promise.race([
        supabase.storage.from("prysm-badges").upload(path, file, { contentType: "image/png", upsert: false, cacheControl: "31536000" }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("TIMEOUT_UPLOAD")), 30000);
        }),
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      const { error } = uploadResult;
      if (error) {
        const details = error.message || "Erreur inconnue";
        setPngStatus(details.includes("Payload too large") || details.toLowerCase().includes("size")
          ? "Le PNG dépasse la limite de 5 Mo."
          : details.toLowerCase().includes("row-level security") || details.toLowerCase().includes("permission")
            ? "Import refusé : ton compte doit avoir les droits modo/admin."
            : "Échec de l’import PNG : " + details);
        return;
      }
      const { data } = supabase.storage.from("prysm-badges").getPublicUrl(path);
      setDraft(current => ({ ...current, icon: data.publicUrl }));
      setPngStatus("PNG importé avec succès. Enregistre le badge pour conserver ce visuel.");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      setPngStatus(details === "TIMEOUT_UPLOAD"
        ? "L’envoi n’a pas confirmé sa réponse après 30 secondes. Vérifie ta connexion puis réessaie."
        : "L’import a échoué : " + details);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setUploadingPng(false);
    }
  }

  async function saveBadge() {
    const name = draft.name.trim();
    const slug = makeSlug(draft.slug || name);
    if (!name || !slug || !draft.icon.trim()) { setMessage("Renseigne au minimum le nom, l'identifiant et l'icône."); return; }
    setBusy(true); setMessage("");
    const values = { slug, name, description: draft.description.trim(), icon: draft.icon.trim(), tone: draft.tone, background_color: /^#[0-9a-fA-F]{6}$/.test(draft.background_color) ? draft.background_color : "#171b43", image_zoom: Math.min(200, Math.max(100, draft.image_zoom)), image_position_x: Math.min(100, Math.max(0, draft.image_position_x)), image_position_y: Math.min(100, Math.max(0, draft.image_position_y)), border_color: /^#[0-9a-fA-F]{6}$/.test(draft.border_color) ? draft.border_color : "#45efff", border_width: Math.min(8, Math.max(0, draft.border_width)), glow_intensity: Math.min(100, Math.max(0, draft.glow_intensity)) };
    const query = editingId
      ? supabase.from("badges").update(values).eq("id", editingId)
      : supabase.from("badges").insert(values);
    const { error } = await query;
    if (error) {
      setMessage(error.code === "23505" ? "Cet identifiant existe déjà. Choisis-en un autre." : "Enregistrement impossible. Vérifie les droits de modération.");
      setBusy(false); return;
    }
    setMessage(editingId ? "Badge modifié." : "Badge créé.");
    setIsEditorOpen(false); setEditingId(null); setDraft(emptyDraft);
    await loadBadges(); setBusy(false);
  }

  async function deleteBadge(badge: Badge) {
    if (!window.confirm("Supprimer le badge « " + badge.name + " » ? Les badges déjà attribués peuvent empêcher sa suppression.")) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("badges").delete().eq("id", badge.id);
    if (error) {
      setMessage("Suppression impossible : ce badge est peut-être déjà attribué à un membre.");
      setBusy(false); return;
    }
    setBadges((current) => current.filter((item) => item.id !== badge.id));
    if (selected === badge.id) setSelected("");
    setMessage("Badge supprimé."); setBusy(false);
  }

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

  const visibleBadges = useMemo(() => badges.filter((badge) => {
    const matchesTone = filter === "all" || badge.tone === filter;
    const query = badgeSearch.trim().toLocaleLowerCase("fr");
    return matchesTone && [badge.name, badge.slug, badge.description].some((value) => value.toLocaleLowerCase("fr").includes(query));
  }), [badges, filter, badgeSearch]);

  return <section className="badge-manager">
    <div className="section-heading"><div><p className="eyebrow">Distinctions</p><h2>Atelier de badges</h2></div><span className="status">MODO / ADMIN</span></div>
    <p className="badge-manager-intro">Crée, personnalise et attribue les badges de PRYSM. Toute attribution reste manuelle : aucun badge n'est distribué automatiquement.</p>

    <div className="badge-workshop-head">
      <div><h3>Bibliothèque</h3><p>{badges.length} badge{badges.length > 1 ? "s" : ""} disponible{badges.length > 1 ? "s" : ""}</p></div>
      <button className="button primary" type="button" onClick={startCreate}>＋ Créer un badge</button>
    </div>

    {isEditorOpen && <div className="badge-editor">
      <div className="section-heading"><div><p className="eyebrow">{editingId ? "Personnalisation" : "Nouveau badge"}</p><h3>{editingId ? "Modifier le badge" : "Créer un badge"}</h3></div><button className="badge-plain-action" type="button" onClick={() => setIsEditorOpen(false)}>Fermer ✕</button></div>
      <div className="badge-editor-preview">
        <span className={"badge-preview-chip tone-" + draft.tone} style={badgeStyle(draft)}><BadgeMark icon={draft.icon} label={draft.name || "Badge"} /></span><strong className="badge-preview-name">{draft.name.trim() || "Nom du badge"}</strong>
        <small>Aperçu</small>
      </div>
      <div className="badge-editor-grid">
        <label>Nom du badge<input value={draft.name} maxLength={40} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: d.slug ? d.slug : makeSlug(e.target.value) }))} placeholder="Ex. Pilier de la communauté" /></label>
        <label>Identifiant unique<input value={draft.slug} maxLength={48} onChange={(e) => setDraft((d) => ({ ...d, slug: makeSlug(e.target.value) }))} placeholder="pilier-communaute" /><small>Généré à partir du nom, modifiable.</small></label>
        <label>Icône / emoji<input value={draft.icon.startsWith("http://") || draft.icon.startsWith("https://") ? "" : draft.icon} maxLength={16} onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))} placeholder="🏷️" /><small>PNG transparent accepté, jusqu’à 5 Mo.</small><input type="file" accept="image/png" onChange={(e) => void uploadBadgePng(e)} disabled={uploadingPng} aria-label="Importer une icône PNG" />{uploadingPng && <small role="status">Import du PNG en cours… (30 s maximum)</small>}{pngStatus && <small role="status">{pngStatus}</small>}{(draft.icon.startsWith("http://") || draft.icon.startsWith("https://")) && <button className="badge-plain-action" type="button" onClick={() => setDraft((d) => ({ ...d, icon: "🏷️" }))}>Retirer le PNG</button>}</label>
        <label>Fond du badge<input type="color" value={draft.background_color} onChange={(e) => setDraft((d) => ({ ...d, background_color: e.target.value }))} /><div className="badge-color-palette">{badgeColors.map(color => <button key={color} type="button" className={draft.background_color.toLowerCase() === color.toLowerCase() ? "selected" : ""} style={{ backgroundColor: color }} aria-label={"Fond " + color} title={color} onClick={() => setDraft(d => ({ ...d, background_color: color }))} />)}</div><small>Le fond choisi s’applique à tous les affichages du badge.</small></label>
        <label>Catégorie<select value={draft.tone} onChange={(e) => setDraft((d) => ({ ...d, tone: e.target.value as Badge["tone"] }))}><option value="positive">Positif</option><option value="neutral">Neutre / communautaire</option><option value="negative">Négatif</option></select></label>
        <label>Couleur du contour<input type="color" value={draft.border_color} onChange={(e) => setDraft((d) => ({ ...d, border_color: e.target.value }))} /><small>Contour hexagonal propre à ce badge.</small></label>
        <label>Épaisseur du contour ({draft.border_width}px)<input type="range" min="0" max="8" value={draft.border_width} onChange={(e) => setDraft((d) => ({ ...d, border_width: Number(e.target.value) }))} /></label>
        <label>Lueur néon ({draft.glow_intensity}%)<input type="range" min="0" max="100" step="5" value={draft.glow_intensity} onChange={(e) => setDraft((d) => ({ ...d, glow_intensity: Number(e.target.value) }))} /></label>
        <label>Zoom image ({draft.image_zoom}%)<input type="range" min="100" max="200" step="5" value={draft.image_zoom} onChange={(e) => setDraft((d) => ({ ...d, image_zoom: Number(e.target.value) }))} /></label>
        <label>Position horizontale ({draft.image_position_x}%)<input type="range" min="0" max="100" value={draft.image_position_x} onChange={(e) => setDraft((d) => ({ ...d, image_position_x: Number(e.target.value) }))} /></label>
        <label>Position verticale ({draft.image_position_y}%)<input type="range" min="0" max="100" value={draft.image_position_y} onChange={(e) => setDraft((d) => ({ ...d, image_position_y: Number(e.target.value) }))} /></label>
        <label className="badge-editor-wide">Description<textarea value={draft.description} maxLength={240} rows={3} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Explique ce que représente ce badge…" /></label>
      </div>
      <div className="badge-editor-actions"><button className="button primary" type="button" disabled={busy} onClick={() => void saveBadge()}>{busy ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Créer le badge"}</button><button className="button" type="button" disabled={busy} onClick={() => setIsEditorOpen(false)}>Annuler</button></div>
    </div>}

    <div className="badge-library-tools">
      <input value={badgeSearch} onChange={(e) => setBadgeSearch(e.target.value)} placeholder="Rechercher un badge…" aria-label="Rechercher un badge" />
      <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filtrer les badges"><option value="all">Toutes les catégories</option><option value="positive">Positifs</option><option value="neutral">Neutres</option><option value="negative">Négatifs</option></select>
    </div>
    <div className="badge-library">
      {visibleBadges.map((badge) => <article className={"badge-library-card tone-" + badge.tone} key={badge.id}>
        <div className="badge-library-card-top"><span className="badge-preview-chip" style={badgeStyle(badge)} title={badge.name}><BadgeMark icon={badge.icon} label={badge.name} /></span><strong className="badge-library-name">{badge.name}</strong><span className={"badge-tone-label tone-" + badge.tone}>{toneLabels[badge.tone]}</span></div>
        <p>{badge.description || "Aucune description."}</p><small className="badge-slug">/{badge.slug}</small>
        <div className="badge-library-actions"><button type="button" disabled={busy} onClick={() => startEdit(badge)}>Modifier</button><button type="button" className="danger-text" disabled={busy} onClick={() => void deleteBadge(badge)}>Supprimer</button></div>
      </article>)}
      {!visibleBadges.length && <p className="badge-manager-empty">Aucun badge ne correspond à cette recherche.</p>}
    </div>

    <div className="badge-award-panel">
      <div className="section-heading"><div><p className="eyebrow">Distribution manuelle</p><h3>Attribuer à un membre</h3></div></div>
      <div className="badge-manager-form">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nom d'utilisateur" aria-label="Nom d'utilisateur" onKeyDown={(e) => { if (e.key === "Enter") void loadTarget(); }} />
        <button className="button" type="button" disabled={busy} onClick={() => void loadTarget()}>Charger</button>
      </div>
      {targetId && <div className="badge-manager-controls">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Badge à attribuer"><option value="">Choisir un badge</option>{badges.map((badge) => <option key={badge.id} value={badge.id}>{badge.icon} {badge.name}</option>)}</select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Motif interne (optionnel)" aria-label="Motif interne" />
        <button className="button primary" type="button" disabled={busy || !selected} onClick={() => void award()}>Attribuer</button>
      </div>}
      {targetId && <div className="badge-manager-awards">{awards.length ? awards.map((item) => <div className={"badge-admin-row " + (item.badges?.tone === "negative" ? "negative" : "")} key={item.badge_id}><span>{item.badges?.icon?.startsWith("http") ? <img className="badge-mark" src={item.badges.icon} alt="" /> : item.badges?.icon} <strong>{item.badges?.name}</strong></span><button type="button" disabled={busy} onClick={() => void remove(item.badge_id)}>Retirer</button></div>) : <p className="badge-manager-empty">Aucun badge attribué à ce membre.</p>}</div>}
    </div>
    {message && <p className="badge-manager-message" role="status">{message}</p>}
  </section>;
}
