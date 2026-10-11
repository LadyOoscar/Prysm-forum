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
    <svg className={className} viewBox="0 0 128 80" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {/* Deep navy outline: crescent tail, unmistakable dorsal fin, pointed snout */}
      <path fill="#101b35" d="M25 35 14 25 9 14 21 22 30 29 38 26 44 21 49 7 56 13 63 24 79 23 94 26 107 31 120 35 113 39 110 44 99 46 88 51 73 52 62 48 56 61 48 55 44 46 32 44 25 40Z" />
      {/* Cool blue upper body, with a clean shark profile rather than a round fish body */}
      <path fill="#347fae" d="M19 26 30 33 39 30 46 24 51 13 56 18 63 28 80 27 95 30 109 35 115 36 109 39 106 42 97 43 87 48 73 49 63 45 56 55 51 51 47 42 33 40 26 37Z" />
      <path fill="#5db7dc" d="M31 34 40 32 47 27 52 19 56 23 62 31 80 30 96 33 109 36 103 39 94 40 85 45 73 46 62 42 56 50 53 44 48 38 34 38Z" />
      {/* Pale belly, clearly separated from the blue back */}
      <path fill="#e7faff" d="M35 39 48 39 54 45 58 52 63 44 73 47 85 46 94 41 103 40 98 44 87 49 74 51 62 47 56 59 51 53 46 45 34 43Z" />
      <path fill="#b8efff" d="M43 40h7v3h4v4h4v4h3v-5h8v3h7v-2h9v-2h7v-2h6v-2h-8v3h-8v2h-8v-2h-7v-2h-8v-3h-7z" />
      {/* Iconic tall dorsal fin and smaller pectoral fin */}
      <path fill="#101b35" d="M47 23 49 7 56 13 64 25 57 28Z" />
      <path fill="#4a9bc5" d="M51 19 52 12 56 16 60 24 56 25Z" />
      <path fill="#101b35" d="M70 43 81 47 73 57 65 49Z" />
      <path fill="#2d719e" d="M71 45 77 48 72 53 68 49Z" />
      {/* Forked shark tail, with a visible upper and lower lobe */}
      <path fill="#101b35" d="M25 35 14 25 9 14 21 22 30 29 29 35 30 40 25 40 14 49 8 58 10 45 17 38Z" />
      <path fill="#347fae" d="M22 34 15 27 12 20 21 26 28 31 27 35 27 39 20 44 12 52 14 44 20 38Z" />
      {/* Three gill slits, a shark signature */}
      <path fill="#20557e" d="M38 32h2v7h-2zM42 30h2v9h-2zM46 28h2v9h-2z" />
      <path fill="#86dcf5" d="M39 33h1v4h-1zM43 31h1v5h-1z" />
      {/* Big glossy kawaii eye, placed on the head */}
      <path fill="#101b35" d="M91 29h8v8h-8z" />
      <path fill="#fff9ff" d="M93 30h5v5h-5z" />
      <path fill="#25304e" d="M95 32h3v4h-3z" />
      <path fill="#ffffff" d="M93 30h2v2h-2zM97 33h1v1h-1z" />
      {/* Shy pink cheeks */}
      <path fill="#ff8fbd" d="M83 37h3v2h-3zM86 36h4v3h-4zM89 37h2v2h-2z" />
      <path fill="#ffc5da" d="M85 36h2v2h-2z" />
      {/* Smiling mouth with two tiny triangular shark teeth */}
      <path fill="#101b35" d="M102 39h10v2h-2v2h-6v-2h-2z" />
      <path fill="#fff9ff" d="M104 39h3v3h-1v-1h-1v-1h-1zM109 39h2v2h-1v1h-1z" />
      {/* A few pale pixel glints on the back */}
      <path fill="#c9f6ff" d="M33 29h4v2h-4zM58 27h3v2h-3zM72 29h3v2h-3z" />
      {/* Pink mail pouch tucked beneath the shark, not covering its silhouette */}
      <path fill="#101b35" d="M81 50h17v3h4v10h-3v3H80v-3h-3V53h4z" />
      <path fill="#ff8fbd" d="M82 53h16v2h2v7h-2v2H81v-2h-2v-7h3z" />
      <path fill="#fff4fa" d="M81 54h17v2l-8 6-9-6z" />
      <path fill="#e66d9e" d="M79 56l7 6-5 1h-2zM100 56l-7 6 5 1h2z" />
      <path fill="#ffbdd3" d="M82 61l7 4 7-4v2l-7 4-7-4z" />
      <path fill="#fffaff" d="M87 56h2v2h2v2h-2v2h-2v-2h-2v-2h2z" />
      {/* Floating pixel sparkles, kept secondary to the shark */}
      <path fill="#ffdc72" d="M32 8h3v3h3v3h-3v3h-3v-3h-3v-3h3z" />
      <path fill="#ff8fbd" d="M109 14h2v3h3v2h-3v3h-2v-3h-3v-2h3z" />
      <path fill="#b9f2ff" d="M19 56h2v2h2v2h-2v2h-2v-2h-2v-2h2z" />
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
