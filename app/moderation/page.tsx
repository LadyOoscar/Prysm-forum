"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Report = {
  id: string;
  reporter_id: string;
  topic_id: string | null;
  post_id: string | null;
  reason: string;
  status: string;
  created_at: string;
};

type Role = { role: "community_moderator" | "admin" | "founder"; community_id: string | null };

export default function ModerationPage() {
  const supabase = createClient();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: claims } = await supabase.auth.getClaims();
      const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
      if (!userId) {
        router.push("/login");
        return;
      }

      const { data: roles } = await supabase
        .from("moderation_roles")
        .select("role,community_id")
        .eq("user_id", userId);

      const currentRole = (roles?.[0] ?? null) as Role | null;
      if (!currentRole) {
        setLoading(false);
        return;
      }

      setRole(currentRole);
      const { data } = await supabase
        .from("reports")
        .select("id,reporter_id,topic_id,post_id,reason,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      setReports((data ?? []) as Report[]);
      setLoading(false);
    }

    load();
  }, []);

  async function updateReport(report: Report, status: "reviewing" | "resolved" | "dismissed") {
    setMessage("");
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (!actorId) return;

    const { error } = await supabase
      .from("reports")
      .update({ status, reviewed_by: actorId, reviewed_at: new Date().toISOString() })
      .eq("id", report.id);

    if (error) {
      setMessage("Impossible de mettre à jour ce signalement.");
      return;
    }

    await supabase.from("moderation_logs").insert({
      actor_id: actorId,
      target_user_id: report.reporter_id,
      topic_id: report.topic_id,
      post_id: report.post_id,
      action: `report_${status}`,
      reason: report.reason,
      metadata: { report_id: report.id },
    });

    setReports(current => current.map(item => item.id === report.id ? { ...item, status } : item));
  }

  if (loading) return <main><div className="authPage"><div className="authCard"><p>Chargement de la modération…</p></div></div></main>;

  if (!role) {
    return <main><div className="authPage"><div className="authCard"><h1>Accès refusé</h1><p className="authIntro">Cette section est réservée aux membres de l’équipe de modération.</p><button className="primary" onClick={() => router.push("/")}>Retour au forum</button></div></div></main>;
  }

  return (
    <main>
      <header>
        <div className="brand">PRYSM<span>✦</span></div>
        <nav><a href="/">Forum</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav>
        <a className="profile" href="/profile">☾ <span>Mon profil</span></a>
      </header>
      <div className="moderationPage">
        <button className="backButton" onClick={() => router.push("/")}>← Retour au forum</button>
        <p className="eyebrow">KAEL · JUSTICE</p>
        <h1>Centre de modération</h1>
        <p className="moderationIntro">Les signalements sont examinés par des humains. Les outils de PRYSM assistent le tri, mais les sanctions importantes restent une décision humaine.</p>
        {message && <p className="authMessage">{message}</p>}
        <section className="reportList">
          {reports.length === 0 ? <article className="emptyCommunity"><div className="communityHeroIcon">⚖️</div><h3>Aucun signalement en attente.</h3><p>La salle de Kael est silencieuse.</p></article> : reports.map(report => (
            <article className="reportItem" key={report.id}>
              <div className="reportTop"><span className={`reportStatus status-${report.status}`}>{report.status}</span><span>{new Date(report.created_at).toLocaleString("fr-FR")}</span></div>
              <h3>{report.topic_id ? "Sujet signalé" : "Réponse signalée"}</h3>
              <p>{report.reason}</p>
              <div className="reportMeta">Signalement #{report.id.slice(0, 8)} · par {report.reporter_id.slice(0, 8)}</div>
              <div className="reportActions">
                <button className="moderationButton" onClick={() => updateReport(report, "reviewing")}>En cours</button>
                <button className="moderationButton" onClick={() => updateReport(report, "resolved")}>Résolu</button>
                <button className="moderationButton" onClick={() => updateReport(report, "dismissed")}>Classé sans suite</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
