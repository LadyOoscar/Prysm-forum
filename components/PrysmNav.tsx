"use client";

import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

type NavKey = "forum" | "search" | "messages" | "communities" | "pantheon" | "dating";

export default function PrysmNav({ active = "forum" }: { active?: NavKey }) {
  const items = [
    ["forum", "Forum", "/"],
    ["search", "Recherche", "/search"],
    ["messages", "Messages", "/messages"],
    ["dating", "Rencontres", "/rencontres"],
    ["communities", "Communautés", "/communities"],
    ["pantheon", "Panthéon", "/pantheon"],
  ] as const;

  return (
    <>
      <header className="prysmHeader">
        <Link className="brand" href="/">PRYSM<span>✦</span></Link>
        <nav className="desktopNav" aria-label="Navigation principale">
          {items.map(([key, label, href]) => (
            <Link key={key} className={active === key ? "active" : ""} href={href}>{label}</Link>
          ))}
        </nav>
        <div className="headerTools">
          <NotificationBell />
          <Link className="profile" href="/profile"><span className="profileGlyph">☾</span><span>Mon profil</span></Link>
        </div>
      </header>
      <nav className="mobileNav" aria-label="Navigation mobile">
        {items.map(([key, label, href]) => (
          <Link key={key} className={active === key ? "active" : ""} href={href}>
            <span className="mobileNavIcon">{key === "forum" ? "⌂" : key === "search" ? "⌕" : key === "messages" ? "✉" : key === "dating" ? "♥" : key === "communities" ? "✦" : "☽"}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
