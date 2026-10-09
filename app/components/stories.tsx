"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Story = {
  id: string;
  user_id: string;
  media_path: string;
  media_type: "image" | "video";
  caption: string;
  created_at: string;
  expires_at: string;
  profiles: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
  mediaUrl: string;
};

type StoryGroup = { userId: string; name: string; avatar: string | null; stories: Story[] };

const MAX_SIZE = 10 * 1024 * 1024;

export default function Stories() {
  const supabase = createSupabaseBrowser();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewer, setViewer] = useState<{ group: number; item: number } | null>(null);

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
      return { ...row, profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles, mediaUrl: signed?.signedUrl ?? "" } as Story;
    }));
    const grouped = new Map<string, StoryGroup>();
    for (const story of withUrls.filter((s: Story) => s.mediaUrl)) {
      const profile = story.profiles;
      const name = profile?.display_name || profile?.username || "Membre";
      if (!grouped.has(story.user_id)) grouped.set(story.user_id, { userId: story.user_id, name, avatar: profile?.avatar_url ?? null, stories: [] });
      grouped.get(story.user_id)!.stories.push(story);
    }
    setGroups(Array.from(grouped.values()).sort((a, b) => {
      const aDate = a.stories[a.stories.length - 1]?.created_at ?? "";
      const bDate = b.stories[b.stories.length - 1]?.created_at ?? "";
      return bDate.localeCompare(aDate);
    }));
  }, [supabase]);

  useEffect(() => { void loadStories(); }, [loadStories]);

  async function addStory(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setNotice("");
    if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(file.type)) {
      setNotice("Format accepté : JPG, PNG, WebP, MP4 ou WebM."); return;
    }
    if (file.size > MAX_SIZE) { setNotice("Le fichier ne doit pas dépasser 10 Mo."); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = "/auth"; return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || (file.type.startsWith("video/") ? "mp4" : "jpg");
    const path = auth.user.id + "/" + Date.now() + "." + ext;
    const { error: uploadError } = await supabase.storage.from("prysm-stories").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setNotice("Envoi impossible. Réessaie avec une image ou une vidéo plus légère."); setUploading(false); return;
    }
    const { error: insertError } = await supabase.from("stories").insert({
      user_id: auth.user.id, media_path: path, media_type: file.type.startsWith("video/") ? "video" : "image",
      caption: caption.trim(), expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    if (insertError) {
      await supabase.storage.from("prysm-stories").remove([path]);
      setNotice("Le média a été envoyé, mais la story n’a pas pu être publiée.");
    } else {
      setCaption(""); setNotice("Story publiée ! Elle disparaîtra dans 24 heures."); await loadStories();
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
        <label className="story-bubble story-add">
          <span className="story-avatar story-add-avatar"><b>{uploading ? "…" : "+"}</b></span><span>{uploading ? "Envoi…" : "Ma story"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={addStory} disabled={uploading} />
        </label>
        {groups.map((group, index) => <button className="story-bubble" key={group.userId} onClick={() => setViewer({ group: index, item: 0 })}>
          <span className={"story-avatar" + (group.stories.every(s => s.user_id === userId) ? " own-story" : "")}>
            {group.avatar ? <img src={group.avatar} alt="" /> : <b>{group.name.slice(0, 1).toUpperCase()}</b>}
          </span><span>{group.userId === userId ? "Vous" : group.name}</span>
        </button>)}
      </div>
      {notice && <p className="stories-notice" role="status">{notice}</p>}
      <div className="story-caption-row"><input value={caption} onChange={e => setCaption(e.target.value.slice(0, 300))} placeholder="Une petite légende pour ta prochaine story…" maxLength={300} aria-label="Légende de la prochaine story" /><span>{caption.length}/300</span></div>
      <p className="stories-hint">Choisis une image ou une vidéo pour publier. Les stories sont visibles par les membres connectés et expirent automatiquement après 24 h.</p>
    </section>
    {currentStory && currentGroup && <div className="story-viewer-backdrop" role="dialog" aria-modal="true" aria-label={"Story de " + currentGroup.name} onClick={() => setViewer(null)}>
      <div className="story-viewer" onClick={e => e.stopPropagation()}>
        <div className="story-progress"><span style={{ width: ((viewer!.item + 1) / currentGroup.stories.length * 100) + "%" }} /></div>
        <div className="story-viewer-head">
          <div className="story-viewer-author">{currentGroup.avatar ? <img src={currentGroup.avatar} alt="" /> : <b>{currentGroup.name.slice(0,1).toUpperCase()}</b>}<span>{currentGroup.name}<small>{new Date(currentStory.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span></div>
          {currentStory.user_id === userId && <button onClick={() => void deleteStory(currentStory)}>Supprimer</button>}
          <button aria-label="Fermer la story" onClick={() => setViewer(null)}>✕</button>
        </div>
        {currentStory.media_type === "video" ? <video className="story-media" src={currentStory.mediaUrl} controls autoPlay playsInline /> : <img className="story-media" src={currentStory.mediaUrl} alt={currentStory.caption || "Story"} />}
        {currentStory.caption && <p className="story-viewer-caption">{currentStory.caption}</p>}
        <button className="story-nav story-prev" onClick={() => moveStory(-1)} aria-label="Story précédente">‹</button>
        <button className="story-nav story-next" onClick={() => moveStory(1)} aria-label="Story suivante">›</button>
      </div>
    </div>}
  </>;
}
