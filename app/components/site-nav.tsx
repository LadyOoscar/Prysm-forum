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
        <linearGradient id="shark-fur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8edcf4" />
          <stop offset="1" stopColor="#397fae" />
        </linearGradient>
        <linearGradient id="shark-belly" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#fffaff" />
          <stop offset="1" stopColor="#cceefa" />
        </linearGradient>
      </defs>
      {/* Little tail and dorsal fin: still unmistakably a shark, but plush and soft-edged */}
      <path d="M29 64 C20 61 17 52 10 48 C12 60 16 65 23 69 C16 74 13 81 14 88 C22 82 29 76 35 72Z" fill="#245779" stroke="#17324e" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M48 27 C49 15 56 8 62 6 C64 16 69 21 76 27Z" fill="#397fae" stroke="#17324e" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Round chubby head and body, with tiny tufts to give the silhouette a fluffy plush feel */}
      <path d="M35 43 C31 36 36 30 43 31 C46 23 55 23 60 27 C67 20 77 24 80 29 C90 26 98 34 97 41 C107 45 112 55 109 64 C115 73 107 83 98 84 C90 94 76 94 68 91 C57 96 43 91 40 84 C29 81 25 72 30 63 C25 55 28 47 35 43Z" fill="#17324e"/>
      <path d="M36 43 C32 37 38 32 44 34 C48 26 55 27 60 31 C67 24 76 27 79 33 C89 29 96 36 94 43 C104 47 108 55 105 63 C111 71 104 79 96 80 C88 89 77 90 68 87 C57 92 46 87 43 80 C33 78 29 70 34 62 C29 55 31 47 36 43Z" fill="url(#shark-fur)"/>
      {/* Soft pale muzzle and round tummy */}
      <path d="M42 56 C49 49 61 50 69 54 C77 48 90 52 96 59 C101 67 96 77 88 81 C78 89 57 88 47 80 C39 74 37 64 42 56Z" fill="url(#shark-belly)"/>
      <ellipse cx="67" cy="69" rx="18" ry="15" fill="#e8f9ff" opacity=".9"/>
      {/* Fluffy cheek tufts */}
      <path d="M36 49 L29 45 L32 54 L27 59 L37 60 M96 47 L103 43 L101 52 L107 57 L97 59" fill="#65b9dc" stroke="#17324e" strokeWidth="2" strokeLinejoin="round"/>
      {/* Tiny rounded arms make the shark feel like a little person */}
      <path d="M39 64 C31 63 28 69 31 76 C34 82 41 81 46 76Z" fill="#5eb7d9" stroke="#17324e" strokeWidth="2.5"/>
      <path d="M91 63 C99 61 104 67 101 74 C99 80 92 80 87 75Z" fill="#5eb7d9" stroke="#17324e" strokeWidth="2.5"/>
      {/* Tiny feet */}
      <path d="M48 84 C43 87 43 93 49 95 L59 95 C63 92 60 87 56 84Z" fill="#347fae" stroke="#17324e" strokeWidth="2.5"/>
      <path d="M73 85 C69 88 70 93 75 95 L85 94 C90 91 86 86 81 84Z" fill="#347fae" stroke="#17324e" strokeWidth="2.5"/>
      {/* Gill marks */}
      <path d="M42 49 Q40 54 42 57 M47 47 Q45 52 47 55 M52 46 Q50 50 52 53" fill="none" stroke="#28668e" strokeWidth="2" strokeLinecap="round"/>
      {/* Big friendly eyes, highlights, blush, and a shy toothy smile */}
      <ellipse cx="61" cy="46" rx="7" ry="9" fill="#17324e"/>
      <ellipse cx="63" cy="45" rx="4.5" ry="6.5" fill="#fffaff"/>
      <ellipse cx="64" cy="47" rx="2.8" ry="4.5" fill="#202e4d"/>
      <circle cx="61.5" cy="42.5" r="2" fill="#fff"/>
      <ellipse cx="83" cy="46" rx="6.5" ry="8.5" fill="#17324e"/>
      <ellipse cx="84" cy="45" rx="4.2" ry="6.2" fill="#fffaff"/>
      <ellipse cx="85" cy="47" rx="2.6" ry="4.2" fill="#202e4d"/>
      <circle cx="82.5" cy="42.5" r="1.8" fill="#fff"/>
      <ellipse cx="51" cy="57" rx="6" ry="3.2" fill="#ff8fbd" opacity=".85"/>
      <ellipse cx="91" cy="56" rx="5.5" ry="3" fill="#ff8fbd" opacity=".85"/>
      <path d="M68 56 Q73 62 80 56" fill="none" stroke="#17324e" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M72 58 L74 62 L76 59" fill="#fffaff" stroke="#17324e" strokeWidth="1" strokeLinejoin="round"/>
      {/* Courier satchel worn across the little shark's belly */}
      <path d="M79 66 Q91 61 98 69 L101 84 Q90 92 77 86 L75 74Z" fill="#17324e" stroke="#17324e" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M81 69 Q91 65 96 71 L98 82 Q89 87 80 83Z" fill="#ff8fbd"/>
      <path d="M80 70 L89 77 L97 70" fill="none" stroke="#fff4fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M88 77 C84 73 81 78 88 82 C95 78 92 73 88 77Z" fill="#fffaff"/>
      {/* A few soft sparkles around the character */}
      <path d="M22 27 L24 32 L29 34 L24 36 L22 41 L20 36 L15 34 L20 32Z" fill="#ffdc72"/>
      <path d="M105 23 L107 27 L111 29 L107 31 L105 35 L103 31 L99 29 L103 27Z" fill="#ff8fbd"/>
      <circle cx="19" cy="47" r="2" fill="#b9f2ff"/>
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
