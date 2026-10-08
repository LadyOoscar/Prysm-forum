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

function extension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function squareCrop(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const source = await createImageBitmap(file);
  const size = Math.min(source.width, source.height);
  const sx = Math.floor((source.width - size) / 2);
  const sy = Math.floor((source.height - size) / 2);
  const canvas = document.createElement("canvas");
  const output = Math.min(512, size);
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer l'image.");
  ctx.clearRect(0, 0, output, output);
  ctx.drawImage(source, sx, sy, size, size, 0, 0, output, output);
  source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type === "image/png" ? "image/png" : "image/webp", .9));
  if (!blob) throw new Error("Impossible de préparer l'image.");
  return { blob, width: output, height: output };
}

export default function StickerCreator() {
  const supabase = createSupabaseBrowser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Général");
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
    if (!next.type.startsWith("image/") || !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(next.type)) {
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
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/auth";
        return;
      }
      const prepared = await squareCrop(file);
      const ext = extension(file.type);
      const path = auth.user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("stickers").upload(path, prepared.blob, { contentType: file.type === "image/png" ? "image/png" : "image/webp", upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("stickers").getPublicUrl(path);
      const { error: insertError } = await supabase.from("stickers").insert({
        creator_id: auth.user.id,
        name: cleanName,
        category,
        tags: [category.toLowerCase()],
        image_url: publicData.publicUrl,
        mime_type: file.type,
        width: prepared.width,
        height: prepared.height,
        status: "pending",
      });
      if (insertError) {
        await supabase.storage.from("stickers").remove([path]);
        throw insertError;
      }
      setMessage("Sticker envoyé ! Il sera visible dans la galerie après validation.");
      setName("");
      setFile(null);
      setPreview("");
      if (inputRef.current) inputRef.current.value = "";
      await loadMine();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le sticker.");
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
          <p className="sticker-help">L'image est centrée et recadrée en carré, jusqu'à 512 × 512 px. Les PNG transparents sont conservés.</p>
        </div>
        <form className="sticker-creator-form" onSubmit={submit}>
          <div className="sticker-upload-zone" onClick={() => inputRef.current?.click()}>
            {preview ? <img src={preview} alt="Aperçu du sticker" /> : <><strong>＋ Choisir une image</strong><small>PNG · JPG · GIF · WebP · 5 Mo max.</small></>}
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={chooseFile} />
          </div>
          <div className="sticker-fields">
            <label>Nom<input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Ex. Cherrie en panique" required /></label>
            <label>Catégorie<select value={category} onChange={e => setCategory(e.target.value)}><option>Général</option><option>Réactions</option><option>Humour</option><option>Amour</option><option>Animaux</option><option>Gaming</option><option>Communauté</option></select></label>
          </div>
          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice">{message}</div>}
          <button className="button primary" type="submit" disabled={saving}>{saving ? "Création…" : "Créer le sticker"}</button>
        </form>
      </div>
      <div className="sticker-mine">
        <div className="section-heading"><div><p className="eyebrow">Mes créations</p><h2>En attente de validation</h2></div></div>
        {mine.length === 0 ? <div className="empty"><p>Tu n'as encore créé aucun sticker.</p></div> : <div className="sticker-mine-grid">{mine.map(sticker => <article className="sticker-mine-card" key={sticker.id}><img src={sticker.image_url} alt="" /><div><strong>{sticker.name}</strong><span className={"sticker-status " + sticker.status}>{sticker.status === "pending" ? "En attente" : sticker.status === "approved" ? "Approuvé" : "Refusé"}</span></div></article>)}</div>}
      </div>
    </section>
  );
}
