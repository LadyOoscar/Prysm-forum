"use client";

import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

type NavKey = "forum" | "search" | "messages" | "communities" | "pantheon";

export default function PrysmNav({ active = "forum" }: { active?: NavKey }) {
  const items = [
    ["forum", "Forum", "/"],
    ["search", "Recherche", "/search"],
    ["messages", "Messages", "/messages"],
    ["communities", "Communautés", "/"],
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
            <span className="mobileNavIcon">{key === "forum" ? "⌂" : key === "search" ? "⌕" : key === "messages" ? "✉" : key === "communities" ? "✦" : "☽"}</span>
            <span>{key === "communities" ? "Cocon" : label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
