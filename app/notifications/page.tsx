"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Notification = {
  id: string;
  type: string;
  message: string;
  topic_id: string | null;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(userId: string) {
    const { data } = await supabase
      .from("notifications")
      .select("id,type,message,topic_id,post_id,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/auth";
        return;
      }
      await load(auth.user.id);
      channel = supabase.channel("notifications-" + auth.user.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + auth.user.id }, (payload) => {
          setItems((current) => current.some((item) => item.id === payload.new.id) ? current : [payload.new as Notification, ...current]);
        })
        .subscribe();
    }
    void init();
    return () => { if (channel) void supabase.removeChannel(channel); };
  }, []);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  }

  async function markAllRead() {
    const unread = items.filter((item) => !item.read_at);
    if (!unread.length) return;
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).in("id", unread.map((item) => item.id));
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link href="/messages">Messages</Link><Link className="active" href="/notifications">Notifications</Link><Link href="/profil">Profil</Link></nav>
      </header>
      <section className="page-head compact">
        <p className="eyebrow">Centre d’alertes</p>
        <h1>Notifications.</h1>
        <p className="lead">Les nouveaux messages, matchs et autres événements importants apparaissent ici en temps réel.</p>
      </section>
      <div className="notification-actions"><button className="button" onClick={markAllRead} disabled={!items.some((item) => !item.read_at)}>Tout marquer comme lu</button></div>
      {loading ? <div className="empty"><p>Chargement…</p></div> : items.length === 0 ? (
        <div className="empty"><div className="empty-symbol">◇</div><h2>Tout est calme</h2><p>Tu n’as aucune notification pour le moment.</p></div>
      ) : (
        <section className="notification-list">
          {items.map((item) => {
            const href = item.type === "dating_match" || item.type === "match" ? "/rencontres/matchs" : item.topic_id ? "/topic/" + item.topic_id : item.type === "message" || item.type === "direct_message" ? "/messages" : null;
            const title = item.type === "level_up" ? "Niveau supérieur" : item.type === "dating_match" || item.type === "match" ? "Nouveau match" : item.type === "message" || item.type === "direct_message" ? "Nouveau message" : item.type === "reaction" ? "Nouvelle réaction" : item.type === "mention" ? "Nouvelle mention" : item.type === "followed_topic" || item.type === "follow" ? "Discussion suivie" : "Notification";
            const content = <><strong>{title}</strong><p>{item.message}</p><time>{new Date(item.created_at).toLocaleString("fr-FR")}</time></>;
            return href ? <Link className={"notification-row " + (!item.read_at ? "unread" : "")} href={href} key={item.id} onClick={() => void markRead(item.id)}>{content}</Link> : <button className={"notification-row notification-button " + (!item.read_at ? "unread" : "")} key={item.id} onClick={() => void markRead(item.id)}>{content}</button>;
          })}
        </section>
      )}
    </main>
  );
}
