"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import ModerationSanction from "../components/moderation-sanction";
import BadgeWorkshop from "./badge-workshop";

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
  const [filter, setFilter] = useState<string>("open");
  const [search, setSearch] = useState("");

  async function load() {
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAllowed(false); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("is_moderator,is_admin").eq("id", user.id).maybeSingle();
    if (profileError) { setError("Impossible de vérifier les droits de modération."); setAllowed(false); return; }
    if (!profile?.is_moderator && !profile?.is_admin) { setAllowed(false); return; }
    setAllowed(true);
    setIsAdmin(Boolean(profile.is_admin));

    const { data, error } = await supabase.from("forum_reports")
      .select("id, post_id, reporter_id, reason, details, status, created_at, forum_posts:post_id(body, topic_id)")
      .order("created_at", { ascending: false });
    if (error) { setError("Impossible de charger les signalements : " + error.message); return; }

    const nextReports = (data ?? []) as unknown as Report[];
    setReports(nextReports);
    const topicIds = [...new Set(nextReports.map((report) => report.forum_posts?.topic_id).filter(Boolean))] as string[];
    if (topicIds.length) {
      const { data: topics, error: topicsError } = await supabase.from("forum_topics").select("id, locked").in("id", topicIds);
      if (topicsError) setError("Signalements chargés, mais l'état de certains sujets n'a pas pu être lu.");
      const state: Record<string, boolean> = {};
      for (const topic of topics ?? []) state[topic.id] = topic.locked;
      setLockedTopics(state);
    } else setLockedTopics({});
  }

  useEffect(() => { void load(); }, []);

  async function recordAction(reportId: string | null, postId: string | null, action: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Session expirée : l'action n'a pas pu être journalisée.";
    const { error } = await supabase.from("moderation_actions").insert({ moderator_id: user.id, report_id: reportId, post_id: postId, action });
    return error ? "Action effectuée, mais journalisation impossible : " + error.message : "";
  }

  async function updateStatus(id: string, status: string) {
    setBusy(id); setError("");
    const { error } = await supabase.from("forum_reports").update({ status }).eq("id", id);
    if (error) { setError("Impossible de modifier le signalement : " + error.message); setBusy(null); return; }
    const report = reports.find((item) => item.id === id);
    const logWarning = await recordAction(id, report?.post_id ?? null, status === "resolved" ? "resolve_report" : status === "dismissed" ? "dismiss_report" : "review_report");
    setReports((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    if (logWarning) setError(logWarning);
    setBusy(null);
  }

  async function toggleTopicLock(report: Report) {
    const topicId = report.forum_posts?.topic_id;
    if (!topicId) { setError("Le sujet lié à ce message est introuvable."); return; }
    const nextLocked = !lockedTopics[topicId];
    setBusy(report.id); setError("");
    const { error } = await supabase.from("forum_topics").update({ locked: nextLocked }).eq("id", topicId).select("id");
    if (error) { setError("Impossible de modifier le verrouillage : " + error.message); setBusy(null); return; }
    const logWarning = await recordAction(report.id, report.post_id, nextLocked ? "lock_topic" : "unlock_topic");
    setLockedTopics((current) => ({ ...current, [topicId]: nextLocked }));
    if (logWarning) setError(logWarning);
    setBusy(null);
  }

  async function deletePost(report: Report) {
    if (!report.post_id || !window.confirm("Supprimer définitivement le message signalé ? Cette action est irréversible.")) return;
    setBusy(report.id); setError("");
    const logWarning = await recordAction(report.id, report.post_id, "delete_post");
    const { data, error } = await supabase.from("forum_posts").delete().eq("id", report.post_id).select("id");
    if (error) { setError("Suppression impossible : " + error.message); setBusy(null); return; }
    if (!data?.length) { setError("Aucun message supprimé. Vérifie les droits RLS de la base."); setBusy(null); return; }
    setReports((current) => current.filter((item) => item.post_id !== report.post_id));
    if (logWarning) setError("Message supprimé. " + logWarning);
    setBusy(null);
  }

  const visibleReports = useMemo(() => reports.filter((report) => {
    const matchesStatus = filter === "all" || report.status === filter;
    const haystack = [report.reason, reasonLabels[report.reason], report.details, report.forum_posts?.body].filter(Boolean).join(" ").toLocaleLowerCase("fr");
    return matchesStatus && haystack.includes(search.trim().toLocaleLowerCase("fr"));
  }), [reports, filter, search]);

  if (allowed === null) return <main className="shell"><section className="page-head"><p className="eyebrow">Modération</p><h1>Chargement…</h1></section></main>;
  if (!allowed) return <main className="shell"><section className="page-head"><p className="eyebrow">Modération</p><h1>Accès refusé</h1><p className="lead">Cette section est réservée aux modérateurs et administrateurs.</p><Link className="button" href="/forum">Retour au forum</Link></section></main>;

  const openCount = reports.filter((report) => report.status === "open").length;
  const reviewedCount = reports.filter((report) => report.status === "reviewed").length;

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/">PRYSM</Link>
      <nav>
        <Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link className="active" href="/moderation">Modération</Link>
        {isAdmin && <Link href="/admin">Administration</Link>}<Link href="/profil">Profil</Link>
      </nav>
    </header>
    <section className="page-head compact"><p className="eyebrow">Modération</p><h1>Centre de contrôle</h1><p className="lead">Traite les signalements, agis sur les contenus et conserve une trace des décisions.</p></section>
    <div className="moderator-action-grid">
      <div className="moderator-action-card"><span>🚨</span><strong>{openCount} signalement(s) ouvert(s)</strong><small>Alertes qui nécessitent une décision.</small></div>
      <div className="moderator-action-card"><span>🔎</span><strong>{reviewedCount} en cours d'examen</strong><small>Signalements déjà pris en charge.</small></div>
      <div className="moderator-action-card"><span>🗑️</span><strong>Actions sur les contenus</strong><small>Ouvrir le sujet, verrouiller ou supprimer le message.</small></div>
      <div className="moderator-action-card"><span>🛡️</span><strong>{isAdmin ? "ADMIN" : "MODO"}</strong><small>{isAdmin ? "Accès au panneau d'administration." : "Outils communautaires, sans gestion des rôles."}</small></div>
    </div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="moderation-queue-tools">
      <div className="section-heading"><div><p className="eyebrow">File de traitement</p><h2>Signalements</h2></div><button className="button" type="button" onClick={() => void load()}>Actualiser</button></div>
      <div className="moderation-search">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher dans le contenu ou le motif" aria-label="Rechercher un signalement" />
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filtrer par statut">
          <option value="open">Ouverts</option><option value="reviewed">En examen</option><option value="resolved">Résolus</option><option value="dismissed">Rejetés</option><option value="all">Tous les statuts</option>
        </select>
      </div>
    </section>
    <ModerationSanction />
    <section className="moderation-list">
      {visibleReports.length === 0 ? <div className="empty"><div className="empty-symbol">✓</div><h2>{reports.length ? "Aucun résultat" : "Aucun signalement"}</h2><p>{reports.length ? "Essaie un autre filtre ou une autre recherche." : "La file de modération est vide."}</p></div> : visibleReports.map((report) => {
        const topicId = report.forum_posts?.topic_id;
        const locked = topicId ? Boolean(lockedTopics[topicId]) : false;
        return <article className="moderation-card" key={report.id}>
          <div className="moderation-meta"><strong>{reasonLabels[report.reason] ?? report.reason}</strong><span>{statusLabels[report.status] ?? report.status} · {new Date(report.created_at).toLocaleString("fr-FR")}</span></div>
          <p className="reported-body">{report.forum_posts?.body || "Message supprimé ou introuvable."}</p>
          {report.details && <p className="report-detail"><strong>Précisions :</strong> {report.details}</p>}
          <div className="moderation-actions">
            {topicId && <Link className="button" href={"/topic/" + topicId} target="_blank">Voir le sujet ↗</Link>}
            {topicId && <button className="button moderation-lock" type="button" disabled={busy === report.id} onClick={() => void toggleTopicLock(report)}>{locked ? "Déverrouiller le sujet" : "Verrouiller le sujet"}</button>}
            {report.forum_posts && <button className="button danger" type="button" disabled={busy === report.id} onClick={() => void deletePost(report)}>Supprimer le message</button>}
            <select disabled={busy === report.id} value={report.status} onChange={(event) => void updateStatus(report.id, event.target.value)} aria-label="Statut du signalement">{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
          </div>
        </article>;
      })}
    </section>
    <BadgeWorkshop />
  </main>;
}
