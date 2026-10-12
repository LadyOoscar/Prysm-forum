"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Banner = { image_url: string; alt_text: string; width_px: number; height_px: number; mobile_visible: boolean; desktop_visible: boolean };

export default function SiteBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  useEffect(() => {
    let active = true;
    const db = createSupabaseBrowser();
    void db.from("site_decorations")
      .select("image_url,alt_text,width_px,height_px,mobile_visible,desktop_visible")
      .eq("slot", "banner-accueil").eq("enabled", true).maybeSingle()
      .then(({ data }) => { if (active) setBanner(data as Banner | null); });
    return () => { active = false; };
  }, []);
  if (!banner) return null;
  return <div className={"site-home-banner" + (banner.mobile_visible ? "" : " site-decoration-hide-mobile") + (banner.desktop_visible ? "" : " site-decoration-hide-desktop")} aria-label={banner.alt_text || "Bannière décorative PRYSM"}>
    <img src={banner.image_url} alt={banner.alt_text || ""} style={{ maxWidth: Math.min(banner.width_px, 1180), maxHeight: banner.height_px }} />
  </div>;
}
