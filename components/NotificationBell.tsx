"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  message: string;
  topic_id: string | null;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    const { data: claims } = await supabase.auth.getClaims();
    const id = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    setUserId(id);
    if (!id) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,type,message,topic_id,post_id,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        payload => setNotifications(current => [payload.new as Notification, ...current].slice(0, 20))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = notifications.filter(notification => !notification.read_at).length;

  async function markRead(notification: Notification) {
    if (!notification.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id);
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    }
    if (notification.topic_id) router.push(`/topic?id=${notification.topic_id}`);
    setOpen(false);
  }

  async function markAllRead() {
    if (!userId || unread === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    setNotifications(current => current.map(item => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  }

  if (!userId) return null;

  return (
    <div className="notificationWrap">
      <button className="notificationButton" onClick={() => setOpen(value => !value)} aria-label="Notifications">
        ♢
        {unread > 0 && <span className="notificationBadge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notificationPanel">
          <div className="notificationHead">
            <strong>Notifications</strong>
            {unread > 0 && <button onClick={markAllRead}>Tout lire</button>}
          </div>
          {notifications.length === 0 ? (
            <p className="notificationEmpty">Aucune notification pour le moment.</p>
          ) : notifications.map(notification => (
            <button
              className={notification.read_at ? "notificationItem" : "notificationItem unread"}
              key={notification.id}
              onClick={() => markRead(notification)}
            >
              <span className="notificationIcon">{notification.type === "vote" ? "⭐" : "💬"}</span>
              <span><strong>{notification.type === "vote" ? "Vote positif" : "Nouvelle réponse"}</strong><small>{notification.message}</small><time>{new Date(notification.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
