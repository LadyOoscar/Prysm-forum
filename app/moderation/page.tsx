"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Report = {
  id: string; reporter_id: string; topic_id: string | null; post_id: string | null;
  reason: string; status: string; created_at: string;
};
type Role = { role: "community_moderator" | "admin" | "founder"; community_id: string | null };
type Target = { author_id: string; community_id: string; is_locked?: boolean };

export default function ModerationPage() {
  const supabase = createClient();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [targets, setTargets] = useState<Record<string, Target>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: claims } = await supabase.auth.getClaims();
      const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
      if (!userId) { router.push("/login"); return; }

      const { data: roles } = await supabase.from("moderation_roles").select("role,community_id").eq("user_id", userId);
      const currentRole = (roles?.[0] ?? null) as Role | null;
      if (!currentRole) { setLoading(false); return; }
      setRole(currentRole);

      const { data } = await supabase.from("reports")
        .select("id,reporter_id,topic_id,post_id,reason,status,created_at")
        .order("created_at", { ascending: false }).limit(100);
      const loaded = (data ?? []) as Report[];
      setReports(loaded);

      const next: Record<string, Target> = {};
      for (const report of loaded) {
        if (report.topic_id) {
          const { data: topic } = await supabase.from("topics")
            .select("author_id,community_id,is_locked").eq("id", report.topic_id).maybeSingle();
          if (topic) next[report.id] = topic as Target;
        } else if (report.post_id) {
          const { data: post } = await supabase.from("posts")
            .select("author_id,topic_id").eq("id", report.post_id).maybeSingle();
          if (post) {
            const { data: topic } = await supabase.from("topics")
              .select("community_id").eq("id", post.topic_id).maybeSingle();
            if (topic) next[report.id] = { author_id: post.author_id, community_id: topic.community_id };
          }
        }
      }
      setTargets(next);
      setLoading(false);
    }
    load();
  }, [router]);

  async function log(action: string, report: Report, target: Target, actorId: string) {
    await supabase.from("moderation_logs").insert({
      actor_id: actorId, target_user_id: target.author_id, topic_id: report.topic_id,
      post_id: report.post_id, action, reason: report.reason, metadata: { report_id: report.id }
    });
  }

  async function moderateContent(report: Report, action: "lock" | "unlock" | "delete") {
    const target = targets[report.id]; if (!target) return;
    setBusy(report.id); setMessage("");
    let error = null;
    if (report.topic_id) {
      if (action === "delete") ({ error } = await supabase.from("topics").delete().eq("id", report.topic_id));
      else ({ error } = await supabase.from("topics").update({ is_locked: action === "lock" }).eq("id", report.topic_id));
    } else if (report.post_id && action === "delete") {
      ({ error } = await supabase.from("posts").delete().eq("id", report.post_id));
    } else if (action !== "delete") {
      setMessage("Le verrouillage concerne les sujets."); setBusy(null); return;
    }
    if (error) { setMessage("Action refusée ou impossible."); setBusy(null); return; }
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (actorId) await log(`content_${action}`, report, target, actorId);
    if (action === "delete") setReports(current => current.filter(item => item.id !== report.id));
    else setTargets(current => ({ ...current, [report.id]: { ...target, is_locked: action === "lock" } }));
    setMessage(action === "delete" ? "Contenu supprimé." : action === "lock" ? "Sujet verrouillé." : "Sujet déverrouillé.");
    setBusy(null);
  }

  async function sanction(report: Report, type: "community_ban" | "global_ban") {
    const target = targets[report.id]; if (!target) return;
    if (type === "global_ban" && role?.role !== "admin" && role?.role !== "founder") return;
    setBusy(report.id); setMessage("");
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (!actorId) { setBusy(null); return; }
    const { error } = await supabase.from("user_sanctions").insert({
      user_id: target.author_id, actor_id: actorId, type,
      community_id: type === "community_ban" ? target.community_id : null,
      reason: report.reason,
      expires_at: type === "community_ban" ? new Date(Date.now() + 7 * 86400000).toISOString() : null
    });
    if (error) { setMessage("Sanction refusée."); setBusy(null); return; }
    await log(type, report, target, actorId);
    setMessage(type === "global_ban" ? "Bannissement global appliqué." : "Bannissement communautaire de 7 jours appliqué.");
    setBusy(null);
  }

  async function updateReport(report: Report, status: "reviewing" | "resolved" | "dismissed") {
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (!actorId) return;
    const { error } = await supabase.from("reports").update({
      status, reviewed_by: actorId, reviewed_at: new Date().toISOString()
    }).eq("id", report.id);
    if (error) { setMessage("Impossible de mettre à jour ce signalement."); return; }
    const target = targets[report.id];
    if (target) await log(`report_${status}`, report, target, actorId);
    setReports(current => current.map(item => item.id === report.id ? { ...item, status } : item));
  }

  if (loading) return <main><div className="authPage"><div className="authCard"><p>Chargement de la modération…</p></div></div></main>;
  if (!role) return <main><div className="authPage"><div className="authCard"><h1>Accès refusé</h1><p className="authIntro">Cette section est réservée à l’équipe de modération.</p><button className="primary" onClick={() => router.push("/")}>Retour au forum</button></div></div></main>;

  return <main>
    <header><div className="brand">PRYSM<span>✦</span></div><nav><a href="/">Forum</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav><a className="profile" href="/profile">☾ <span>Mon profil</span></a></header>
    <div className="moderationPage">
      <button className="backButton" onClick={() => router.push("/")}>← Retour au forum</button>
      <p className="eyebrow">KAEL · JUSTICE</p><h1>Centre de modération</h1>
      <p className="moderationIntro">Les signalements sont examinés par des humains. Les outils de PRYSM assistent le tri, mais les sanctions importantes restent une décision humaine.</p>
      {message && <p className="authMessage">{message}</p>}
      <section className="reportList">{reports.length === 0 ? <article className="emptyCommunity"><div className="communityHeroIcon">⚖️</div><h3>Aucun signalement.</h3><p>La salle de Kael est silencieuse.</p></article> : reports.map(report => {
        const target = targets[report.id];
        return <article className="reportItem" key={report.id}>
          <div className="reportTop"><span className={`reportStatus status-${report.status}`}>{report.status}</span><span>{new Date(report.created_at).toLocaleString("fr-FR")}</span></div>
          <h3>{report.topic_id ? "Sujet signalé" : "Réponse signalée"}</h3><p>{report.reason}</p>
          <div className="reportMeta">Signalement #{report.id.slice(0, 8)}{target ? ` · auteur ${target.author_id.slice(0, 8)}` : ""}</div>
          {target && <div className="reportActions">
            {report.topic_id && <button className="moderationButton" disabled={busy===report.id} onClick={() => moderateContent(report, target.is_locked ? "unlock" : "lock")}>{target.is_locked ? "Déverrouiller" : "Verrouiller"}</button>}
            <button className="moderationButton dangerButton" disabled={busy===report.id} onClick={() => moderateContent(report, "delete")}>Supprimer</button>
            <button className="moderationButton" disabled={busy===report.id} onClick={() => sanction(report, "community_ban")}>Ban 7 j.</button>
            {(role.role === "admin" || role.role === "founder") && <button className="moderationButton dangerButton" disabled={busy===report.id} onClick={() => sanction(report, "global_ban")}>Ban global</button>}
            <button className="moderationButton" onClick={() => updateReport(report, "reviewing")}>En cours</button>
            <button className="moderationButton" onClick={() => updateReport(report, "resolved")}>Résolu</button>
            <button className="moderationButton" onClick={() => updateReport(report, "dismissed")}>Classé sans suite</button>
          </div>}
        </article>;
      })}</section>
    </div>
  </main>;
}
