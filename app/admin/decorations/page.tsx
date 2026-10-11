"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import Link from "next/link";
import PrysmNav from "@/components/PrysmNav";
import { createClient } from "@/lib/supabase/client";

const slots = [
  ["tab-forum", "Onglet Forum", "Navigation"], ["tab-rencontres", "Onglet Rencontres", "Navigation"],
  ["tab-orbite", "Onglet Orbite", "Navigation"], ["tab-messages", "Onglet Messages", "Navigation"],
  ["tab-profil", "Onglet Profil", "Navigation"], ["header-forum", "En-tête Forum", "En-têtes"],
  ["header-rencontres", "En-tête Rencontres", "En-têtes"], ["header-orbite", "En-tête Orbite", "En-têtes"],
  ["header-messages", "En-tête Messages", "En-têtes"], ["header-profil", "En-tête Profil", "En-têtes"],
  ["panel-home", "Panneau Accueil", "Panneaux"], ["panel-forum", "Panneau Forum", "Panneaux"],
  ["panel-rencontres", "Panneau Rencontres", "Panneaux"], ["panel-orbite", "Panneau Orbite", "Panneaux"],
  ["panel-profil", "Panneau Profil", "Panneaux"]
] as const;

type Decoration = { id: string; slot: string; image_url: string; image_path: string; alt_text: string; width_px: number; height_px: number; alignment: "before" | "after"; mobile_visible: boolean; desktop_visible: boolean; enabled: boolean };

export default function DecorationWorkshop() {
  const db = createClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<Decoration[]>([]);
  const [slot, setSlot] = useState("tab-forum");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [alt, setAlt] = useState("");
  const [width, setWidth] = useState(42);
  const [height, setHeight] = useState(42);
  const [alignment, setAlignment] = useState<"before" | "after">("after");
  const [mobile, setMobile] = useState(true);
  const [desktop, setDesktop] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setAllowed(false); return; }
    const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) { setAllowed(false); return; }
    setAllowed(true);
    const { data, error: loadError } = await db.from("site_decorations").select("*").order("slot");
    if (loadError) setError("Impossible de charger la bibliothèque : " + loadError.message);
    else setItems((data ?? []) as Decoration[]);
  }
  useEffect(() => { void load(); }, []);
  const current = items.find((item) => item.slot === slot);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setError("");
    if (selected.type !== "image/png" && !selected.name.toLowerCase().endsWith(".png")) { setError("Seuls les fichiers PNG sont acceptés."); return; }
    if (selected.size > 5 * 1024 * 1024) { setError("5 Mo maximum par image."); return; }
    setFile(selected); setPreview(URL.createObjectURL(selected));
  }
  function edit(item: Decoration) {
    setSlot(item.slot); setAlt(item.alt_text); setWidth(item.width_px); setHeight(item.height_px);
    setAlignment(item.alignment); setMobile(item.mobile_visible); setDesktop(item.desktop_visible);
    setEnabled(item.enabled); setPreview(item.image_url); setFile(null);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    let uploaded: string | null = null;
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Reconnecte-toi à PRYSM.");
      if (!file && !current) throw new Error("Choisis un fichier PNG.");
      let imageUrl = current?.image_url ?? "";
      let imagePath = current?.image_path ?? "";
      if (file) {
        const path = user.id + "/decorations/" + crypto.randomUUID() + ".png";
        const { error: uploadError } = await db.storage.from("stickers").upload(path, file, { contentType: "image/png", upsert: false });
        if (uploadError) throw new Error("Import PNG : " + uploadError.message);
        uploaded = path; imagePath = path;
        imageUrl = db.storage.from("stickers").getPublicUrl(path).data.publicUrl;
      }
      const { error: saveError } = await db.from("site_decorations").upsert({
        slot, image_url: imageUrl, image_path: imagePath, alt_text: alt.trim().slice(0, 120),
        width_px: width, height_px: height, alignment, mobile_visible: mobile, desktop_visible: desktop,
        enabled, updated_by: user.id, updated_at: new Date().toISOString()
      }, { onConflict: "slot" });
      if (saveError) throw new Error("Enregistrement : " + saveError.message);
      if (current && file && current.image_path !== imagePath) await db.storage.from("stickers").remove([current.image_path]);
      setMessage("PNG enregistré."); setFile(null); setPreview(""); setAlt(""); await load();
    } catch (caught) {
      if (uploaded) await db.storage.from("stickers").remove([uploaded]);
      setError(caught instanceof Error ? caught.message : "Impossible d’enregistrer le PNG.");
    } finally { setBusy(false); }
  }
  async function remove(item: Decoration) {
    if (!window.confirm("Supprimer cette décoration ?")) return;
    setBusy(true); setError("");
    const { error: deleteError } = await db.from("site_decorations").delete().eq("id", item.id);
    if (deleteError) setError(deleteError.message);
    else {
      if (item.image_path) await db.storage.from("stickers").remove([item.image_path]);
      setItems((old) => old.filter((entry) => entry.id !== item.id)); setMessage("Décoration supprimée.");
    }
    setBusy(false);
  }

  const panel: CSSProperties = { padding: 22, borderRadius: 18, border: "1px solid var(--line, rgba(255,255,255,.14))", background: "var(--panel, rgba(255,255,255,.035))" };
  const field: CSSProperties = { display: "grid", gap: 8, marginBottom: 18 };
  if (allowed === null) return <><PrysmNav /><main style={{ padding: 28 }}>Vérification des accès…</main></>;
  if (!allowed) return <><PrysmNav /><main style={{ padding: 28 }}><h1>Accès refusé</h1><Link href="/admin">Retour à l’administration</Link></main></>;

  return <>
    <PrysmNav />
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 18px 70px" }}>
      <Link href="/admin" style={{ opacity: .8 }}>← Administration</Link>
      <p className="eyebrow" style={{ marginTop: 24 }}>PRYSM // Atelier visuel</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", marginBottom: 8 }}>Atelier de décorations PNG</h1>
      <p style={{ opacity: .8, lineHeight: 1.7, maxWidth: 760 }}>Importe des PNG transparents et règle leur emplacement, leurs dimensions et leur visibilité sur mobile ou ordinateur. Taille maximale : 5 Mo.</p>
      {error && <p role="alert" style={{ padding: 14, borderRadius: 10, background: "rgba(220,70,70,.12)" }}>{error}</p>}
      {message && <p role="status" style={{ padding: 14, borderRadius: 10, background: "rgba(70,190,130,.12)" }}>{message}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 18, alignItems: "start", marginTop: 24 }}>
        <section style={panel}>
          <h2>Configuration</h2>
          <form onSubmit={save}>
            <label style={field}>Emplacement<select value={slot} onChange={(e) => { setSlot(e.target.value); setPreview(""); setFile(null); }} style={{ padding: 12, width: "100%" }}>{["Navigation", "En-têtes", "Panneaux"].map((group) => <optgroup key={group} label={group}>{slots.filter((entry) => entry[2] === group).map((entry) => <option key={entry[0]} value={entry[0]}>{entry[1]}</option>)}</optgroup>)}</select></label>
            <label style={field}>Fichier PNG<input type="file" accept="image/png,.png" onChange={pick} style={{ maxWidth: "100%" }} /></label>
            <label style={field}>Texte alternatif<input value={alt} maxLength={120} onChange={(e) => setAlt(e.target.value)} /></label>
            <label style={field}>Largeur : {width} px<input type="range" min="12" max="240" value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label>
            <label style={field}>Hauteur : {height} px<input type="range" min="12" max="240" value={height} onChange={(e) => setHeight(Number(e.target.value))} /></label>
            <label style={field}>Position<select value={alignment} onChange={(e) => setAlignment(e.target.value as "before" | "after")}><option value="before">Avant le texte</option><option value="after">Après le texte</option></select></label>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              <label><input type="checkbox" checked={mobile} onChange={(e) => setMobile(e.target.checked)} /> Visible sur mobile</label>
              <label><input type="checkbox" checked={desktop} onChange={(e) => setDesktop(e.target.checked)} /> Visible sur ordinateur</label>
              <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Décoration active</label>
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,.04)", marginBottom: 18 }}>
              <small>Aperçu</small><div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 60 }}>{(preview || current?.image_url) && <img src={preview || current?.image_url} alt="Aperçu" style={{ width, height, objectFit: "contain" }} />}<strong>{slots.find((entry) => entry[0] === slot)?.[1]}</strong></div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}><button className="button primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le PNG"}</button><button className="button" type="button" onClick={() => { setFile(null); setPreview(""); setAlt(""); }}>Réinitialiser</button></div>
          </form>
        </section>
        <section style={panel}>
          <h2>Bibliothèque PNG</h2>
          {items.length === 0 ? <p style={{ opacity: .75 }}>Aucune décoration enregistrée.</p> : <div style={{ display: "grid", gap: 12 }}>{items.map((item) => <article key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: 12, background: "rgba(255,255,255,.035)" }}>
            <img src={item.image_url} alt={item.alt_text} style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}><strong>{slots.find((entry) => entry[0] === item.slot)?.[1] ?? item.slot}</strong><p style={{ margin: "4px 0", opacity: .7, fontSize: 13 }}>{item.width_px} × {item.height_px} px · {item.enabled ? "Active" : "Désactivée"}</p></div>
            <div style={{ display: "grid", gap: 6 }}><button type="button" className="button" onClick={() => edit(item)}>Modifier</button><button type="button" className="button" disabled={busy} onClick={() => void remove(item)}>Supprimer</button></div>
          </article>)}</div>}
        </section>
      </div>
    </main>
  </>;
}
