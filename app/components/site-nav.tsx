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
        <linearGradient id="shark-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b8f0fb" />
          <stop offset=".52" stopColor="#66c6e5" />
          <stop offset="1" stopColor="#3489b8" />
        </linearGradient>
        <linearGradient id="shark-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#263b68" />
          <stop offset="1" stopColor="#111e3e" />
        </linearGradient>
        <linearGradient id="shark-jacket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb4d4" />
          <stop offset="1" stopColor="#e875ae" />
        </linearGradient>
      </defs>
      {/* Sleek tail and dorsal fin */}
      <path d="M30 70 C20 67 15 58 10 51 C10 63 16 70 24 73 C17 79 15 85 16 91 C25 85 31 79 36 75Z" fill="#347da8" />
      <path d="M47 27 C48 16 54 8 61 5 C63 15 69 22 76 27Z" fill="#347da8" />
      {/* Smooth hair silhouette, swept to one side like a short elegant bob */}
      <path d="M34 44 C29 28 40 15 57 15 C72 9 89 19 94 31 C102 37 102 49 97 58 L92 72 L38 72 L32 59Z" fill="url(#shark-hair)" />
      <path d="M36 42 C36 28 47 20 60 21 C72 17 84 24 89 34 C80 31 74 28 68 28 C61 39 49 42 36 42Z" fill="#344d7d" />
      {/* Human-like face and neck */}
      <path d="M44 37 C47 29 57 27 66 29 C78 29 86 38 85 49 L82 62 C79 70 70 75 62 74 C52 73 44 65 43 55Z" fill="url(#shark-skin)" />
      <path d="M48 58 C52 65 58 68 64 68 C72 68 78 63 81 56 C80 68 73 75 63 76 C54 75 48 68 48 58Z" fill="#d8f8fc" opacity=".82" />
      <path d="M43 42 C39 32 47 22 59 20 C72 18 82 26 88 37 C77 32 69 30 63 32 C57 39 50 42 43 42Z" fill="url(#shark-hair)" />
      <path d="M82 35 C92 41 92 54 87 64 L81 68 L84 53Z" fill="#1c2e52" />
      {/* Minimal, graceful eyes and a subtle smile */}
      <path d="M49 48 Q54 44 59 48" fill="none" stroke="#17324e" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M68 48 Q73 44 78 48" fill="none" stroke="#17324e" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="55" cy="50" rx="2.1" ry="3.2" fill="#17324e" />
      <ellipse cx="73" cy="50" rx="2.1" ry="3.2" fill="#17324e" />
      <circle cx="55.5" cy="49" r=".8" fill="#fff" />
      <circle cx="73.5" cy="49" r=".8" fill="#fff" />
      <path d="M62 51 L60 57 L63 58" fill="none" stroke="#398db2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M57 62 Q63 67 69 61" fill="none" stroke="#17324e" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="48" cy="57" rx="4.2" ry="2" fill="#ff9cc7" opacity=".65" />
      <ellipse cx="78" cy="57" rx="4.2" ry="2" fill="#ff9cc7" opacity=".65" />
      {/* Gills and small fin details keep the shark identity */}
      <path d="M38 49 Q35 54 38 58 M42 48 Q39 53 42 56" fill="none" stroke="#2e759d" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M87 68 L96 77 L87 78Z" fill="#347da8" />
      {/* Slender humanoid silhouette in a fitted courier jacket */}
      <path d="M48 72 L42 76 C36 82 35 91 37 99 L88 99 C90 89 86 79 78 75 L72 72 C67 78 56 78 48 72Z" fill="url(#shark-jacket)" />
      <path d="M48 73 L57 84 L63 78 L69 84 L77 73 L72 70 C66 76 56 76 50 70Z" fill="#f8d7e7" />
      <path d="M62 79 L62 98" stroke="#b74f89" strokeWidth="1.5" opacity=".75" />
      {/* Cross-body courier strap and clean compact satchel */}
      <path d="M76 75 L53 98" fill="none" stroke="#27385e" strokeWidth="5" strokeLinecap="round" />
      <path d="M73 84 Q82 80 88 86 L91 98 L73 99 L70 91Z" fill="#27385e" />
      <path d="M76 87 Q82 84 86 88 L88 95 L76 95Z" fill="#ffb4d4" />
      <path d="M78 89 L82 92 L86 89" fill="none" stroke="#fff5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Tiny polished highlights */}
      <path d="M91 24 L93 29 L98 31 L93 33 L91 38 L89 33 L84 31 L89 29Z" fill="#ff9cc7" />
      <circle cx="25" cy="38" r="2" fill="#ffdc72" />
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
