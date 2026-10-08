"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import BadgeManager from "./badge-manager";

type Report = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  forum_posts: { body: string; topic_id: string } | null;
};

const statuses = ["open", "reviewed", "resolved", "dismissed"] as const;
const statusLabels: Record<string, string> = { open: "Ouvert", reviewed: "Examiné", resolved: "Résolu", dismissed: "Rejeté" };
const reasonLabels: Record<string, string> = { spam: "Spam", harassment: "Harcèlement", hate: "Haine / discrimination", sexual: "Sexuel", illegal: "Illégal", other: "Autre" };

export default function ModerationPage() {
  const supabase = createSupabaseBrowser();
  const [reports, setReports] = useState<Report[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [lockedTopics, setLockedTopics] = useState<Record<string, boolean>>({});

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAllowed(false); return; }
    const { data: profile } = await supabase.from("profiles").select("is_moderator, is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_moderator) { setAllowed(false); return; }
    setAllowed(true);
    setIsAdmin(Boolean(profile.is_admin));

    const { data, error } = await supabase.from("forum_reports")
      .select("id, post_id, reporter_id, reason, details, status, created_at, forum_posts:post_id(body, topic_id)")
      .order("created_at", { ascending: false });
    if (error) { setError("Impossible de charger les signalements."); return; }

    const nextReports = (data ?? []) as unknown as Report[];
    setReports(nextReports);
    const topicIds = [...new Set(nextReports.map((report) => report.forum_posts?.topic_id).filter(Boolean))];
    if (topicIds.length) {
      const { data: topics } = await supabase.from("forum_topics").select("id, locked").in("id", topicIds);
      const state: Record<string, boolean> = {};
      for (const topic of topics ?? []) state[topic.id] = topic.locked;
      setLockedTopics(state);
    }
  }

  useEffect(() => { void load(); }, []);

  async function recordAction(reportId: string, postId: string | null, action: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("moderation_actions").insert({ moderator_id: user.id, report_id: reportId, post_id: postId, action });
  }

  async function updateStatus(id: string, status: string) {
    setBusy(id); setError("");
    const { error } = await supabase.from("forum_reports").update({ status }).eq("id", id);
    if (error) { setError("Impossible de modifier le signalement."); setBusy(null); return; }
    const report = reports.find((item) => item.id === id);
    await recordAction(id, report?.post_id ?? null, status === "resolved" ? "resolve_report" : status === "dismissed" ? "dismiss_report" : "review_report");
    setReports((current) => current.map((report) => report.id === id ? { ...report, status } : report));
    setBusy(null);
  }

  async function toggleTopicLock(report: Report) {
    const topicId = report.forum_posts?.topic_id;
    if (!topicId) return;
    const nextLocked = !lockedTopics[topicId];
    setBusy(report.id); setError("");

    const { error } = await supabase.from("forum_topics").update({ locked: nextLocked }).eq("id", topicId);
    if (error) { setError("Impossible de modifier le verrouillage du sujet."); setBusy(null); return; }
    await recordAction(report.id, report.post_id, nextLocked ? "lock_topic" : "unlock_topic");
    setLockedTopics((current) => ({ ...current, [topicId]: nextLocked }));
    setBusy(null);
  }

  if (allowed === null) return <main className="shell"><section className="page-head"><p className="eyebrow">Modération</p><h1>Chargement</h1></section></main>;
  if (!allowed) return <main className="shell"><section className="page-head"><p className="eyebrow">Modération</p><h1>Accès refusé</h1><p className="lead">Cette section est réservée aux membres de l’équipe de modération.</p></section></main>;

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/">PRYSM</Link>
      <nav>
        <Link href="/">Accueil</Link>
        <Link href="/forum">Forum</Link>
        <Link className="active" href="/moderation">Modération</Link>
        {isAdmin && <Link href="/admin">Administration</Link>}
        <Link href="/profil">Profil</Link>
      </nav>
    </header>
    <section className="page-head compact"><p className="eyebrow">Modération</p><h1>Centre de contrôle</h1><p className="lead">Examine les signalements, verrouille les sujets problématiques et garde une trace des décisions de modération.</p></section>
    {isAdmin && <div className="notice"><strong>ADMIN</strong> · Tu disposes des pouvoirs complets. <Link href="/admin">Gérer les rôles et les accès →</Link></div>}
    {error && <div className="notice error">{error}</div>}
    <BadgeManager />
    <section className="moderation-list">
      {reports.length === 0 ? <div className="empty"><div className="empty-symbol">✓</div><h2>Aucun signalement</h2><p>La file de modération est vide.</p></div> : reports.map((report) => {
        const topicId = report.forum_posts?.topic_id;
        const locked = topicId ? Boolean(lockedTopics[topicId]) : false;
        return <article className="moderation-card" key={report.id}>
          <div className="moderation-meta"><strong>{reasonLabels[report.reason] ?? report.reason}</strong><span>{new Date(report.created_at).toLocaleString("fr-FR")}</span></div>
          <p className="reported-body">{report.forum_posts?.body || "Message supprimé ou introuvable."}</p>
          {report.details && <p className="report-detail">{report.details}</p>}
          <div className="moderation-actions">
            {topicId && <button className="button moderation-lock" type="button" disabled={busy === report.id} onClick={() => void toggleTopicLock(report)}>{locked ? "Déverrouiller le sujet" : "Verrouiller le sujet"}</button>}
            <select disabled={busy === report.id} value={report.status} onChange={(e) => void updateStatus(report.id, e.target.value)}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
          </div>
        </article>;
      })}
    </section>
  </main>;
}