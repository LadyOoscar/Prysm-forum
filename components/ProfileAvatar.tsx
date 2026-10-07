"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  name?: string | null;
  className?: string;
};

export default function ProfileAvatar({ src, name, className = "" }: Props) {
  const [broken, setBroken] = useState(false);
  const label = (name?.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className={`profileAvatar ${className}`} aria-hidden="true">
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}
