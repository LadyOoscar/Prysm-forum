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
        <section className="prysm-video-overlay" key={id} aria-label="Vidéo YouTube intégrée dans le message">
          <div className="prysm-video-overlay__header">
            <span className="prysm-video-overlay__mark" aria-hidden="true">◇</span>
            <span>PRYSM <i> / </i> SIGNAL VIDÉO</span>
            <span className="prysm-video-overlay__live">LECTURE</span>
          </div>
          <div className="prysm-video-overlay__screen">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title="Vidéo YouTube intégrée dans PRYSM"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="prysm-video-overlay__footer"><span>FLUX EXTERNE</span><span>◆ PRYSM MEDIA INTERFACE</span></div>
        </section>
      ))}
    </div>
  );
}
