"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

const links = [
  { href: "/", label: "Accueil", matches: (path: string) => path === "/" },
  { href: "/forum", label: "Forum", matches: (path: string) => path.startsWith("/forum") || path.startsWith("/topic") },
  { href: "/rencontres", label: "Rencontres", matches: (path: string) => path.startsWith("/rencontres") },
  { href: "/orbite", label: "Orbite", matches: (path: string) => path.startsWith("/orbite") },
  { href: "/messages", label: "Messages", matches: (path: string) => path.startsWith("/messages") },
  { href: "/profil", label: "Profil", matches: (path: string) => path.startsWith("/profil") || path.startsWith("/membre") },
];

function SharkCourier({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 104" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="shark-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8efff" />
          <stop offset=".5" stopColor="#5bbfe3" />
          <stop offset="1" stopColor="#2876a8" />
        </linearGradient>
        <linearGradient id="shark-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8ffff" />
          <stop offset="1" stopColor="#bce9f5" />
        </linearGradient>
        <linearGradient id="shark-pink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffafd6" />
          <stop offset="1" stopColor="#ed6eaa" />
        </linearGradient>
      </defs>
      {/* Long expressive shark tail and clear dorsal fin */}
      <path d="M37 68 C26 65 18 56 12 49 C13 61 19 70 29 73 C21 80 18 87 19 94 C29 87 36 80 42 74Z" fill="#317ca8" />
      <path d="M52 29 C51 17 57 9 64 5 C66 16 72 23 81 29Z" fill="#347fab" />
      {/* Distinct shark-girl head: broad smooth cranium, tapered jaw and visible snout */}
      <path d="M34 39 C34 24 46 15 61 16 C77 14 91 25 93 39 C98 45 97 56 92 63 L82 71 C74 78 57 78 47 70 L38 61 C31 54 30 46 34 39Z" fill="url(#shark-blue)" />
      {/* Dark blue crown marking, shaped like a sleek shark cap rather than human hair */}
      <path d="M35 39 C34 25 47 16 61 17 C76 14 88 24 92 37 C82 33 76 29 68 28 C59 37 48 40 35 39Z" fill="#245078" />
      <path d="M43 28 C50 21 61 19 71 22 C63 23 57 28 53 34Z" fill="#3e7296" opacity=".9" />
      {/* Fins on the sides of the head */}
      <path d="M37 43 L26 34 C27 45 30 51 38 53Z" fill="#398bb4" />
      <path d="M89 43 L100 34 C99 45 96 51 88 53Z" fill="#398bb4" />
      {/* Pale shark muzzle, clearly projecting from the face */}
      <path d="M43 49 C48 45 55 46 62 49 C69 45 78 46 84 51 C83 60 76 67 64 68 C52 67 44 61 43 49Z" fill="url(#shark-white)" />
      <ellipse cx="64" cy="55" rx="14" ry="8" fill="#e7faff" />
      <path d="M58 54 Q64 57 70 54" fill="none" stroke="#4b91b3" strokeWidth="1.4" strokeLinecap="round" />
      {/* Feminine, lively eyes with lashes and highlights */}
      <path d="M43 42 L40 38 M48 40 L47 36 M53 40 L54 36" stroke="#17324e" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M42 44 Q49 37 57 44 Q57 52 50 53 Q43 52 42 44Z" fill="#17324e" />
      <ellipse cx="50" cy="46" rx="3.3" ry="4.5" fill="#f8ffff" />
      <ellipse cx="51" cy="47" rx="2" ry="3.2" fill="#273a67" />
      <circle cx="49.5" cy="44.5" r="1.3" fill="#fff" />
      <path d="M70 44 Q78 37 85 44 Q84 52 77 53 Q70 52 70 44Z" fill="#17324e" />
      <ellipse cx="77" cy="46" rx="3.3" ry="4.5" fill="#f8ffff" />
      <ellipse cx="78" cy="47" rx="2" ry="3.2" fill="#273a67" />
      <circle cx="76.5" cy="44.5" r="1.3" fill="#fff" />
      <path d="M43 40 Q50 35 57 40 M70 40 Q78 35 85 40" fill="none" stroke="#183552" strokeWidth="2.2" strokeLinecap="round" />
      {/* Gill slits, cheek blush, and a confident smile */}
      <path d="M36 52 Q33 57 36 61 M40 53 Q37 58 40 61" fill="none" stroke="#2777a2" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="45" cy="57" rx="4.5" ry="2.5" fill="#ff9dc9" opacity=".8" />
      <ellipse cx="83" cy="57" rx="4.5" ry="2.5" fill="#ff9dc9" opacity=".8" />
      <path d="M58 61 Q64 65 70 61" fill="none" stroke="#245078" strokeWidth="1.8" strokeLinecap="round" />
      {/* Athletic humanoid shoulders, arms and fitted pink courier jacket */}
      <path d="M48 71 L39 76 C33 81 31 90 33 100 L95 100 C96 89 91 80 82 75 L73 71 C68 77 55 77 48 71Z" fill="url(#shark-pink)" />
      <path d="M48 73 L56 83 L64 78 L72 83 L80 73 L73 70 C66 76 56 76 50 70Z" fill="#fff0f8" />
      <path d="M63 80 L63 99" stroke="#b54d86" strokeWidth="1.5" opacity=".7" />
      <path d="M43 78 C37 82 35 88 37 93 L43 94 L49 82Z" fill="#5bbfe3" />
      <path d="M84 78 C91 82 93 88 90 93 L84 94 L78 82Z" fill="#5bbfe3" />
      {/* Courier strap and compact satchel */}
      <path d="M78 75 L54 99" fill="none" stroke="#263d67" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M74 85 Q83 80 89 86 L93 99 L73 99 L71 91Z" fill="#263d67" />
      <path d="M77 88 Q83 85 87 89 L89 96 L77 96Z" fill="#ffb4d8" />
      <path d="M79 90 L83 93 L87 90" fill="none" stroke="#fff7fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Tailored fin accents and little sparkle */}
      <path d="M28 78 L21 74 L25 85Z" fill="#5bbfe3" />
      <path d="M99 21 L101 26 L106 28 L101 30 L99 35 L97 30 L92 28 L97 26Z" fill="#ff9dc9" />
      <circle cx="22" cy="36" r="2" fill="#ffdc72" />
    </svg>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  const [canModerate, setCanModerate] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationToast, setNotificationToast] = useState<{ id: string; type: string; message: string; topic_id: string | null } | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setCanModerate(false); return; }
      const { data, error } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
      if (active && !error) setCanModerate(Boolean(data?.is_moderator || data?.is_admin));
    }
    void checkRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void checkRole(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function connectNotifications() {
      const { data: auth } = await supabase.auth.getUser();
      if (!active || !auth.user) {
        if (active) setUnreadCount(0);
        return;
      }

      const userId = auth.user.id;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      if (active && !error) setUnreadCount(count ?? 0);

      channel = supabase
        .channel("site-notifications-" + userId)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + userId,
        }, (payload) => {
          if (!active) return;
          const item = payload.new as { id: string; type?: string; message?: string; topic_id?: string | null };
          setUnreadCount((current) => current + 1);
          setNotificationToast({
            id: item.id,
            type: item.type ?? "notification",
            message: item.message ?? "Tu as reçu une nouvelle notification.",
            topic_id: item.topic_id ?? null,
          });
          if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
          toastTimer.current = window.setTimeout(() => setNotificationToast(null), 6500);
          window.dispatchEvent(new CustomEvent("prysm:sound", { detail: { kind: "notification" } }));
        })
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + userId,
        }, (payload) => {
          if (!active) return;
          const before = payload.old as { read_at?: string | null };
          const after = payload.new as { read_at?: string | null };
          if (!before.read_at && after.read_at) setUnreadCount((current) => Math.max(0, current - 1));
        })
        .subscribe();
    }

    void connectNotifications();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (channel) void supabase.removeChannel(channel);
      channel = null;
      void connectNotifications();
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const dismissToast = () => {
    setNotificationToast(null);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  };

  return (
    <div className="site-nav-wrap">
      <header className="topbar site-topbar shell">
        <Link className="brand" href="/">PRYSM</Link>
        <nav aria-label="Navigation principale">
          {links.map(link => (
            <Link key={link.href} className={link.matches(pathname) ? "active" : ""} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link className={"site-notifications-link " + (pathname.startsWith("/notifications") ? "active" : "")} href="/notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} non lue(s)` : "Notifications"}>
            <span className="site-notification-shark" aria-hidden="true"><SharkCourier /></span><span>Notifications</span>{unreadCount > 0 && <span className="site-notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
          {canModerate && <Link className={pathname.startsWith("/moderation") || pathname.startsWith("/admin") ? "active" : ""} href="/moderation">Modo/Admin</Link>}
        </nav>
      </header>
      {notificationToast && !pathname.startsWith("/notifications") && (
        <div className="prysm-notification-toast" role="status" aria-live="polite">
          <span className="prysm-notification-toast__signal" aria-hidden="true"><SharkCourier /></span>
          <Link className="prysm-notification-toast__copy" href={notificationToast.topic_id ? "/topic/" + notificationToast.topic_id : notificationToast.type === "dating_match" || notificationToast.type === "match" ? "/rencontres/matchs" : notificationToast.type === "direct_message" || notificationToast.type === "message" ? "/messages" : "/notifications"} onClick={dismissToast}>
            <strong>PRYSM // NOUVELLE ALERTE</strong><span>{notificationToast.message}</span><small>Toucher pour ouvrir</small>
          </Link>
          <button type="button" className="prysm-notification-toast__close" aria-label="Fermer la notification" onClick={dismissToast}>×</button>
        </div>
      )}
    </div>
  );
}
