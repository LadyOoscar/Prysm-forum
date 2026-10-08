"use client";

import { useState } from "react";

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

export function stickerToken(key: string) {
  return `[[sticker:${key}]]`;
}

export function renderStickerText(text: string) {
  const parts = text.split(/(\[\[sticker:[a-z]+\]\])/g);
  return parts.map((part, index) => {
    const match = part.match(/^\[\[sticker:([a-z]+)\]\]$/);
    if (!match) return <span key={index}>{part}</span>;
    const sticker = STICKERS.find((item) => item.key === match[1]);
    return sticker ? <span className="inline-sticker" title={sticker.label} aria-label={sticker.label} key={index}>{sticker.emoji}</span> : <span key={index}>{part}</span>;
  });
}

export default function StickerPicker({ onPick }: { onPick: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticker-picker">
      <button className="sticker-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        😊 Stickers
      </button>
      {open && (
        <div className="sticker-panel" role="dialog" aria-label="Stickers PRYSM">
          <div className="sticker-panel-head">
            <strong>Stickers PRYSM</strong>
            <span>{STICKERS.length} disponibles</span>
          </div>
          <div className="sticker-grid">
            {STICKERS.map((sticker) => (
              <button key={sticker.key} type="button" className="sticker-card" onClick={() => onPick(stickerToken(sticker.key))} title={sticker.label}>
                <span>{sticker.emoji}</span>
                <small>{sticker.label}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
