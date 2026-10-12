"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

type AudioSetting = { id: number; audio_url: string; audio_path: string; updated_at: string };

export default function AdminAudioPage() {
  const db = createSupabaseBrowser();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [current, setCurrent] = useState<AudioSetting | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setAllowed(false); return; }
    const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) { setAllowed(false); return; }
    setAllowed(true);
    const { data, error } = await db.from("site_audio_settings").select("*").eq("id", 1).maybeSingle();
    if (error) setError("Lecture du réglage audio impossible : " + error.message);
    else setCurrent((data as AudioSetting | null) ?? null);
  }

  useEffect(() => { void load(); }, []);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setError(""); setMessage("");
    if (picked.type !== "audio/mpeg" && !picked.name.toLowerCase().endsWith(".mp3")) {
      setError("Choisis un fichier MP3.");
      event.target.value = "";
      return;
    }
    if (picked.size > 20 * 1024 * 1024) {
      setError("Le fichier dépasse la limite de 20 Mo.");
      event.target.value = "";
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!file) { setError("Choisis d’abord un fichier MP3."); return; }
    setBusy(true); setError(""); setMessage("");
    let uploadedPath: string | null = null;
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Reconnecte-toi à PRYSM.");
      const path = user.id + "/audio/" + crypto.randomUUID() + ".mp3";
      const { error: uploadError } = await db.storage.from("stickers").upload(path, file, { contentType: "audio/mpeg", upsert: false });
      if (uploadError) throw new Error("Import MP3 : " + uploadError.message);
      uploadedPath = path;
      const audioUrl = db.storage.from("stickers").getPublicUrl(path).data.publicUrl;
      const { error: saveError } = await db.from("site_audio_settings").upsert({
        id: 1, audio_url: audioUrl, audio_path: path, updated_by: user.id, updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (saveError) throw new Error("Enregistrement : " + saveError.message);
      if (current?.audio_path && current.audio_path !== path) await db.storage.from("stickers").remove([current.audio_path]);
      setFile(null); setPreview(""); setMessage("Musique enregistrée. Elle devient la bande-son d’ambiance du forum pour tout le monde.");
      await load();
    } catch (cause) {
      if (uploadedPath) await db.storage.from("stickers").remove([uploadedPath]);
      setError(cause instanceof Error ? cause.message : "Impossible d’enregistrer cette musique.");
    } finally { setBusy(false); }
  }

  async function restoreDefault() {
    if (!window.confirm("Retirer le MP3 personnalisé et rétablir la musique d’ambiance d’origine ?")) return;
    setBusy(true); setError(""); setMessage("");
    const { error: deleteError } = await db.from("site_audio_settings").delete().eq("id", 1);
    if (deleteError) setError("Impossible de rétablir la musique d’origine : " + deleteError.message);
    else {
      if (current?.audio_path) await db.storage.from("stickers").remove([current.audio_path]);
      setCurrent(null); setFile(null); setPreview("");
      setMessage("Musique d’origine rétablie.");
    }
    setBusy(false);
  }

  if (allowed === null) return <main className="shell"><section className="page-head"><h1>Chargement…</h1></section></main>;
  if (!allowed) return <main className="shell"><section className="page-head"><p className="eyebrow">Atelier audio</p><h1>Accès refusé</h1><Link className="button" href="/admin">Retour à l’administration</Link></section></main>;

  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/forum">Forum</Link><Link href="/admin">Administration</Link></nav></header>
    <section className="page-head compact"><p className="eyebrow">Atelier audio // Bande-son</p><h1>Musique d’ambiance.</h1><p className="lead">Remplace la musique actuelle par ton propre MP3. Le fichier enregistré sera utilisé par tous les visiteurs lorsqu’ils activent l’audio. La lecture automatique reste soumise aux règles du navigateur.</p></section>
    {error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}
    <div className="decoration-workshop">
      <section className="decoration-editor">
        <p className="eyebrow">01 // Nouvelle bande-son</p><h2>Importer un MP3</h2>
        <form onSubmit={save}>
          <label className="decoration-field">Fichier musical (.mp3)
            <input type="file" accept=".mp3,audio/mpeg" onChange={pick} />
            <small>MP3 uniquement, 20 Mo maximum. Une musique douce en boucle fonctionne le mieux.</small>
          </label>
          {file && <div className="decoration-preview"><strong>{file.name}</strong><p>{(file.size / (1024 * 1024)).toFixed(2)} Mo</p><audio controls preload="metadata" src={preview} style={{ width: "100%" }}>Ton navigateur ne prend pas en charge l’aperçu audio.</audio></div>}
          <div className="decoration-form-actions"><button className="button primary" disabled={busy || !file}>{busy ? "Enregistrement…" : "Installer cette musique"}</button><button className="button" type="button" disabled={busy} onClick={() => { setFile(null); setPreview(""); setError(""); }}>Annuler</button></div>
        </form>
      </section>
      <section className="decoration-library">
        <p className="eyebrow">02 // Musique active</p><h2>{current ? "MP3 personnalisé" : "Musique d’origine"}</h2>
        {current ? <><p className="lead">La bande-son personnalisée est actuellement installée sur PRYSM.</p><audio controls preload="metadata" src={current.audio_url} style={{ width: "100%" }}>Ton navigateur ne prend pas en charge l’aperçu audio.</audio><p><small>Dernière modification : {new Date(current.updated_at).toLocaleString("fr-FR")}</small></p><button className="button" type="button" disabled={busy} onClick={() => void restoreDefault()}>Rétablir la musique d’origine</button></> : <p className="lead">Aucun MP3 personnalisé. PRYSM utilise sa musique d’ambiance actuelle.</p>}
      </section>
    </div>
    <p className="decoration-footnote">Le remplacement concerne uniquement la musique d’ambiance en boucle. Les effets sonores de l’interface restent inchangés. Le navigateur peut exiger un clic sur « AUDIO » avant d’autoriser la lecture.</p>
  </main>;
}
