"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { createClient } from "@/lib/supabase/client";

type NavKey = "forum" | "search" | "messages" | "communities" | "pantheon" | "dating" | "admin";

export default function PrysmNav({ active = "forum" }: { active?: NavKey }) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const db = createClient();
    void (async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      setIsAdmin(Boolean(data?.is_admin));
    })();
  }, []);
  const items = [
    ["forum", "Forum", "/"],
    ["search", "Recherche", "/search"],
    ["messages", "Messages", "/messages"],
    ["dating", "Rencontres", "/rencontres"],
    ["communities", "Communautés", "/communities"],
    ["pantheon", "Panthéon", "/pantheon"],
    ...(isAdmin ? [["admin", "Administration", "/admin"] as const] : []),
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
            <span className="mobileNavIcon">{key === "forum" ? "⌂" : key === "search" ? "⌕" : key === "messages" ? "✉" : key === "dating" ? "♥" : key === "communities" ? "✦" : key === "admin" ? "⚙" : "☽"}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
