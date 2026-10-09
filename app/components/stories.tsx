"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type StoryDesign = { v: 1; caption: string; text: string; textColor: string; font: string; position: string; background: string; filter: string; stickers: string[]; musicTitle: string; musicArtist: string; musicUrl: string; textSize: number; textAlign: "left" | "center" | "right"; textBold: boolean; textPlate: boolean; textShadow: boolean; };
type Story = {
  id: string; user_id: string; media_path: string; media_type: "image" | "video"; caption: string;
  created_at: string; expires_at: string;
  profiles: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
  mediaUrl: string; design: StoryDesign | null;
};
type StoryGroup = { userId: string; name: string; avatar: string | null; stories: Story[] };

const MAX_SIZE = 10 * 1024 * 1024;
const backgrounds = [
  { name: "Prisme", value: "linear-gradient(145deg,#151338,#5b1e71 48%,#092f48)" },
  { name: "Cyber", value: "linear-gradient(135deg,#020617,#082f49 48%,#701a75)" },
  { name: "Crépuscule", value: "linear-gradient(145deg,#4c1d95,#be185d 52%,#fb923c)" },
  { name: "Forêt", value: "linear-gradient(145deg,#052e2b,#14532d 55%,#172554)" },
  { name: "Cosmos", value: "radial-gradient(circle at 50% 25%,#4c1d95,#111827 55%,#020617)" },
  { name: "Rose", value: "linear-gradient(145deg,#831843,#be185d 55%,#312e81)" },
  { name: "Nuit", value: "linear-gradient(145deg,#020617,#111827)" },
  { name: "Clair", value: "linear-gradient(145deg,#fce7f3,#ddd6fe 55%,#bae6fd)" }
];
const stickerChoices = ["✨","🌙","⭐","🦋","🌸","💜","🔥","🌿","🔮","🪐","🦊","🐈","🎵","💫","🖤","☀️"];
const emptyDesign = (): StoryDesign => ({ v: 1, caption: "", text: "", textColor: "#ffffff", font: "Space Grotesk", position: "center", background: backgrounds[0].value, filter: "none", stickers: [], musicTitle: "", musicArtist: "", musicUrl: "", textSize: 32, textAlign: "center", textBold: true, textPlate: false, textShadow: true });
function decodeCaption(value: string): { caption: string; design: StoryDesign | null } {
  if (value.startsWith("__PRYSM_STORY_V1__")) {
    try { const parsed = JSON.parse(value.slice("__PRYSM_STORY_V1__".length)); return { caption: parsed.caption || "", design: parsed.design || null }; } catch {}
  }
  return { caption: value || "", design: null };
}
function designCaption(design: StoryDesign) { return "__PRYSM_STORY_V1__" + JSON.stringify({ caption: design.caption, design }); }

function musicEmbedUrl(rawUrl: string): { src: string; provider: string } | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
      return { src: "https://www.youtube.com/embed/" + id + "?rel=0&playsinline=1", provider: "YouTube" };
    }
    if (host === "open.spotify.com" || host === "spotify.link") {
      const match = url.pathname.match(/^\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)\/?$/);
      if (!match) return null;
      return { src: "https://open.spotify.com/embed/" + match[1] + "/" + match[2] + "?utm_source=generator&theme=0", provider: "Spotify" };
    }
    if (host === "soundcloud.com" || host === "m.soundcloud.com") {
      if (!url.pathname.split("/").filter(Boolean).length) return null;
      return { src: "https://w.soundcloud.com/player/?url=" + encodeURIComponent(url.origin + url.pathname) + "&color=%2345efff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false", provider: "SoundCloud" };
    }
  } catch {}
  return null;
}

export default function Stories() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [design, setDesign] = useState<StoryDesign>(emptyDesign);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewer, setViewer] = useState<{ group: number; item: number } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeMusicStoryId, setActiveMusicStoryId] = useState<string | null>(null);

  const loadStories = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id ?? null);
    if (!auth.user) { setGroups([]); return; }
    const { data, error } = await supabase.from("stories")
      .select("id,user_id,media_path,media_type,caption,created_at,expires_at,profiles!stories_user_id_fkey(username,display_name,avatar_url)")
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: true });
    if (error || !data) { setNotice(error ? "Les stories sont momentanément indisponibles." : ""); return; }
    const withUrls = await Promise.all(data.map(async (row: any) => {
      const { data: signed } = await supabase.storage.from("prysm-stories").createSignedUrl(row.media_path, 3600);
      const decoded = decodeCaption(row.caption);
      return { ...row, caption: decoded.caption, design: decoded.design, profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles, mediaUrl: signed?.signedUrl ?? "" } as Story;
    }));
    const grouped = new Map<string, StoryGroup>();
    for (const story of withUrls.filter((s: Story) => s.mediaUrl)) {
      const profile = story.profiles;
      const name = profile?.display_name || profile?.username || "Membre";
      if (!grouped.has(story.user_id)) grouped.set(story.user_id, { userId: story.user_id, name, avatar: profile?.avatar_url ?? null, stories: [] });
      grouped.get(story.user_id)!.stories.push(story);
    }
    setGroups(Array.from(grouped.values()).sort((a, b) => (b.stories[b.stories.length - 1]?.created_at ?? "").localeCompare(a.stories[a.stories.length - 1]?.created_at ?? "")));
  }, [supabase]);

  useEffect(() => { void loadStories(); }, [loadStories]);

  function updateDesign<K extends keyof StoryDesign>(key: K, value: StoryDesign[K]) {
    setDesign(previous => ({ ...previous, [key]: value }));
  }

  async function addStory() {
    setNotice("");
    if (!selectedFile && !design.text.trim() && !design.stickers.length && !design.musicTitle.trim() && !design.musicArtist.trim() && !design.musicUrl.trim()) {
      setNotice("Ajoute une photo, une vidéo ou du texte pour créer ta story."); return;
    }
    if (selectedFile && !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(selectedFile.type)) {
      setNotice("Format accepté : JPG, PNG, WebP, MP4 ou WebM."); return;
    }
    if (selectedFile && selectedFile.size > MAX_SIZE) { setNotice("Le fichier ne doit pas dépasser 10 Mo."); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = "/auth"; return; }
    setUploading(true);
    let fileToUpload: File;
    let mediaType: "image" | "video" = selectedFile?.type.startsWith("video/") ? "video" : "image";
    if (selectedFile) {
      fileToUpload = selectedFile;
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setNotice("Impossible de créer cette story sur cet appareil."); setUploading(false); return; }
      if (/^#[0-9a-fA-F]{6}$/.test(design.background)) {
        ctx.fillStyle = design.background; ctx.fillRect(0, 0, 1080, 1920);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
        if (design.background.includes("linear-gradient")) {
          const colors = design.background.match(/#[0-9a-fA-F]{3,8}/g) || ["#151338", "#5b1e71", "#092f48"];
          gradient.addColorStop(0, colors[0]); gradient.addColorStop(.52, colors[1] || colors[0]); gradient.addColorStop(1, colors[2] || colors[1] || colors[0]);
        } else { gradient.addColorStop(0, "#4c1d95"); gradient.addColorStop(.5, "#111827"); gradient.addColorStop(1, "#020617"); }
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1920);
      }
      ctx.strokeStyle = "#ffffff28"; ctx.lineWidth = 2; ctx.strokeRect(42, 42, 996, 1836);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // Text, stickers and music are rendered as editable overlays in the story viewer.
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png", .95));
      if (!blob) { setNotice("Impossible de générer l’image de la story."); setUploading(false); return; }
      fileToUpload = new File([blob], "prysm-story.png", { type: "image/png" });
    }
    const ext = fileToUpload.name.split(".").pop()?.toLowerCase() || (mediaType === "video" ? "mp4" : "png");
    const path = auth.user.id + "/" + Date.now() + "." + ext;
    const { error: uploadError } = await supabase.storage.from("prysm-stories").upload(path, fileToUpload, { contentType: fileToUpload.type, upsert: false });
    if (uploadError) { setNotice("Envoi impossible. Réessaie avec un média plus léger."); setUploading(false); return; }
    const { error: insertError } = await supabase.from("stories").insert({
      user_id: auth.user.id, media_path: path, media_type: mediaType,
      caption: designCaption(design), expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    if (insertError) {
      await supabase.storage.from("prysm-stories").remove([path]);
      setNotice("Le média a été envoyé, mais la story n’a pas pu être publiée.");
    } else {
      setDesign(emptyDesign()); setSelectedFile(null); setEditorOpen(false);
      setNotice("Story publiée ! Elle disparaîtra dans 24 heures."); await loadStories();
    }
    setUploading(false);
  }

  async function deleteStory(story: Story) {
    if (story.user_id !== userId) return;
    await supabase.from("stories").delete().eq("id", story.id);
    await supabase.storage.from("prysm-stories").remove([story.media_path]);
    setViewer(null); await loadStories();
  }

  const currentGroup = viewer ? groups[viewer.group] : null;
  const currentStory = currentGroup && viewer ? currentGroup.stories[viewer.item] : null;
  function moveStory(direction: number) {
    if (!viewer || !currentGroup) return;
    const nextItem = viewer.item + direction;
    if (nextItem >= 0 && nextItem < currentGroup.stories.length) { setViewer({ ...viewer, item: nextItem }); return; }
    const nextGroup = viewer.group + direction;
    if (nextGroup >= 0 && nextGroup < groups.length) setViewer({ group: nextGroup, item: direction > 0 ? 0 : groups[nextGroup].stories.length - 1 });
    else setViewer(null);
  }

  return <>
    <section className="stories-section shell" aria-label="Stories PRYSM">
      <div className="stories-heading"><div><p className="eyebrow">En ce moment</p><h2>Les stories</h2></div><span>24 H · ÉPHÉMÈRES</span></div>
      <div className="stories-rail">
        <button type="button" className="story-bubble story-add" onClick={() => setEditorOpen(v => !v)}>
          <span className="story-avatar story-add-avatar"><b>{editorOpen ? "×" : "+"}</b></span><span>Créer</span>
        </button>
        {groups.map((group, index) => <button className="story-bubble" key={group.userId} onClick={() => setViewer({ group: index, item: 0 })}>
          <span className={"story-avatar" + (group.stories.every(s => s.user_id === userId) ? " own-story" : "")}>
            {group.avatar ? <img src={group.avatar} alt="" /> : <b>{group.name.slice(0, 1).toUpperCase()}</b>}
          </span><span>{group.userId === userId ? "Vous" : group.name}</span>
        </button>)}
      </div>
      {notice && <p className="stories-notice" role="status">{notice}</p>}
      {editorOpen && <div className="story-editor">
        <div className="story-editor-title"><div><span className="eyebrow">STORY STUDIO / 01</span><h3>Compose ta story</h3></div><span className="story-editor-live">APERÇU EN DIRECT</span></div>
        <div className="story-editor-layout">
          <div className="story-editor-preview" style={{ background: selectedFile && selectedFile.type.startsWith("image/") ? "linear-gradient(#0002,#0004)" : design.background }}>
            {selectedFile && selectedFile.type.startsWith("image/") && <img className={"story-preview-photo filter-" + design.filter.replace(/[^a-z0-9-]/g, "")} src={URL.createObjectURL(selectedFile)} alt="Aperçu" />}
            {selectedFile && selectedFile.type.startsWith("video/") && <div className="story-preview-video">▶ Vidéo sélectionnée</div>}
            <div className={"story-preview-content pos-" + design.position}>
              {design.stickers.length > 0 && <div className="story-preview-stickers">{design.stickers.join(" ")}</div>}
              {design.text && <div className="story-preview-text" style={{ color: design.textColor, fontFamily: design.font, fontSize: `clamp(12px, ${design.textSize || 32}px, 64px)`, textAlign: design.textAlign || "center", fontWeight: design.textBold === false ? 400 : 700, background: design.textPlate ? "linear-gradient(110deg,#08091ae8,#171536e8)" : "transparent", padding: design.textPlate ? "10px 14px" : "0", border: design.textPlate ? "1px solid #45efff55" : "0", borderRadius: design.textPlate ? "8px" : "0", textShadow: design.textShadow === false ? "none" : undefined }}>{design.text}</div>}
            </div>
            {(design.musicTitle || design.musicArtist || design.musicUrl) && <div className="story-preview-music"><span>♫ EN ÉCOUTE</span><strong>{design.musicTitle || "Écouter le morceau"}</strong><small>{design.musicArtist || "YouTube / musique"}</small></div>}
            <span className="story-preview-brand">◆ PRYSM / STORY</span>
          </div>
          <div className="story-editor-controls">
            <label className="story-upload-control">＋ {selectedFile ? selectedFile.name : "Ajouter une photo ou vidéo"}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e => setSelectedFile(e.target.files?.[0] || null)} /></label>
            {selectedFile && <button type="button" className="story-clear-media" onClick={() => setSelectedFile(null)}>Retirer le média</button>}
            <label>Ton texte<textarea value={design.text} onChange={e => updateDesign("text", e.target.value.slice(0, 180))} placeholder="Écris quelque chose…" rows={3} maxLength={180} /></label>
            <div className="story-control-grid">
              <label>Police<select value={design.font} onChange={e => updateDesign("font", e.target.value)}><option value="Space Grotesk">Space Grotesk</option><option value="DM Sans">DM Sans</option><option value="Rajdhani">Rajdhani</option><option value="serif">Sérif éditorial</option><option value="monospace">Pixel / monospace</option><option value="Georgia, serif">Roman classique</option><option value="Impact, sans-serif">Affiche / impact</option><option value="cursive">Manuscrite</option></select></label>
              <label>Position<select value={design.position} onChange={e => updateDesign("position", e.target.value)}><option value="top">En haut</option><option value="center">Au centre</option><option value="bottom">En bas</option></select></label>
            </div>
            <label>Couleur du texte <div className="story-color-row">{["#ffffff","#45efff","#ff4fc3","#ffd45a","#c9ff58","#111827"].map(c => <button type="button" key={c} aria-label={"Couleur "+c} className={"story-color-swatch" + (design.textColor === c ? " active" : "")} style={{ background: c }} onClick={() => updateDesign("textColor", c)} />)}</div></label>
            <label>Taille du texte · {design.textSize || 32}px<input type="range" min="16" max="64" step="2" value={design.textSize || 32} onChange={e => updateDesign("textSize", Number(e.target.value))} /></label>
            <div className="story-control-grid"><label>Alignement<select value={design.textAlign || "center"} onChange={e => updateDesign("textAlign", e.target.value as StoryDesign["textAlign"])}><option value="left">À gauche</option><option value="center">Centré</option><option value="right">À droite</option></select></label><label>Style du texte<select value={design.textBold === false ? "normal" : "bold"} onChange={e => updateDesign("textBold", e.target.value === "bold")}><option value="bold">Gras</option><option value="normal">Fin</option></select></label></div>
            <div className="story-style-toggles"><label><input type="checkbox" checked={!!design.textPlate} onChange={e => updateDesign("textPlate", e.target.checked)} /> Fond derrière le texte</label><label><input type="checkbox" checked={design.textShadow !== false} onChange={e => updateDesign("textShadow", e.target.checked)} /> Ombre lumineuse</label></div>
            <label>Ambiance du fond <div className="story-background-grid">{backgrounds.map(bg => <button type="button" key={bg.name} className={"story-background-swatch" + (design.background === bg.value ? " active" : "")} style={{ background: bg.value }} onClick={() => updateDesign("background", bg.value)}>{bg.name}</button>)}</div></label>
            <label>Couleur unie personnalisée <div className="story-custom-background"><input type="color" aria-label="Choisir une couleur de fond" value={/^#[0-9a-fA-F]{6}$/.test(design.background) ? design.background : "#151338"} onChange={e => updateDesign("background", e.target.value)} /><span>{/^#[0-9a-fA-F]{6}$/.test(design.background) ? "Fond personnalisé actif" : "Choisis ta propre couleur"}</span><button type="button" onClick={() => updateDesign("background", backgrounds[0].value)}>Réinitialiser</button></div></label>
            <label>Filtre photo <select value={design.filter} onChange={e => updateDesign("filter", e.target.value)}><option value="none">Naturel</option><option value="vivid">Vibrant</option><option value="mono">Noir et blanc</option><option value="warm">Chaud</option><option value="dream">Rêve violet</option></select></label>
            <label>Stickers <div className="story-sticker-grid">{stickerChoices.map(sticker => <button type="button" key={sticker} className={design.stickers.includes(sticker) ? "active" : ""} onClick={() => updateDesign("stickers", design.stickers.includes(sticker) ? design.stickers.filter(s => s !== sticker) : [...design.stickers, sticker].slice(0, 8))}>{sticker}</button>)}</div></label>
            <div className="story-music-fields"><span className="story-field-title">♫ Carte musicale (facultatif)</span><label>Titre<input value={design.musicTitle} onChange={e => updateDesign("musicTitle", e.target.value.slice(0, 80))} placeholder="Titre du morceau" /></label><label>Artiste<input value={design.musicArtist} onChange={e => updateDesign("musicArtist", e.target.value.slice(0, 80))} placeholder="Nom de l’artiste" /></label><label>Lien d’écoute<input type="url" value={design.musicUrl} onChange={e => updateDesign("musicUrl", e.target.value.slice(0, 300))} placeholder="YouTube, Spotify ou SoundCloud" /><small className="story-music-help">Les liens compatibles affichent un lecteur intégré dans la story. Les autres restent ouvrables à l’extérieur.</small></label></div>
            <label>Légende <input value={design.caption} onChange={e => updateDesign("caption", e.target.value.slice(0, 300))} maxLength={300} placeholder="Une légende pour ta story…" /></label>
            <div className="story-editor-actions"><button type="button" className="story-reset" onClick={() => { setDesign(emptyDesign()); setSelectedFile(null); }}>Réinitialiser</button><button type="button" className="button primary" onClick={() => void addStory()} disabled={uploading}>{uploading ? "Publication…" : "Publier la story ↗"}</button></div>
            <p className="stories-hint">Photos et vidéos jusqu’à 10 Mo. Les stories disparaissent après 24 h.</p>
          </div>
        </div>
      </div>}
    </section>
    {currentStory && currentGroup && <div className="story-viewer-backdrop" role="dialog" aria-modal="true" aria-label={"Story de " + currentGroup.name} onClick={() => setViewer(null)}>
      <div className="story-viewer" onClick={e => e.stopPropagation()}>
        <div className="story-progress"><span style={{ width: ((viewer!.item + 1) / currentGroup.stories.length * 100) + "%" }} /></div>
        <div className="story-viewer-head">
          <div className="story-viewer-author">{currentGroup.avatar ? <img src={currentGroup.avatar} alt="" /> : <b>{currentGroup.name.slice(0,1).toUpperCase()}</b>}<span>{currentGroup.name}<small>{new Date(currentStory.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span></div>
          {currentStory.user_id === userId && <button onClick={() => void deleteStory(currentStory)}>Supprimer</button>}
          <button aria-label="Fermer la story" onClick={() => setViewer(null)}>✕</button>
        </div>
        {currentStory.media_type === "video" ? <video className="story-media" style={{ filter: filterValue(currentStory.design?.filter) }} src={currentStory.mediaUrl} controls autoPlay playsInline /> : <img className="story-media" style={{ filter: filterValue(currentStory.design?.filter) }} src={currentStory.mediaUrl} alt={currentStory.caption || "Story"} />}
        {currentStory.design && <div className={"story-design-overlay pos-" + currentStory.design.position}>
          {currentStory.design.stickers.length > 0 && <div className="story-design-stickers">{currentStory.design.stickers.join(" ")}</div>}
          {currentStory.design.text && <div className="story-design-text" style={{ color: currentStory.design.textColor, fontFamily: currentStory.design.font, fontSize: `clamp(12px, ${currentStory.design.textSize || 32}px, 64px)`, textAlign: currentStory.design.textAlign || "center", fontWeight: currentStory.design.textBold === false ? 400 : 700, background: currentStory.design.textPlate ? "linear-gradient(110deg,#08091ae8,#171536e8)" : "transparent", padding: currentStory.design.textPlate ? "10px 14px" : "0", border: currentStory.design.textPlate ? "1px solid #45efff55" : "0", borderRadius: currentStory.design.textPlate ? "8px" : "0", textShadow: currentStory.design.textShadow === false ? "none" : undefined }}>{currentStory.design.text}</div>}
        </div>}
        {currentStory.design && (currentStory.design.musicTitle || currentStory.design.musicArtist || currentStory.design.musicUrl) && <div className="story-viewer-music">{currentStory.design.musicUrl ? <>{musicEmbedUrl(currentStory.design.musicUrl) ? <button type="button" className="story-music-link" onClick={() => setActiveMusicStoryId(activeMusicStoryId === currentStory.id ? null : currentStory.id)} aria-expanded={activeMusicStoryId === currentStory.id}><span className="story-music-note">♫</span><span className="story-music-copy"><strong>{currentStory.design.musicTitle || "Écouter le morceau"}</strong><small>{currentStory.design.musicArtist || musicEmbedUrl(currentStory.design.musicUrl)!.provider}</small></span><span className="story-music-play">{activeMusicStoryId === currentStory.id ? "MASQUER ×" : "▶ LIRE ICI"}</span></button> : <a className="story-music-link" href={currentStory.design.musicUrl} target="_blank" rel="noopener noreferrer"><span className="story-music-note">♫</span><span className="story-music-copy"><strong>{currentStory.design.musicTitle || "Écouter le morceau"}</strong><small>{currentStory.design.musicArtist || "Musique"}</small></span><span className="story-music-play">OUVRIR ↗</span></a>}{activeMusicStoryId === currentStory.id && musicEmbedUrl(currentStory.design.musicUrl) && <iframe className="story-music-embed" src={musicEmbedUrl(currentStory.design.musicUrl)!.src + (musicEmbedUrl(currentStory.design.musicUrl)!.src.includes("?") ? "&" : "?") + "autoplay=1"} title={"Écouter " + (currentStory.design.musicTitle || "le morceau")} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share" loading="eager" referrerPolicy="strict-origin-when-cross-origin" />}</> : <small>Ajoute un lien YouTube, Spotify ou SoundCloud pour écouter le morceau.</small>}</div>}
        {currentStory.caption && <p className="story-viewer-caption">{currentStory.caption}</p>}
        <button className="story-nav story-prev" onClick={() => moveStory(-1)} aria-label="Story précédente">‹</button>
        <button className="story-nav story-next" onClick={() => moveStory(1)} aria-label="Story suivante">›</button>
      </div>
    </div>}
  </>;
}

function filterValue(filter?: string) {
  if (filter === "vivid") return "saturate(1.65) contrast(1.08)";
  if (filter === "mono") return "grayscale(1)";
  if (filter === "warm") return "sepia(.3) saturate(1.25)";
  if (filter === "dream") return "hue-rotate(18deg) saturate(1.4) brightness(1.08)";
  return "none";
}
