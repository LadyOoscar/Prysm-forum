"use client";

import { StickerText } from "../../components/sticker-picker";

function extractYouTubeIds(text: string): string[] {
  const ids: string[] = [];
  const pattern = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/gi;
  for (const match of text.matchAll(pattern)) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

export default function RichPostBody({ text }: { text: string }) {
  const videoIds = extractYouTubeIds(text);
  return (
    <div className="rich-post-body">
      <p><StickerText text={text} /></p>
      {videoIds.map((id) => (
        <div className="youtube-embed" key={id} style={{ width: "100%", maxWidth: "800px", aspectRatio: "16 / 9", marginTop: "12px" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="Vidéo YouTube intégrée"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0, borderRadius: "12px" }}
          />
        </div>
      ))}
    </div>
  );
}
