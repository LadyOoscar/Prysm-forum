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

function SharkCourier({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <path fill="#367fae" d="M5 2h5v1h2v2h2v2h1v2h-2v2h-2v2H6v-1H4v-2H2V9H1V7h2V5h2z"/>
      <path fill="#65c5e9" d="M5 3h5v1h2v2h1v2h-2v2H9v1H6v-1H4V8H3V6h2z"/>
      <path fill="#b5efff" d="M5 9h2v1h3v1H9v1H6v-1H5z"/>
      <path fill="#24547e" d="M5 2h3V1h2v2H7v1H5zM2 7h2v2H2zM11 12h2v-2h1v3h-3z"/>
      <path fill="#14253b" d="M10 5h2v2h-2z"/>
      <path fill="#fff3f5" d="M10 5h1v1h-1z"/>
      <path fill="#f58cae" d="M8 8h2v1H8z"/>
      <path fill="#ffb4c9" d="M8 8h1v1H8z"/>
      <path fill="#f5b5d0" d="M10 9h4v1h1v3h-1v1h-4v-1H9v-3h1z"/>
      <path fill="#fff0f5" d="M10 10h4v2h-4z"/>
      <path fill="#dc6d9d" d="M10 10h2v1h-2zM13 12h1v1h-1z"/>
      <path fill="#f58cae" d="M9 11h1v2h1v1h-2z"/>
    </svg>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [alert, setAlert] = useState<Notification | null>(null);

  async function load() {
    const supabase = createClient();
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

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        payload => {
          const incoming = payload.new as Notification;
          setNotifications(current => [incoming, ...current.filter(item => item.id !== incoming.id)].slice(0, 20));
          setAlert(incoming);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const unread = notifications.filter(notification => !notification.read_at).length;
  const latestUnread = notifications.find(notification => !notification.read_at);

  async function openNotification(notification: Notification) {
    const supabase = createClient();
    if (!notification.read_at) {
      const readAt = new Date().toISOString();
      await supabase.from("notifications").update({ read_at: readAt }).eq("id", notification.id);
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read_at: readAt } : item));
    }
    setAlert(null);
    if (notification.topic_id) router.push(`/topic?id=${notification.topic_id}`);
  }

  if (!userId) return null;

  return (
    <div className="notificationWrap">
      <button
        className={unread > 0 ? "notificationButton hasNotifications" : "notificationButton"}
        onClick={() => latestUnread && openNotification(latestUnread)}
        aria-label={unread > 0 ? `${unread} notifications non lues, ouvrir la plus récente` : "Aucune notification non lue"}
        title={unread > 0 ? "Ouvrir la dernière notification" : "Aucune notification non lue"}
      >
        <span className="notificationShark"><SharkCourier /></span>
        {unread > 0 && <span className="notificationBadge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {alert && (
        <button className="notificationAlert" onClick={() => openNotification(alert)} aria-label={`Ouvrir la notification : ${alert.message}`}>
          <span className="notificationAlertIcon"><SharkCourier /></span>
          <span className="notificationAlertCopy">
            <strong>{alert.type === "mention" ? "On t’a mentionnée" : alert.type === "vote" ? "Nouvelle réaction" : "Nouvelle notification"}</strong>
            <span>{alert.message}</span>
            <small>Toucher pour ouvrir ↗</small>
          </span>
          <span className="notificationAlertClose" onClick={event => { event.stopPropagation(); setAlert(null); }} aria-label="Fermer l’alerte">×</span>
        </button>
      )}
    </div>
  );
}
