"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import SiteDecoration from "./site-decoration";

const decorationSlots: Record<string, string> = { "/forum": "tab-forum", "/rencontres": "tab-rencontres", "/orbite": "tab-orbite", "/messages": "tab-messages", "/profil": "tab-profil" };

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
        <linearGradient id="shark-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9edfb" />
          <stop offset=".55" stopColor="#59b9df" />
          <stop offset="1" stopColor="#2876a7" />
        </linearGradient>
        <linearGradient id="shark-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d2f3fa" />
        </linearGradient>
        <linearGradient id="shark-fin-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#284e7a" />
          <stop offset="1" stopColor="#142746" />
        </linearGradient>
        <linearGradient id="shark-coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb7d9" />
          <stop offset="1" stopColor="#df6fa9" />
        </linearGradient>
      </defs>

      {/* Tail and dorsal fin: the silhouette reads as a shark before anything else */}
      <path d="M37 69 C27 65 20 57 13 49 C13 62 20 70 29 73 C21 80 19 87 20 94 C30 87 37 80 43 74Z" fill="#347fa8" />
      <path d="M48 29 C47 17 55 8 62 5 C65 16 71 23 80 29Z" fill="#347fa8" />

      {/* Fin-like swept crest, not a human wig */}
      <path d="M31 44 C27 27 41 14 57 15 C69 8 86 18 93 33 L98 52 L89 67 L79 60 L42 62 L33 54Z" fill="url(#shark-fin-hair)" />
      <path d="M35 36 C39 23 52 19 63 20 C74 17 85 25 89 37 C77 31 70 29 64 31 C55 38 46 40 35 36Z" fill="#365f8c" />
      <path d="M82 28 C91 30 98 39 97 49 L91 57 L88 43Z" fill="#142746" />

      {/* Broad shark cranium, tapering into a short rounded snout */}
      <path d="M34 38 C37 25 48 20 62 21 C76 20 87 29 89 41 L87 53 C85 65 76 72 64 73 C52 72 42 66 39 57 L34 47Z" fill="url(#shark-skin)" />
      {/* White lower jaw and muzzle, essential shark anatomy */}
      <path d="M39 49 C46 46 54 47 62 50 C70 46 79 47 85 51 C83 62 75 68 64 69 C52 68 43 61 39 49Z" fill="url(#shark-belly)" />
      <path d="M47 55 Q55 52 62 56 Q70 52 79 55 Q74 63 64 64 Q54 63 47 55Z" fill="#effcff" />
      <path d="M58 55 Q64 58 70 55" fill="none" stroke="#438cad" strokeWidth="1.3" strokeLinecap="round" />

      {/* Side fins and visible gill slits */}
      <path d="M39 43 L26 34 C27 45 31 53 41 55Z" fill="#4aa5cb" />
      <path d="M86 43 L99 34 C98 45 94 53 84 55Z" fill="#4aa5cb" />
      <path d="M38 49 Q34 54 37 59 M42 49 Q39 54 42 58 M46 49 Q43 53 46 56" fill="none" stroke="#2879a2" strokeWidth="1.6" strokeLinecap="round" />

      {/* Expressive feminine eyes, shaped for an anthro shark rather than a human face */}
      <path d="M43 41 Q50 35 58 41" fill="none" stroke="#17324e" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M69 41 Q77 35 84 41" fill="none" stroke="#17324e" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M43 44 Q50 38 58 44 Q58 52 51 53 Q44 52 43 44Z" fill="#132b48" />
      <path d="M69 44 Q77 38 84 44 Q83 52 76 53 Q69 52 69 44Z" fill="#132b48" />
      <ellipse cx="51" cy="46" rx="3.2" ry="4.2" fill="#f8ffff" />
      <ellipse cx="76" cy="46" rx="3.2" ry="4.2" fill="#f8ffff" />
      <ellipse cx="52" cy="47" rx="1.9" ry="3" fill="#263d69" />
      <ellipse cx="77" cy="47" rx="1.9" ry="3" fill="#263d69" />
      <circle cx="50.5" cy="44.5" r="1.2" fill="#fff" />
      <circle cx="75.5" cy="44.5" r="1.2" fill="#fff" />
      <ellipse cx="46" cy="57" rx="4.4" ry="2.4" fill="#ff9fc8" opacity=".78" />
      <ellipse cx="81" cy="57" rx="4.4" ry="2.4" fill="#ff9fc8" opacity=".78" />
      <path d="M57 61 Q64 66 71 61" fill="none" stroke="#1c4567" strokeWidth="1.8" strokeLinecap="round" />

      {/* Furry-style humanoid body: shoulders, arms, hands and a fitted courier jacket */}
      <path d="M48 70 L39 75 C33 80 31 88 33 99 L95 99 C97 88 91 79 82 75 L73 70 C68 77 55 77 48 70Z" fill="url(#shark-coat)" />
      <path d="M48 72 L56 83 L64 78 L72 83 L80 72 L73 69 C66 76 56 76 50 69Z" fill="#fff0f7" />
      <path d="M63 80 L63 98" stroke="#bd568c" strokeWidth="1.4" opacity=".8" />
      <path d="M41 78 C35 82 34 88 36 93 L43 95 L49 82Z" fill="url(#shark-skin)" />
      <path d="M82 78 C89 82 92 88 89 93 L83 95 L77 82Z" fill="url(#shark-skin)" />
      <path d="M36 92 Q39 95 43 92 L45 97 L37 99Z" fill="#347fa8" />
      <path d="M83 92 Q87 95 90 92 L91 97 L84 99Z" fill="#347fa8" />

      {/* Cross-body satchel, the character's courier signature */}
      <path d="M78 74 L54 99" fill="none" stroke="#243b60" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M74 84 Q83 80 89 86 L93 99 L73 99 L71 91Z" fill="#243b60" />
      <path d="M77 88 Q83 85 87 89 L89 96 L77 96Z" fill="#ffb6d9" />
      <path d="M79 90 L83 93 L87 90" fill="none" stroke="#fff7fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Small graphic sparkle */}
      <path d="M101 22 L103 27 L108 29 L103 31 L101 36 L99 31 L94 29 L99 27Z" fill="#ff9fc8" />
      <circle cx="23" cy="35" r="2" fill="#ffdc72" />
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
              {decorationSlots[link.href] ? <SiteDecoration slot={decorationSlots[link.href]}>{link.label}</SiteDecoration> : link.label}
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
