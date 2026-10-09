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
      {videoIds.map((id, index) => (
        <section className="prysm-video-overlay" key={id} aria-label="Vidéo YouTube intégrée dans le message">
          <div className="prysm-video-overlay__header">
            <span className="prysm-video-overlay__mark" aria-hidden="true">◇</span>
            <span className="prysm-video-overlay__station">PRYSM <i>TV</i> <b>/</b> CANAL {String(index + 1).padStart(2, "0")}</span>
            <span className="prysm-video-overlay__live"><span /> ON AIR</span>
          </div>
          <div className="prysm-video-overlay__screen">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title="Vidéo YouTube intégrée dans PRYSM TV"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <div className="prysm-video-overlay__bug" aria-hidden="true"><b>PRYSM</b><span>TV</span></div>
            <div className="prysm-video-overlay__signal" aria-hidden="true">SIGNAL REÇU <span>◆ ◆ ◆</span></div>
          </div>
          <div className="prysm-video-overlay__lower-third">
            <span className="prysm-video-overlay__lower-mark">P</span>
            <div><small>TRANSMISSION EXTERNE</small><strong>LE FLUX ENTRE DANS LE PRISME</strong></div>
            <span className="prysm-video-overlay__tag">YT / {id.slice(0, 4).toUpperCase()}</span>
          </div>
          <div className="prysm-video-overlay__footer"><span>PRYSM BROADCAST SYSTEM</span><span>◆ IMAGE &amp; SON</span></div>
        </section>
      ))}
    </div>
  );
}
