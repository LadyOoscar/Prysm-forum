import React from "react";

export const PRIDE_FLAGS = [
  { id: "ally", label: "Allié·e LGBTQIA+", colors: ["#000000","#A3A3A3","#FFFFFF","#008026","#004DFF","#750787"] },
  { id: "gay", label: "Gay / arc-en-ciel", colors: ["#E40303","#FF8C00","#FFED00","#008026","#004DFF","#750787"] },
  { id: "lesbian", label: "Lesbienne", colors: ["#D52D00","#EF7627","#FF9A56","#FFFFFF","#D162A4","#B55690","#A30262"] },
  { id: "trans-mtf", label: "Trans MTF", colors: ["#F9B4D0","#FFFFFF","#B97FC9","#FFFFFF","#F9B4D0"] },
  { id: "trans-ftm", label: "Trans FTM", colors: ["#F9B4D0","#9DD7EA","#FFFFFF","#9DD7EA","#F9B4D0"] },
  { id: "bisexual", label: "Bisexuel·le", colors: ["#D60270","#D60270","#9B4F96","#0038A8","#0038A8"] },
  { id: "agender", label: "Agenre", colors: ["#000000","#B9B9B9","#FFFFFF","#B8F483","#FFFFFF","#B9B9B9","#000000"] },
  { id: "nonbinary", label: "Non-binaire", colors: ["#FFF430","#FFFFFF","#9C59D1","#2D2D2D"] },
  { id: "drag", label: "Drag", colors: ["#69C9F9","#F5A9B8","#FFFFFF","#F5A9B8","#69C9F9"] },
  { id: "bear", label: "Bear", colors: ["#623804","#B77B36","#F5C879","#F5E4C3","#FFFFFF","#A6A6A6","#292929"] },
  { id: "twink", label: "Twink", colors: ["#F7A8C8","#FFFFFF","#8CD7F5","#FFFFFF","#F7A8C8"] },
  { id: "pansexual", label: "Pansexuel·le", colors: ["#FF218C","#FFD800","#21B1FF"] },
  { id: "intersex", label: "Intersexe", colors: ["#FFD800","#FFD800","#FFD800"], symbol: "circle" },
  { id: "aromantic", label: "Aromantique", colors: ["#3DA542","#A7D379","#FFFFFF","#A9A9A9","#000000"] },
  { id: "sapio", label: "Sapiosexuel·le", colors: ["#147D46","#FFFFFF","#7D7D7D","#FFFFFF","#147D46"] },
] as const;

export type PrideFlagId = typeof PRIDE_FLAGS[number]["id"];

export function PrideFlag({ id, size = "small" }: { id: string; size?: "small" | "medium" }) {
  const flag = PRIDE_FLAGS.find((item) => item.id === id);
  if (!flag) return null;
  const width = size === "small" ? 22 : 30;
  const height = size === "small" ? 15 : 20;
  return (
    <svg className="pride-flag" width={width} height={height} viewBox="0 0 30 20" role="img" aria-label={flag.label} focusable="false">
      <title>{flag.label}</title>
      {flag.colors.map((color, index) => <rect key={color + index} x="0" y={(20 / flag.colors.length) * index} width="30" height={20 / flag.colors.length + 0.15} fill={color} />)}
      {"symbol" in flag && flag.symbol === "circle" && <circle cx="15" cy="10" r="5.3" fill="none" stroke="#7B00A8" strokeWidth="2.1" />}
      <rect x=".35" y=".35" width="29.3" height="19.3" fill="none" stroke="rgba(0,0,0,.28)" strokeWidth=".7" rx="1.3" />
    </svg>
  );
}

export function PrideFlagList({ flags, size = "small" }: { flags?: string[] | null; size?: "small" | "medium" }) {
  const selected = PRIDE_FLAGS.filter((flag) => (flags || []).includes(flag.id));
  if (!selected.length) return null;
  return <span className="pride-flag-list" aria-label={"Communautés : " + selected.map((flag) => flag.label).join(", ")}>
    {selected.map((flag) => <PrideFlag key={flag.id} id={flag.id} size={size} />)}
  </span>;
}
