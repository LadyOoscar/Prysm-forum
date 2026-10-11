import React from "react";

export const PRIDE_FLAGS = [
  { id: "lesbian", label: "Lesbienne", colors: ["#D52D00","#EF7627","#FF9A56","#FFFFFF","#D162A4","#B55690","#A30262"] },
  { id: "gay", label: "Gay / arc-en-ciel", colors: ["#E40303","#FF8C00","#FFED00","#008026","#004DFF","#750787"] },
  { id: "bisexual", label: "Bisexuelle", colors: ["#D60270","#D60270","#9B4F96","#0038A8","#0038A8"] },
  { id: "transgender", label: "Transgenre", colors: ["#5BCEFA","#F5A9B8","#FFFFFF","#F5A9B8","#5BCEFA"] },
  { id: "nonbinary", label: "Non-binaire", colors: ["#FFF430","#FFFFFF","#9C59D1","#2D2D2D"] },
  { id: "pansexual", label: "Pansexuelle", colors: ["#FF218C","#FFD800","#21B1FF"] },
  { id: "asexual", label: "Asexuelle", colors: ["#000000","#A3A3A3","#FFFFFF","#800080"] },
  { id: "aromantic", label: "Aromantique", colors: ["#3DA542","#A7D379","#FFFFFF","#A9A9A9","#000000"] },
  { id: "agender", label: "Agenre", colors: ["#000000","#B9B9B9","#FFFFFF","#B8F483","#FFFFFF","#B9B9B9","#000000"] },
  { id: "genderfluid", label: "Genderfluid", colors: ["#FF75A2","#FFFFFF","#BE18D6","#000000","#333EBD"] },
  { id: "genderqueer", label: "Genderqueer", colors: ["#B57EDC","#FFFFFF","#4A8123"] },
  { id: "intersex", label: "Intersexe", colors: ["#FFD800","#FFD800","#FFD800"] , symbol: "circle" },
  { id: "queer", label: "Queer", colors: ["#B57EDC","#FFFFFF","#4A8123"] },
  { id: "demisexual", label: "Demi-sexuelle", colors: ["#000000","#FFFFFF","#6E0070","#D2D2D2"] },
  { id: "demiromantic", label: "Demiromantique", colors: ["#3DA542","#FFFFFF","#000000","#D2D2D2"] },
  { id: "polysexual", label: "Polysexuelle", colors: ["#F714BA","#01D66A","#1594F6"] },
  { id: "omnisexual", label: "Omnisexuelle", colors: ["#FF9B55","#FF538D","#FFFFFF","#5238FF","#2000A8"] },
  { id: "polyamorous", label: "Polyamoureuse", colors: ["#0000FF","#FF0000","#000000"] },
  { id: "bigender", label: "Bigender", colors: ["#C479A2","#EDA5CD","#FFFFFF","#D6C7E8","#A3A3A3"] },
  { id: "demigirl", label: "Demi-fille", colors: ["#7F7F7F","#C4C4C4","#FFACCC","#FFFFFF","#FFACCC"] },
  { id: "demiboy", label: "Demi-garçon", colors: ["#7F7F7F","#C4C4C4","#9AD9EB","#FFFFFF","#9AD9EB"] },
  { id: "neutrois", label: "Neutrois", colors: ["#FFFFFF","#2F2F2F","#D0FF00"] },
  { id: "lesbian-sunset", label: "Lesbienne, version coucher de soleil", colors: ["#D62900","#FF9B55","#FFFFFF","#D461A6","#A50062"] },
  { id: "questioning", label: "En questionnement", colors: ["#760088","#FFFFFF","#008026"] },
  { id: "ally", label: "Allié·e LGBTQIA+", colors: ["#000000","#A3A3A3","#FFFFFF","#008026","#004DFF","#750787"] },
  { id: "mlm", label: "Hommes qui aiment les hommes", colors: ["#078D70","#26CEAA","#98E8C1","#FFFFFF","#7BADE2","#5049CC","#3D1A78"] },
  { id: "sapphic", label: "Saphique", colors: ["#FD8BA8","#F9A9C5","#FFFFFF","#D7B6E5","#A66BC5"] },
  { id: "achillean", label: "Achilléen", colors: ["#078D70","#26CEAA","#FFFFFF","#7BADE2","#5049CC"] },
  { id: "abrosexual", label: "Abrosexuelle", colors: ["#75D9B3","#FFFFFF","#B56EDB","#FFFFFF","#75D9B3"] },
  { id: "androsexual", label: "Androsexuelle", colors: ["#FFB6D9","#FFFFFF","#B8B8B8","#FFFFFF","#9B59D0"] },
  { id: "gynesexual", label: "Gynesexuelle", colors: ["#FFB6D9","#FFFFFF","#B8B8B8","#FFFFFF","#9B59D0"] },
  { id: "transfeminine", label: "Transféminine", colors: ["#F9B4D0","#FFFFFF","#B97FC9","#FFFFFF","#F9B4D0"] },
  { id: "transmasculine", label: "Transmasculin", colors: ["#F9B4D0","#9DD7EA","#FFFFFF","#9DD7EA","#F9B4D0"] },
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
