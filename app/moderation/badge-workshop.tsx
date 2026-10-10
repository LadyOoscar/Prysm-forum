"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import BadgeMedal, { type BadgeVisual } from "../components/badge-medal";

type Badge = BadgeVisual & {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  tone: "positive" | "negative" | "neutral";
  background_color: string;
  image_zoom: number;
  image_position_x: number;
  image_position_y: number;
  border_color: string;
  border_width: number;
  glow_intensity: number;
};
type Draft = Omit<Badge, "id">;
type AwardRow = { profile_id: string; badge_id: string; reason: string; awarded_at: string; badges: Badge | Badge[] | null };
const blank: Draft = { slug: "", name: "", description: "", icon: "🏷️", tone: "neutral", background_color: "#171b43", image_zoom: 100, image_position_x: 50, image_position_y: 50, border_color: "#45efff", border_width: 2, glow_intensity: 25 };
const colors = ["#171b43", "#182d4a", "#164e63", "#14532d", "#713f12", "#7f1d1d", "#831843", "#581c87", "#3730a3", "#334155"];

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Erreur inconnue");
}

async function prepareBadgePng(file: File): Promise<{ blob: Blob; method: string }> {
  const bitmap = await createImageBitmap(file);
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    const scan = document.createElement("canvas");
    scan.width = width;
    scan.height = height;
    const scanContext = scan.getContext("2d", { willReadFrequently: true });
    if (!scanContext) throw new Error("Impossible d’analyser cette image dans le navigateur.");
    scanContext.drawImage(bitmap, 0, 0);
    const pixels = scanContext.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    let transparentPixels = 0;
    const stride = Math.max(1, Math.floor(Math.max(width, height) / 900));
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha < 245) transparentPixels++;
        if (alpha > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    let subject: { x: number; y: number; w: number; h: number } | null = null;
    let method = "";
    const hasTransparency = transparentPixels > (width * height) / (stride * stride) * 0.005;
    if (hasTransparency && maxX >= minX && maxY >= minY) {
      subject = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      method = "marges transparentes retirées";
    } else {
      const Detector = (window as Window & { FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect(source: CanvasImageSource): Promise<Array<{ boundingBox: DOMRectReadOnly }>> } }).FaceDetector;
      if (Detector) {
        try {
          const faces = await new Detector({ fastMode: true, maxDetectedFaces: 5 }).detect(bitmap);
          const face = faces.sort((a, b) => (b.boundingBox.width * b.boundingBox.height) - (a.boundingBox.width * a.boundingBox.height))[0]?.boundingBox;
          if (face) {
            subject = { x: face.x - face.width * 0.55, y: face.y - face.height * 0.8, w: face.width * 2.1, h: face.height * 2.6 };
            method = "visage détecté automatiquement";
          }
        } catch { /* La détection de visage est expérimentale selon le navigateur. */ }
      }
    }
    if (!subject) return { blob: file, method: "cadrage centré de secours" };

    const side = Math.min(Math.max(subject.w, subject.h) * (method === "visage détecté automatiquement" ? 1.08 : 1.18), Math.max(width, height));
    const centerX = subject.x + subject.w / 2;
    const centerY = subject.y + subject.h / 2;
    const sx = Math.max(0, Math.min(width - side, centerX - side / 2));
    const sy = Math.max(0, Math.min(height - side, centerY - side / 2));
    const cropSide = Math.max(1, Math.min(side, width - sx, height - sy));
    const output = document.createElement("canvas");
    const outputSize = Math.min(1400, Math.max(256, Math.round(cropSide)));
    output.width = outputSize;
    output.height = outputSize;
    const context = output.getContext("2d");
    if (!context) return { blob: file, method: "cadrage centré de secours" };
    context.drawImage(bitmap, sx, sy, cropSide, cropSide, 0, 0, outputSize, outputSize);
    const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, "image/png"));
    return blob ? { blob, method } : { blob: file, method: "cadrage centré de secours" };
  } finally {
    bitmap.close();
  }
}

export default function BadgeWorkshop() {
  const supabase = createSupabaseBrowser();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [targetId, setTargetId] = useState("");
  const [awards, setAwards] = useState<AwardRow[]>([]);

  async function loadBadges() {
    const { data, error } = await supabase.from("badges").select("id,slug,name,description,icon,tone,background_color,image_zoom,image_position_x,image_position_y,border_color,border_width,glow_intensity").order("name");
    if (error) throw error;
    setBadges((data ?? []) as Badge[]);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setAllowed(false); return; }
      const { data: profile, error } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
      if (error || (!profile?.is_moderator && !profile?.is_admin)) { if (active) setAllowed(false); return; }
      try { await loadBadges(); if (active) setAllowed(true); }
      catch (e) { if (active) { setAllowed(true); setNotice("Chargement des badges impossible : " + messageOf(e)); } }
    }
    void init();
    return () => { active = false; };
  }, []);

  function startCreate() {
    setEditingId(null);
    setDraft({ ...blank });
    setPreviewFailed(false);
    setEditorOpen(true);
    setNotice("");
  }

  function startEdit(badge: Badge) {
    setEditingId(badge.id);
    setDraft({ slug: badge.slug, name: badge.name, description: badge.description || "", icon: badge.icon || "🏷️", tone: badge.tone, background_color: badge.background_color || blank.background_color, image_zoom: badge.image_zoom ?? 100, image_position_x: badge.image_position_x ?? 50, image_position_y: badge.image_position_y ?? 50, border_color: badge.border_color || blank.border_color, border_width: badge.border_width ?? 2, glow_intensity: badge.glow_intensity ?? 25 });
    setPreviewFailed(false);
    setEditorOpen(true);
    setNotice("");
  }

  async function uploadPng(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) { setNotice("Format refusé : sélectionne un fichier PNG."); return; }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) { setNotice("Le PNG doit peser entre 1 octet et 5 Mo."); return; }

    setUploading(true);
    setNotice("Analyse du sujet et préparation du cadrage…");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const prepared = await prepareBadgePng(file);
      if (prepared.blob.size === 0 || prepared.blob.size > 5 * 1024 * 1024) throw new Error("Le PNG après préparation dépasse la limite de 5 Mo.");
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session?.access_token) throw new Error("Session expirée. Reconnecte-toi puis réessaie.");
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!base || !key) throw new Error("Configuration du stockage absente.");
      const baseName = slugify(draft.slug || draft.name || "badge") || "badge";
      const path = baseName + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".png";
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      setNotice("Envoi du PNG au stockage…");
      const response = await fetch(base.replace(/\/$/, "") + "/storage/v1/object/prysm-badges/" + encoded, {
        method: "POST",
        headers: { apikey: key, Authorization: "Bearer " + session.access_token, "Content-Type": "image/png", "Cache-Control": "max-age=31536000", "x-upsert": "false" },
        body: prepared.blob,
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) {
        let detail = raw;
        try { const json = JSON.parse(raw) as { message?: string; error?: string; error_description?: string }; detail = json.message || json.error_description || json.error || raw; } catch {}
        throw new Error("Stockage refusé (HTTP " + response.status + ") : " + detail.slice(0, 220));
      }
      let confirmation: { Key?: string; key?: string; Id?: string } = {};
      try { confirmation = JSON.parse(raw) as typeof confirmation; } catch {}
      if (!raw || (!confirmation.Key && !confirmation.key && !confirmation.Id)) throw new Error("Réponse du stockage incomplète : le PNG n’a pas été confirmé.");
      const { data } = supabase.storage.from("prysm-badges").getPublicUrl(path);
      setDraft(current => ({ ...current, icon: data.publicUrl }));
      setPreviewFailed(false);
      setNotice("PNG reçu, " + prepared.method + ". Vérifie l’aperçu, puis enregistre le badge.");
    } catch (error) {
      setNotice(error instanceof DOMException && error.name === "AbortError" ? "Délai dépassé après 20 secondes. Envoi interrompu." : messageOf(error));
    } finally {
      window.clearTimeout(timeout);
      setUploading(false);
    }
  }

  async function saveBadge() {
    const name = draft.name.trim();
    const slug = slugify(draft.slug || name);
    if (!name || !slug || !draft.icon.trim()) { setNotice("Il faut un nom, un identifiant et une icône ou un PNG."); return; }
    setBusy(true); setNotice("");
    const values = { slug, name, description: draft.description.trim(), icon: draft.icon.trim(), tone: draft.tone, background_color: /^#[0-9a-f]{6}$/i.test(draft.background_color) ? draft.background_color : blank.background_color, image_zoom: Math.min(200, Math.max(100, draft.image_zoom)), image_position_x: Math.min(100, Math.max(0, draft.image_position_x)), image_position_y: Math.min(100, Math.max(0, draft.image_position_y)), border_color: /^#[0-9a-f]{6}$/i.test(draft.border_color) ? draft.border_color : blank.border_color, border_width: Math.min(8, Math.max(0, draft.border_width)), glow_intensity: Math.min(100, Math.max(0, draft.glow_intensity)) };
    try {
      const result = editingId ? await supabase.from("badges").update(values).eq("id", editingId).select("id").maybeSingle() : await supabase.from("badges").insert(values).select("id").single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("Aucune confirmation d’enregistrement reçue.");
      await loadBadges();
      setEditorOpen(false); setEditingId(null); setDraft({ ...blank });
      setNotice(editingId ? "Badge modifié." : "Badge créé.");
    } catch (error) { setNotice("Enregistrement impossible : " + messageOf(error)); }
    finally { setBusy(false); }
  }

  async function deleteBadge(badge: Badge) {
    if (!window.confirm("Supprimer le badge « " + badge.name + " » ? Les attributions existantes peuvent empêcher sa suppression.")) return;
    setBusy(true); setNotice("");
    try {
      const { data, error } = await supabase.from("badges").delete().eq("id", badge.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Supabase n’a confirmé aucune suppression.");
      setBadges(current => current.filter(item => item.id !== badge.id));
      setNotice("Badge supprimé.");
    } catch (error) { setNotice("Suppression impossible : " + messageOf(error)); }
    finally { setBusy(false); }
  }

  async function loadMember() {
    const clean = username.trim().replace(/^@/, "");
    if (!clean) { setNotice("Saisis le pseudo du membre."); return; }
    setBusy(true); setNotice("");
    try {
      const { data: profile, error } = await supabase.from("profiles").select("id,username").eq("username", clean).maybeSingle();
      if (error) throw error;
      if (!profile) throw new Error("Membre introuvable.");
      const { data, error: awardError } = await supabase.from("profile_badges").select("profile_id,badge_id,reason,awarded_at,badges:badge_id(id,slug,name,description,icon,tone,background_color,image_zoom,image_position_x,image_position_y,border_color,border_width,glow_intensity)").eq("profile_id", profile.id).order("awarded_at", { ascending: false });
      if (awardError) throw awardError;
      setTargetId(profile.id);
      setAwards((data ?? []) as unknown as AwardRow[]);
    } catch (error) { setTargetId(""); setAwards([]); setNotice("Chargement du membre impossible : " + messageOf(error)); }
    finally { setBusy(false); }
  }

  async function awardBadge() {
    if (!targetId || !selectedBadge) { setNotice("Choisis un membre et un badge."); return; }
    setBusy(true); setNotice("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");
      const { error } = await supabase.from("profile_badges").insert({ profile_id: targetId, badge_id: selectedBadge, awarded_by: user.id, reason: reason.trim() });
      if (error) throw error;
      setReason("");
      await loadMember();
      setNotice("Badge attribué manuellement.");
    } catch (error) { setNotice("Attribution impossible : " + messageOf(error)); }
    finally { setBusy(false); }
  }

  async function removeAward(badgeId: string) {
    if (!targetId || !window.confirm("Retirer ce badge à ce membre ?")) return;
    setBusy(true); setNotice("");
    try {
      const { data, error } = await supabase.from("profile_badges").delete().eq("profile_id", targetId).eq("badge_id", badgeId).select("badge_id");
      if (error) throw error;
      if (!data?.length) throw new Error("Supabase n’a confirmé aucun retrait.");
      await loadMember();
      setNotice("Attribution retirée.");
    } catch (error) { setNotice("Retrait impossible : " + messageOf(error)); }
    finally { setBusy(false); }
  }

  const visible = useMemo(() => badges.filter(b => (b.name + " " + b.slug + " " + b.description).toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr"))), [badges, search]);

  if (allowed === null) return <section className="badge-workshop" id="badges"><p>Vérification des droits…</p></section>;
  if (!allowed) return <section className="badge-workshop"><h2>Atelier indisponible</h2><p>Réservé aux modérateurs et administrateurs.</p></section>;

  return <section className="badge-workshop">
    <header className="badge-workshop-heading"><div><p className="eyebrow">PRYSM · Distinctions</p><h2>Atelier de badges</h2><p>Création et attribution manuelles, avec aperçu réel de l’insigne hexagonal.</p></div><button className="button primary" type="button" onClick={startCreate}>＋ Nouveau badge</button></header>
    {notice && <p className="badge-workshop-notice" role="status">{notice}</p>}
    {editorOpen && <section className="badge-workshop-editor">
      <header className="badge-workshop-subhead"><div><h3>{editingId ? "Modifier l’insigne" : "Nouvel insigne"}</h3><p>Le visuel est prévisualisé dans sa forme finale.</p></div><button className="button" type="button" onClick={() => { setEditorOpen(false); setDraft({ ...blank }); }}>Fermer</button></header>
      <div className="badge-workshop-preview"><BadgeMedal badge={{ ...draft, name: draft.name || "Aperçu" }} size="large" onImageError={() => { setPreviewFailed(true); setNotice("Le PNG est enregistré, mais son URL publique ne charge pas. Corrige l’accès à l’image avant d’enregistrer le badge."); }} /><div><strong>{draft.name || "Nom du badge"}</strong><p>{draft.description || "Description du badge"}</p><span className={"badge-workshop-tone " + draft.tone}>{draft.tone === "positive" ? "Positif" : draft.tone === "negative" ? "Négatif" : "Neutre"}</span></div></div>
      <div className="badge-workshop-fields">
        <label>Nom<input value={draft.name} maxLength={40} onChange={e => setDraft(d => ({ ...d, name: e.target.value, slug: d.slug || slugify(e.target.value) }))} placeholder="Ex. Pilier de la communauté" /></label>
        <label>Identifiant<input value={draft.slug} maxLength={48} onChange={e => setDraft(d => ({ ...d, slug: slugify(e.target.value) }))} placeholder="pilier-communaute" /></label>
        <label className="badge-workshop-wide">Description<textarea value={draft.description} maxLength={240} rows={2} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="À quoi correspond ce badge ?" /></label>
        <label>Catégorie<select value={draft.tone} onChange={e => setDraft(d => ({ ...d, tone: e.target.value as Draft["tone"] }))}><option value="positive">Positif</option><option value="neutral">Neutre</option><option value="negative">Négatif</option></select></label>
        <label>Icône emoji<input value={/^https?:\/\//i.test(draft.icon) ? "" : draft.icon} maxLength={16} onChange={e => { setPreviewFailed(false); setDraft(d => ({ ...d, icon: e.target.value })); }} placeholder="🏷️" /></label>
        <label className="badge-workshop-wide">Importer un PNG (5 Mo maximum)<input type="file" accept=".png,image/png" onChange={e => void uploadPng(e)} disabled={uploading} /><small>{uploading ? "Envoi en cours, attends la confirmation…" : "Recadrage auto des marges transparentes et des visages si le navigateur le permet. Le cadrage reste ajustable."}</small></label>
        <label>Fond<input type="color" value={draft.background_color} onChange={e => setDraft(d => ({ ...d, background_color: e.target.value }))} /><div className="badge-workshop-colors">{colors.map(color => <button key={color} type="button" style={{ background: color }} aria-label={"Fond " + color} onClick={() => setDraft(d => ({ ...d, background_color: color }))} />)}</div></label>
        <label>Contour<input type="color" value={draft.border_color} onChange={e => setDraft(d => ({ ...d, border_color: e.target.value }))} /></label>
        <label>Épaisseur du contour · {draft.border_width}px<input type="range" min="0" max="8" value={draft.border_width} onChange={e => setDraft(d => ({ ...d, border_width: Number(e.target.value) }))} /></label>
        <label>Lueur · {draft.glow_intensity}%<input type="range" min="0" max="100" step="5" value={draft.glow_intensity} onChange={e => setDraft(d => ({ ...d, glow_intensity: Number(e.target.value) }))} /></label>
        <label>Zoom · {draft.image_zoom}%<input type="range" min="100" max="200" step="5" value={draft.image_zoom} onChange={e => setDraft(d => ({ ...d, image_zoom: Number(e.target.value) }))} /></label>
        <label>Position horizontale · {draft.image_position_x}%<input type="range" min="0" max="100" value={draft.image_position_x} onChange={e => setDraft(d => ({ ...d, image_position_x: Number(e.target.value) }))} /></label>
        <label>Position verticale · {draft.image_position_y}%<input type="range" min="0" max="100" value={draft.image_position_y} onChange={e => setDraft(d => ({ ...d, image_position_y: Number(e.target.value) }))} /></label>
      </div>
      <footer className="badge-workshop-actions"><button className="button primary" type="button" disabled={busy || uploading || previewFailed} onClick={() => void saveBadge()}>{busy ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer le badge"}</button><button className="button" type="button" disabled={busy || uploading} onClick={() => { setEditorOpen(false); setDraft({ ...blank }); }}>Annuler</button></footer>
    </section>}
    <div className="badge-workshop-toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un badge…" aria-label="Rechercher un badge" /><span>{visible.length} badge(s)</span></div>
    <div className="badge-workshop-library">{visible.map(badge => <article className="badge-workshop-card" key={badge.id}><BadgeMedal badge={badge} size="medium" /><div className="badge-workshop-card-copy"><strong>{badge.name}</strong><small>{badge.slug}</small><p>{badge.description || "Aucune description."}</p><span className={"badge-workshop-tone " + badge.tone}>{badge.tone === "positive" ? "Positif" : badge.tone === "negative" ? "Négatif" : "Neutre"}</span></div><div className="badge-workshop-card-actions"><button type="button" onClick={() => startEdit(badge)}>Modifier</button><button type="button" className="danger" disabled={busy} onClick={() => void deleteBadge(badge)}>Supprimer</button></div></article>)}</div>
    <section className="badge-workshop-awards"><header className="badge-workshop-subhead"><div><h3>Attribution manuelle</h3><p>Les badges ne sont jamais distribués automatiquement.</p></div></header><div className="badge-workshop-award-search"><input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void loadMember(); } }} placeholder="Pseudo du membre" /><button className="button" type="button" disabled={busy} onClick={() => void loadMember()}>Charger</button></div>
      {targetId && <><div className="badge-workshop-award-form"><select value={selectedBadge} onChange={e => setSelectedBadge(e.target.value)}><option value="">Choisir un badge…</option>{badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><input value={reason} onChange={e => setReason(e.target.value)} maxLength={240} placeholder="Motif (facultatif)" /><button className="button primary" type="button" disabled={busy} onClick={() => void awardBadge()}>Attribuer</button></div><div className="badge-workshop-award-list">{awards.map(row => { const badge = Array.isArray(row.badges) ? row.badges[0] : row.badges; return <div className="badge-workshop-award-row" key={row.badge_id}><BadgeMedal badge={badge || {}} size="small" /><div><strong>{badge?.name || "Badge supprimé"}</strong><small>{row.reason || "Aucun motif"}</small></div><button type="button" className="danger" disabled={busy} onClick={() => void removeAward(row.badge_id)}>Retirer</button></div>; })}{!awards.length && <p>Aucun badge attribué à ce membre.</p>}</div></>}
    </section>
  </section>;
}
