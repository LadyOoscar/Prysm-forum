"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

export const STICKERS = [
  { key: "love", label: "Cœur", emoji: "💖" },
  { key: "spark", label: "Éclat", emoji: "✨" },
  { key: "laugh", label: "Rire", emoji: "🤣" },
  { key: "cry", label: "Larmes", emoji: "😭" },
  { key: "rage", label: "Rage", emoji: "😡" },
  { key: "wow", label: "Wow", emoji: "🤯" },
  { key: "shy", label: "Gênée", emoji: "👉👈" },
  { key: "hmm", label: "Hmm", emoji: "🤨" },
  { key: "dead", label: "KO", emoji: "💀" },
  { key: "pray", label: "Prière", emoji: "🙏" },
  { key: "party", label: "Fête", emoji: "🥳" },
  { key: "cat", label: "Chat", emoji: "😺" },
] as const;

export type CustomSticker = { id: string; name: string; image_url: string; category: string; tags?: string[] };

export function stickerToken(key: string) {
  return `[[sticker:${key}]]`;
}

export function renderStickerText(text: string) {
  const parts = text.split(/(\[\[sticker:[a-z0-9-]+\]\])/gi);
  return parts.map((part, index) => {
    const match = part.match(/^\[\[sticker:([a-z0-9-]+)\]\]$/i);
    if (!match) return <span key={index}>{part}</span>;
    const sticker = STICKERS.find((item) => item.key === match[1]);
    return sticker ? <span className="inline-sticker" title={sticker.label} aria-label={sticker.label} key={index}>{sticker.emoji}</span> : <span key={index}>{part}</span>;
  });
}

export function StickerText({ text }: { text: string }) {
  const supabase = createSupabaseBrowser();
  const [custom, setCustom] = useState<Record<string, CustomSticker>>({});
  useEffect(() => {
    const ids = [...new Set([...text.matchAll(/\[\[sticker:([a-z0-9-]+)\]\]/gi)].map(m => m[1]).filter(id => id.includes("-")))];
    if (!ids.length) return;
    let active = true;
    void supabase.from("stickers").select("id,name,image_url,category").in("id", ids).eq("status", "approved").then(({ data }) => {
      if (!active) return;
      const map: Record<string, CustomSticker> = {};
      for (const item of (data ?? []) as CustomSticker[]) map[item.id] = item;
      setCustom(map);
    });
    return () => { active = false; };
  }, [text]);

  const parts = text.split(/(\[\[sticker:[a-z0-9-]+\]\])/gi);
  return parts.map((part, index) => {
    const match = part.match(/^\[\[sticker:([a-z0-9-]+)\]\]$/i);
    if (!match) return <span key={index}>{part}</span>;
    const staticSticker = STICKERS.find(item => item.key === match[1]);
    const customSticker = custom[match[1]];
    if (customSticker) return <img className="inline-sticker-image" key={index} src={customSticker.image_url} alt={customSticker.name} title={customSticker.name} />;
    return staticSticker ? <span className="inline-sticker" title={staticSticker.label} aria-label={staticSticker.label} key={index}>{staticSticker.emoji}</span> : <span key={index}>{part}</span>;
  });
}

export default function StickerPicker({ onPick }: { onPick: (token: string) => void }) {
  const supabase = createSupabaseBrowser();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<CustomSticker[]>([]);
  useEffect(() => {
    void supabase.from("stickers").select("id,name,image_url,category").eq("status", "approved").order("created_at", { ascending: false }).limit(24).then(({ data }) => setCustom((data ?? []) as CustomSticker[]));
  }, []);
  const total = STICKERS.length + custom.length;
  return (
    <div className="sticker-picker">
      <button className="sticker-toggle" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}>😊 Stickers</button>
      {open && (
        <div className="sticker-panel" role="dialog" aria-label="Stickers PRYSM">
          <div className="sticker-panel-head"><strong>Stickers PRYSM</strong><span>{total} disponibles</span></div>
          <div className="sticker-grid">
            {!search.trim() && STICKERS.map(sticker => <button key={sticker.key} type="button" className="sticker-card" onClick={() => { onPick(stickerToken(sticker.key)); setOpen(false); }} title={sticker.label}><span>{sticker.emoji}</span><small>{sticker.label}</small></button>)}
            {filtered.map(sticker => <button key={sticker.id} type="button" className="sticker-card custom" onClick={() => { onPick(stickerToken(sticker.id)); setOpen(false); }} title={sticker.name}><img src={sticker.image_url} alt={sticker.name} /><small>{sticker.name}</small></button>)}
          </div>
          <a className="sticker-create-link" href="/stickers">＋ Créer mon sticker</a>
        </div>
      )}
    </div>
  );
}
