"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Sticker = {
  id: string;
  name: string;
  image_url: string;
  status: "pending" | "approved" | "rejected";
  category: string;
};

function fileInfo(file: File) {
  const name = file.name.toLowerCase();
  if (file.type === "image/png" || name.endsWith(".png")) return { extension: "png", contentType: "image/png" };
  if (file.type === "image/gif" || name.endsWith(".gif")) return { extension: "gif", contentType: "image/gif" };
  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return { extension: "jpg", contentType: "image/jpeg" };
  return { extension: "webp", contentType: "image/webp" };
}

export default function StickerCreator() {
  const supabase = createSupabaseBrowser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Général");
  const [tagsText, setTagsText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [mine, setMine] = useState<Sticker[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadMine() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase.from("stickers").select("id,name,image_url,status,category").eq("creator_id", auth.user.id).order("created_at", { ascending: false }).limit(20);
    setMine((data ?? []) as Sticker[]);
  }

  useEffect(() => { void loadMine(); }, []);

  function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setError("");
    setMessage("");
    if (!next) return;
    const lowerName = next.name.toLowerCase();
    const allowedExtension = /\.(png|jpe?g|gif|webp)$/.test(lowerName);
    const allowedMime = ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(next.type);
    if (!allowedExtension && !allowedMime) {
      setError("Format accepté : PNG, JPG, GIF ou WebP.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setError("L'image doit faire 5 Mo maximum.");
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const cleanName = name.trim();
    if (!file) return setError("Choisis une image.");
    if (cleanName.length < 2 || cleanName.length > 40) return setError("Le nom doit contenir entre 2 et 40 caractères.");
    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw new Error("Session Supabase invalide : " + authError.message);
      }
      if (!auth.user) {
        throw new Error("Aucune session utilisateur détectée. Reconnecte-toi à PRYSM puis réessaie.");
      }
      const info = fileInfo(file);
      const path = auth.user.id + "/" + crypto.randomUUID() + "." + info.extension;
      const { error: uploadError } = await supabase.storage.from("stickers").upload(path, file, { contentType: info.contentType, upsert: false });
      if (uploadError) throw new Error("Upload Storage : " + uploadError.message);
      const stickerStatus = "approved";
      const tags = [...new Set([category.toLocaleLowerCase(), ...tagsText.split(",").map(tag => tag.trim().toLocaleLowerCase().replace(/^#/, "")).filter(Boolean)])].slice(0, 10);
      const tags = [...new Set([category.toLocaleLowerCase(), ...tagsText.split(",").map(tag => tag.trim().toLocaleLowerCase().replace(/^#/, "")).filter(Boolean)])].slice(0, 10);

      const { data: publicData } = supabase.storage.from("stickers").getPublicUrl(path);
      const { error: insertError } = await supabase.from("stickers").insert({
        creator_id: auth.user.id,
        name: cleanName,
        category,
        tags,
        image_url: publicData.publicUrl,
        mime_type: info.contentType,
        width: null,
        height: null,
        status: stickerStatus,
        approved_at: new Date().toISOString(),
      });
      if (insertError) {
        await supabase.storage.from("stickers").remove([path]);
        throw new Error("Enregistrement du sticker : " + insertError.message);
      }
      setMessage("Sticker créé et approuvé automatiquement. Il est disponible dans la galerie !");
      setName("");
      setTagsText("");
      setFile(null);
      setPreview("");
      if (inputRef.current) inputRef.current.value = "";
      await loadMine();
    } catch (err) {
      const detail =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message ?? "")
            : String(err ?? "");
      setError(detail || "Impossible de créer le sticker. Vérifie que tu es bien connecté et réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sticker-creator">
      <div className="sticker-creator-card">
        <div>
          <p className="eyebrow">Nouveau sticker</p>
          <h2>Ton image, format PRYSM ✨</h2>
          <p className="sticker-help">PRYSM conserve ton image telle quelle. PNG, JPG, GIF et WebP sont acceptés jusqu’à 5 Mo.</p>
        </div>
        <form className="sticker-creator-form" onSubmit={submit}>
          <label className="sticker-upload-zone" htmlFor="sticker-file">
            {preview ? <img src={preview} alt="Aperçu du sticker" /> : <><strong>＋ Choisir une image</strong><small>PNG · JPG · GIF · WebP · 5 Mo max.</small></>}
            <input id="sticker-file" ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp" onChange={chooseFile} />
          </label>
          <div className="sticker-fields">
            <label>Nom<input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Ex. Cherrie en panique" required /></label>
            <label>Catégorie<select value={category} onChange={e => setCategory(e.target.value)}><option>Général</option><option>Réactions</option><option>Humour</option><option>Amour</option><option>Animaux</option><option>Gaming</option><option>Communauté</option></select></label>
            <label className="sticker-tags-field">Tags (séparés par des virgules)<input value={tagsText} onChange={e => setTagsText(e.target.value)} maxLength={180} placeholder="#chat, drôle, réaction" /><small>Ajoute des mots-clés pour que tout le monde retrouve ton sticker.</small></label>
          </div>
          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice">{message}</div>}
          <button className="button primary" type="submit" disabled={saving}>{saving ? "Création…" : "Créer le sticker"}</button>
        </form>
      </div>
      <div className="sticker-mine">
        <div className="section-heading"><div><p className="eyebrow">Mes créations</p><h2>Mes créations</h2></div></div>
        {mine.length === 0 ? <div className="empty"><p>Tu n'as encore créé aucun sticker.</p></div> : <div className="sticker-mine-grid">{mine.map(sticker => <article className="sticker-mine-card" key={sticker.id}><img src={sticker.image_url} alt="" /><div><strong>{sticker.name}</strong><span className={"sticker-status " + sticker.status}>{sticker.status === "pending" ? "En attente" : sticker.status === "approved" ? "Approuvé" : "Refusé"}</span></div></article>)}</div>}
      </div>
    </section>
  );
}
