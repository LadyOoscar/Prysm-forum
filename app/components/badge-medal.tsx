"use client";

import type { CSSProperties } from "react";

export type BadgeVisual = {
  name?: string | null;
  icon?: string | null;
  tone?: "positive" | "negative" | "neutral" | null;
  background_color?: string | null;
  border_color?: string | null;
  border_width?: number | null;
  glow_intensity?: number | null;
  image_zoom?: number | null;
  image_position_x?: number | null;
  image_position_y?: number | null;
};

export default function BadgeMedal({ badge, size = "small", onImageError }: {
  badge: BadgeVisual;
  size?: "small" | "medium" | "large";
  onImageError?: () => void;
}) {
  const style = {
    "--medal-fill": badge.background_color || "#171b43",
    "--medal-edge": badge.border_color || (badge.tone === "negative" ? "#ff5b8d" : badge.tone === "positive" ? "#c9ff58" : "#45efff"),
    "--medal-edge-width": Math.max(0, Math.min(8, badge.border_width ?? 2)) + "px",
    "--medal-glow": Math.max(0, Math.min(100, badge.glow_intensity ?? 25)) / 7 + "px",
    "--medal-zoom": Math.max(100, Math.min(200, badge.image_zoom ?? 100)) / 100,
    "--medal-x": (badge.image_position_x ?? 50) + "%",
    "--medal-y": (badge.image_position_y ?? 50) + "%",
  } as CSSProperties;
  const icon = badge.icon || "🏷️";
  const isImage = /^https?:\/\//i.test(icon);
  return (
    <span className={"badge-medal badge-medal-" + size + " tone-" + (badge.tone || "neutral")} style={style} title={badge.name || "Badge"}>
      {isImage ? <img src={icon} alt={badge.name || "Badge"} onError={onImageError} /> : <span className="badge-medal-emoji" aria-hidden="true">{icon}</span>}
    </span>
  );
}
