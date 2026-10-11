import React from "react";

export const PRIDE_FLAGS = [
  { id: "ally", label: "Allié·e LGBTQIA+", colors: ["#000000","#FFFFFF","#000000","#FFFFFF","#000000","#FFFFFF","#000000"], symbol: "ally" },
  { id: "gay", label: "Gay / arc-en-ciel", colors: ["#E40303","#FF8C00","#FFED00","#008026","#004DFF","#750787"] },
  { id: "lesbian", label: "Lesbienne", colors: ["#D52D00","#EF7627","#FF9A56","#FFFFFF","#D162A4","#B55690","#A30262"] },
  // MTF uses the classic transgender flag; FTM uses the transmasculine flag.
  { id: "trans-mtf", label: "Trans MTF", colors: ["#5BCEFA","#F5A9B8","#FFFFFF","#F5A9B8","#5BCEFA"] },
  { id: "trans-ftm", label: "Trans FTM", colors: ["#FF8ABE","#CDF5FF","#9AEBFF","#74DFFF","#9AEBFF","#CDF5FF","#FF8ABE"] },
  { id: "bisexual", label: "Bisexuel·le", colors: ["#D60270","#9B4F96","#0038A8"] },
  { id: "agender", label: "Agenre", colors: ["#000000","#B9B9B9","#FFFFFF","#B8F483","#FFFFFF","#B9B9B9","#000000"] },
  { id: "nonbinary", label: "Non-binaire", colors: ["#FFF430","#FFFFFF","#9C59D1","#2D2D2D"] },
  { id: "drag", label: "Drag", colors: ["#7651A8","#FFFFFF","#5BCEFA","#FFFFFF","#7651A8"] },
  { id: "bear", label: "Bear", colors: ["#623804","#D56300","#FEDD63","#FEE6B8","#FFFFFF","#555555","#000000"], symbol: "bearpaw" },
  { id: "twink", label: "Twink", colors: ["#FFB0FF","#FFFFFF","#FFFACD"], symbol: "twink" },
  { id: "pansexual", label: "Pansexuel·le", colors: ["#FF218C","#FFD800","#21B1FF"] },
  { id: "intersex", label: "Intersexe", colors: ["#FFD800"], symbol: "intersex" },
  { id: "aromantic", label: "Aromantique", colors: ["#3DA542","#A7D379","#FFFFFF","#A9A9A9","#000000"] },
  { id: "genderfluid", label: "Genderfluid", colors: ["#FF76A4","#FFFFFF","#C011D7","#000000","#2F3CBE"] },
  { id: "asexual", label: "Asexuel·le", colors: ["#000000","#A4A4A4","#FFFFFF","#810081"] },
  { id: "demisexual", label: "Demi-sexuel·le", colors: ["#FFFFFF","#810081","#A4A4A4","#000000"], symbol: "demisexual" },
  { id: "leather", label: "Leather", colors: ["#000000","#2A2A7F","#000000","#2A2A7F","#FFFFFF","#2A2A7F","#000000","#2A2A7F","#000000"], symbol: "heart" },
  { id: "pup", label: "Pup / Puppy", colors: ["#21409A","#000000","#FFFFFF","#000000","#21409A"], symbol: "bone" },
  { id: "sapphic", label: "Saphique", colors: ["#D62900","#FF9A8A","#FFFFFF","#D36AB2","#A30262"], symbol: "flower" },
  { id: "polyamorous", label: "Polyamoureux·se", colors: ["#0000FF","#FF0000","#000000"], symbol: "pi" },
] as const;

export type PrideFlagId = typeof PRIDE_FLAGS[number]["id"];

export function PrideFlag({ id, size = "small" }: { id: string; size?: "small" | "medium" }) {
  const flag = PRIDE_FLAGS.find((item) => item.id === id);
  if (!flag) return null;
  const width = size === "small" ? 22 : 30;
  const height = size === "small" ? 15 : 20;
  const stripeHeight = 20 / flag.colors.length;
  const allyGradientId = `ally-rainbow-${React.useId().replace(/:/g, "")}`;
  return (
    <svg className="pride-flag" width={width} height={height} viewBox="0 0 30 20" role="img" aria-label={flag.label} focusable="false">
      <title>{flag.label}</title>
      {id === "pup" ? (
        <>
          <rect width="30" height="20" fill="#FFFFFF" />
          <path d="M0 0H9L30 14V20H21L0 6Z" fill="#21409A" />
          <path d="M0 0H4L30 17V20H26L0 3Z" fill="#000000" />
          <path d="M0 14L21 0H30V6L9 20H0Z" fill="#21409A" />
          <path d="M0 17L26 0H30V3L4 20H0Z" fill="#000000" />
          <path d="M11.5 8.1h2.1V6.5h2.8v1.6h2.1c.9 0 1.5.6 1.5 1.4v1.1c0 .8-.6 1.4-1.5 1.4h-2.1v1.6h-2.8v-1.6h-2.1c-.9 0-1.5-.6-1.5-1.4V9.5c0-.8.6-1.4 1.5-1.4Z" fill="#ED1C24" stroke="#FFFFFF" strokeWidth=".45" />
        </>
      ) : id === "demisexual" ? (
        <>
          <rect width="30" height="20" fill="#FFFFFF" />
          <path d="M0 0H30V7H0Z" fill="#FFFFFF" />
          <path d="M0 7H30V12H0Z" fill="#810081" />
          <path d="M0 12H30V20H0Z" fill="#A4A4A4" />
          <path d="M0 0L14 10L0 20Z" fill="#000000" />
        </>
      ) : id === "ally" ? (
        <>
          {[0,1,2,3,4,5,6].map((index) => <rect key={index} x={index * (30 / 7)} y="0" width={30 / 7 + .05} height="20" fill={index % 2 === 0 ? "#000000" : "#FFFFFF"} />)}
          <defs>
            <clipPath id={allyGradientId}>
              <path fillRule="evenodd" d="M3.5 19L11 1H19L26.5 19H19.5L17.8 14.7H12.2L10.5 19Z M13.2 11.2H16.8L15 6.7Z" />
            </clipPath>
          </defs>
          <path d="M3.5 19L11 1H19L26.5 19H19.5L17.8 14.7H12.2L10.5 19Z M13.2 11.2H16.8L15 6.7Z" fill="#000000" fillRule="evenodd" stroke="#000000" strokeWidth="2.4" strokeLinejoin="round" />
          <g clipPath={"url(#" + allyGradientId + ")"}>
            <rect x="3" y="0" width="4.5" height="20" fill="#E40303" />
            <rect x="7.5" y="0" width="4.5" height="20" fill="#FF8C00" />
            <rect x="12" y="0" width="3" height="20" fill="#FFED00" />
            <rect x="15" y="0" width="4.5" height="20" fill="#008026" />
            <rect x="19.5" y="0" width="4.5" height="20" fill="#004DFF" />
            <rect x="24" y="0" width="4" height="20" fill="#750787" />
          </g>
          <path d="M3.5 19L11 1H19L26.5 19H19.5L17.8 14.7H12.2L10.5 19Z M13.2 11.2H16.8L15 6.7Z" fill="none" fillRule="evenodd" stroke="#FFFFFF" strokeWidth=".55" strokeLinejoin="round" />
        </>      ) : (
        <>
          {flag.colors.map((color, index) => <rect key={color + index} x="0" y={stripeHeight * index} width="30" height={stripeHeight + 0.12} fill={color} />)}
          {"symbol" in flag && flag.symbol === "intersex" && <circle cx="15" cy="10" r="5.3" fill="none" stroke="#7B00A8" strokeWidth="2.1" />}
          {"symbol" in flag && flag.symbol === "heart" && <path d="M2 3.2C2.7 1.1 5.1.7 6.5 2.4C8 0.7 10.5 1.2 11.1 3.5C12 6.8 7.9 9.1 6.5 10.2C5 9 1 6.5 2 3.2Z" fill="#E70039" stroke="#FFFFFF" strokeWidth=".25" />}
          {"symbol" in flag && flag.symbol === "bearpaw" && <g fill="#000000"><ellipse cx="8.2" cy="5.2" rx="1.7" ry="2.2" transform="rotate(-24 8.2 5.2)"/><ellipse cx="12.1" cy="3.8" rx="1.7" ry="2.2" transform="rotate(-8 12.1 3.8)"/><ellipse cx="16.3" cy="4" rx="1.7" ry="2.2" transform="rotate(10 16.3 4)"/><ellipse cx="20.1" cy="5.8" rx="1.7" ry="2.2" transform="rotate(24 20.1 5.8)"/><path d="M7 12.1C7 9.2 10.2 7.3 14.1 7.6C18.2 7.8 21.4 10.2 21 13.2C20.7 16.1 17.5 17 13.8 16.6C10 16.3 7 15.2 7 12.1Z"/></g>}
          {"symbol" in flag && flag.symbol === "twink" && <g fill="none" stroke="#000000" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><circle cx="12.2" cy="10.5" r="3.5"/><circle cx="17.8" cy="10.5" r="3.5"/><path d="M14.5 8.2L18.6 3.8M15.8 3.8H18.6V6.6M20 8.2L24.1 3.8M21.3 3.8H24.1V6.6"/></g>}
          {"symbol" in flag && flag.symbol === "flower" && <g transform="translate(15 10)" fill="#7B2C91"><ellipse cy="-3" rx="1.6" ry="3"/><ellipse cy="3" rx="1.6" ry="3"/><ellipse cx="-3" rx="3" ry="1.6"/><ellipse cx="3" rx="3" ry="1.6"/><circle r="1.5" fill="#F5D442"/></g>}
          {"symbol" in flag && flag.symbol === "pi" && <text x="15" y="15.5" textAnchor="middle" fontSize="17" fontWeight="bold" fill="#FFD700" stroke="#000000" strokeWidth=".25">π</text>}

        </>
      )}
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
