"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Report = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  forum_posts: { body: string } | null;
};

const statuses = ["open", "reviewed", "resolved", "dismissed"];

export default function ModerationPage() {
  const supabase = createSupabaseBrowser();
  const [reports, setReports] = useState<Report[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAllowed(false); return; }
    const { data: profile } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle();
    if (!profile?.is_moderator) { setAllowed(false); return; }
    setAllowed(true);
    const { data, error } = await supabase.from("forum_reports").select("id, post_id, reporter_id, reason, details, status, created_at, forum_posts:post_id(body)").order("created_at", { ascending: false });
    if (error) setError("Impossible de charger les signalements.");
    else setReports((data ?? []) as unknown as Report[]);
  }

  useEffect(() => { void load(); }, []);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("forum_reports").update({ status }).eq("id", id);
    if (error) { setError("Impossible de modifier le signalement."); return; }
    setReports((current) => current.map((report) => report.id === id ? { ...report, status } : report));
  }

  if (allowed === null) return <main className="shell"><section className="page-head"><p className="eyebrow">Modération</p><h1>Chargement</h1></section></main>;
  if (!allowed) return <main className="shell"><section className="page-head"><p className="eyebrow">Modération</p><h1>Accès refusé</h1><p className="lead">Cette section est réservée aux membres de l’équipe de modération.</p></section></main>;

  return <main className="shell">
    <section className="page-head compact"><p className="eyebrow">Modération</p><h1>Signalements</h1><p className="lead">Examine les signalements reçus et mets à jour leur état.</p></section>
    {error && <div className="notice error">{error}</div>}
    <section className="moderation-list">
      {reports.length === 0 ? <div className="empty"><div className="empty-symbol">✓</div><h2>Aucun signalement</h2><p>La file de modération est vide.</p></div> : reports.map((report) => <article className="moderation-card" key={report.id}>
        <div className="moderation-meta"><strong>{report.reason}</strong><span>{new Date(report.created_at).toLocaleString("fr-FR")}</span></div>
        <p className="reported-body">{report.forum_posts?.body || "Message supprimé ou introuvable."}</p>
        {report.details && <p className="report-detail">{report.details}</p>}
        <div className="moderation-actions"><select value={report.status} onChange={(e) => void updateStatus(report.id, e.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
      </article>)}
    </section>
  </main>;
}
