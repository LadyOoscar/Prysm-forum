"use client";

import Link from "next/link";

export default function BlahajBuddy() {
  return (
    <Link className="blahaj-buddy" href="/forum" aria-label="Blåhaj Girl, mascotte de PRYSM. Ouvrir le forum">
      <span className="blahaj-buddy-art" aria-hidden="true">
        <img src="/prysm-mascot-wallpaper.svg" alt="" />
      </span>
      <span className="blahaj-buddy-label">
        <strong>Blåhaj Girl</strong>
        <small>Gardienne du forum</small>
      </span>
    </Link>
  );
}
