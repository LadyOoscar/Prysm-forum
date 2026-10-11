"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Decoration = {
  slot: string;
  image_url: string;
  alt_text: string;
  width_px: number;
  height_px: number;
  alignment: "before" | "after";
  mobile_visible: boolean;
  desktop_visible: boolean;
};

export default function SiteDecoration({ slot, children }: { slot: string; children: React.ReactNode }) {
  const [decoration, setDecoration] = useState<Decoration | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowser();
    void supabase.from("site_decorations")
      .select("slot,image_url,alt_text,width_px,height_px,alignment,mobile_visible,desktop_visible")
      .eq("slot", slot).eq("enabled", true).maybeSingle()
      .then(({ data }) => { if (active) setDecoration(data as Decoration | null); });
    return () => { active = false; };
  }, [slot]);

  const image = decoration ? <img className={"site-decoration-image " + (decoration.mobile_visible ? "site-decoration-mobile" : "site-decoration-desktop-only") + (decoration.desktop_visible ? "" : " site-decoration-no-desktop")} src={decoration.image_url} alt={decoration.alt_text || ""} aria-hidden={!decoration.alt_text} style={{ width: decoration.width_px, height: decoration.height_px }} /> : null;
  return <>{decoration?.alignment === "before" && image}{children}{decoration?.alignment !== "before" && image}</>;
}
