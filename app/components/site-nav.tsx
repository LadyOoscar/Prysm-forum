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
            Notifications{unreadCount > 0 && <span className="site-notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
          {canModerate && <Link className={pathname.startsWith("/moderation") || pathname.startsWith("/admin") ? "active" : ""} href="/moderation">Modo/Admin</Link>}
        </nav>
      </header>
      {notificationToast && !pathname.startsWith("/notifications") && (
        <div className="prysm-notification-toast" role="status" aria-live="polite">
          <span className="prysm-notification-toast__signal" aria-hidden="true">✦</span>
          <Link className="prysm-notification-toast__copy" href={notificationToast.topic_id ? "/topic/" + notificationToast.topic_id : notificationToast.type === "dating_match" || notificationToast.type === "match" ? "/rencontres/matchs" : notificationToast.type === "direct_message" || notificationToast.type === "message" ? "/messages" : "/notifications"} onClick={dismissToast}>
            <strong>PRYSM // NOUVELLE ALERTE</strong><span>{notificationToast.message}</span><small>Toucher pour ouvrir</small>
          </Link>
          <button type="button" className="prysm-notification-toast__close" aria-label="Fermer la notification" onClick={dismissToast}>×</button>
        </div>
      )}
    </div>
  );
}
