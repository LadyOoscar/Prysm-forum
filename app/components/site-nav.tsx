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
    <svg className={className} viewBox="0 0 64 40" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {/* Split tail and dorsal fin: unmistakably a tiny shark */}
      <path fill="#10263d" d="M3 13h7V8h5v7h5v4h-5v5h-5v-5H3v-3H0v-2h3z" />
      <path fill="#28658e" d="M6 14h5V11h3v6h6v2h-6v4h-3v-4H6z" />
      <path fill="#10263d" d="M14 15h6v-5h7V5h6v5h5v3h8v3h7v3h-3v4h-5v3H33v3h-8v-3h-6v-4h-5v-7h5z" />
      <path fill="#367fae" d="M16 16h5v-4h7V8h3v5h6v2h9v3h7v2h-4v3h-7v3H33v2h-6v-3h-6v-4h-5z" />
      <path fill="#65c5e9" d="M20 19h8v2h8v2h9v-2h6v2h-5v3h-8v2h-7v-2h-6v-3h-5z" />
      {/* Sparkly water highlights and tiny gills */}
      <path fill="#b9f2ff" d="M19 15h3v1h-3zM25 13h2v1h-2zM34 16h3v1h-3zM38 19h2v1h-2z" />
      <path fill="#24547e" d="M23 17h2v5h-2zM27 17h2v5h-2zM31 17h2v5h-2z" />
      <path fill="#10263d" d="M29 25h8v3h5v2h-8v-2h-5z" />
      {/* Cute expressive eye with a double sparkle */}
      <path fill="#10263d" d="M42 14h7v7h-7z" />
      <path fill="#fff8ff" d="M44 15h3v3h-3z" />
      <path fill="#ffffff" d="M44 15h1v1h-1z" />
      <path fill="#ff8fbd" d="M52 20h2v2h-2z" />
      {/* Rosy pixel cheeks make the courier feel kawaii */}
      <path fill="#ff8fb7" d="M37 21h3v1h-3zM35 22h5v2h-5zM40 21h2v1h-2z" />
      <path fill="#ffc2d7" d="M36 22h2v1h-2zM39 22h1v1h-1z" />
      {/* Little toothy smile */}
      <path fill="#10263d" d="M47 21h5v2h-5z" />
      <path fill="#fff3f5" d="M48 21h2v2h-2zM51 21h1v1h-1z" />
      {/* Pink delivery envelope with crisp folds and a tiny heart seal */}
      <path fill="#10263d" d="M44 25h14v2h3v8h-2v2H43v-2h-2v-8h3z" />
      <path fill="#f58cae" d="M45 27h13v2h1v5h-2v1H44v-1h-1v-5h2z" />
      <path fill="#fff0f5" d="M45 28h13v2l-6 5-7-5z" />
      <path fill="#dc6d9d" d="M43 30l6 5-5 1h-1zM59 30l-6 5 5 1h1z" />
      <path fill="#ffb4c9" d="M45 33l5 3h2l5-3v2H45z" />
      <path fill="#fff0f5" d="M48 28h7v1h-7z" />
      <path fill="#fff7fb" d="M50 29h2v1h1v1h-1v1h-1v-1h-1z" />
      {/* Floating pixel stars */}
      <path fill="#ffdc72" d="M7 4h2v2h2v2H9v2H7V8H5V6h2z" />
      <path fill="#ff8fbd" d="M57 8h2v2h2v2h-2v2h-2v-2h-2v-2h2z" />
      <path fill="#b9f2ff" d="M16 29h2v2h2v2h-2v2h-2v-2h-2v-2h2z" />
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
