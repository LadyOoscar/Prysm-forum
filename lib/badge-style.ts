import type { CSSProperties } from "react";

type BadgeFrameOptions = {
  background_color?: string | null;
  border_color?: string | null;
  border_width?: number | null;
  glow_intensity?: number | null;
  image_zoom?: number | null;
  image_position_x?: number | null;
  image_position_y?: number | null;
};

export function getBadgeFrameStyle(badge: BadgeFrameOptions): CSSProperties {
  const borderColor = badge.border_color || "#45efff";
  const glow = badge.glow_intensity ?? 25;
  return {
    backgroundColor: borderColor,
    boxShadow: glow ? "0 0 " + (glow / 7).toFixed(1) + "px " + borderColor + "80" : "none",
    "--badge-fill": badge.background_color || "#171b43",
    "--badge-border-width": (badge.border_width ?? 2) + "px",
    "--badge-zoom": (badge.image_zoom ?? 100) / 100,
    "--badge-position-x": (badge.image_position_x ?? 50) + "%",
    "--badge-position-y": (badge.image_position_y ?? 50) + "%",
  } as CSSProperties;
}
