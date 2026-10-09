"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

type Invitation = {
  id: string;
  sender_id: string;
  recipient_id: string;
  intention: "friendship" | "romance" | "discussion" | "community";
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};
type Profile = { id: string; username: string; display_name: string; avatar_url: string | null };

const intentionLabel: Record<Invitation["intention"], string> = {
  friendship: "Amitié",
  romance: "Romance",
  discussion: "Discussion",
  community: "Découverte communautaire",
};

export default function InvitationsPage() {
  const supabase = createSupabaseBrowser();
  const [userId, setUserId] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(currentUserId?: string) {
    const id = currentUserId || userId;
    if (!id) return;
    const { data, error: queryError } = await supabase
      .from("dating_invitations")
      .select("id,sender_id,recipient_id,intention,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) {
      setError("Impossible de charger les invitations.");
      setLoading(false);
      return;
    }
    const rows = (data || []) as Invitation[];
    setInvitations(rows);
    const ids = Array.from(new Set(rows.flatMap((item) => [item.sender_id, item.recipient_id]).filter((item) => item !== id)));
    if (ids.length) {
      const { data: people } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", ids);
      const byId: Record<string, Profile> = {};
      (people || []).forEach((person) => { byId[person.id] = person as Profile; });
      setProfiles(byId);
    } else {
      setProfiles({});
    }
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/auth"; return; }
      setUserId(data.user.id);
      await load(data.user.id);
    }
    void init();
  }, []);

  async function respond(invitation: Invitation, status: "accepted" | "declined") {
    if (!userId || busyId) return;
    setBusyId(invitation.id);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase
      .from("dating_invitations")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", invitation.id)
      .eq("recipient_id", userId)
      .eq("status", "pending");
    if (updateError) {
      setError(status === "accepted"
        ? "Impossible d’accepter cette invitation. Vérifie que vous ne vous êtes pas bloqués."
        : "Impossible de refuser cette invitation.");
    } else {
      setNotice(status === "accepted"
        ? "Invitation acceptée. Votre match est maintenant créé."
        : "Invitation refusée. Cette réponse reste privée.");
      await load(userId);
    }
    setBusyId("");
  }

  const incoming = invitations.filter((item) => item.recipient_id === userId);
  const outgoing = invitations.filter((item) => item.sender_id === userId);

  function card(invitation: Invitation, received: boolean) {
    const otherId = received ? invitation.sender_id : invitation.recipient_id;
    const person = profiles[otherId];
    const name = person?.display_name || person?.username || "Membre";
    const statusLabel = invitation.status === "accepted" ? "Acceptée" : invitation.status === "declined" ? "Refusée" : "En attente";
    return (
      <article className="invitation-card" key={invitation.id}>
        <div className="invitation-avatar">{person?.avatar_url ? <img src={person.avatar_url} alt="" /> : name.slice(0, 1).toUpperCase()}</div>
        <div className="invitation-body">
          <p className="eyebrow">{received ? "Invitation reçue" : "Invitation envoyée"} · {intentionLabel[invitation.intention]}</p>
          <h2>{name}{person?.username && <span> @{person.username}</span>}</h2>
          {invitation.message && <p className="invitation-message">{invitation.message}</p>}
          <p className="invitation-status">{statusLabel} · {new Date(invitation.created_at).toLocaleDateString("fr-FR")}</p>
          {received && invitation.status === "pending" && (
            <div className="actions">
              <button className="button primary" disabled={!!busyId} onClick={() => void respond(invitation, "accepted")}>{busyId === invitation.id ? "Traitement…" : "Accepter"}</button>
              <button className="button" disabled={!!busyId} onClick={() => void respond(invitation, "declined")}>Refuser</button>
            </div>
          )}
          {invitation.status === "accepted" && <Link className="button" href="/rencontres/matchs">Voir mes matchs</Link>}
          {person?.username && <Link className="profile-link" href={"/membre/" + person.username}>Voir le profil</Link>}
        </div>
      </article>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link className="active" href="/rencontres">Rencontres</Link><Link href="/messages">Messages</Link><Link href="/profil">Profil</Link></nav>
      </header>
      <section className="page-head">
        <p className="eyebrow">Rencontres · privé</p>
        <h1>Mes invitations</h1>
        <p className="lead">Les intentions et les réponses restent entre les personnes concernées. Un match se crée seulement après acceptation.</p>
        <div className="actions"><Link className="button" href="/rencontres">Découvrir des membres</Link><Link className="button" href="/rencontres/matchs">Mes matchs</Link></div>
      </section>
      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {loading ? <div className="empty"><p>Chargement des invitations…</p></div> : (
        <div className="invitation-columns">
          <section>
            <div className="section-title"><span>Reçues</span><strong>{incoming.length}</strong></div>
            {incoming.length ? incoming.map((item) => card(item, true)) : <div className="empty"><h2>Aucune invitation reçue</h2><p>Les nouvelles invitations apparaîtront ici.</p></div>}
          </section>
          <section>
            <div className="section-title"><span>Envoyées</span><strong>{outgoing.length}</strong></div>
            {outgoing.length ? outgoing.map((item) => card(item, false)) : <div className="empty"><h2>Aucune invitation envoyée</h2><p>Tu peux inviter un membre depuis la page Rencontres.</p></div>}
          </section>
        </div>
      )}
      <style jsx>{`
        .invitation-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;padding-bottom:80px}
        .invitation-card{display:flex;gap:14px;padding:16px;margin:12px 0;border:1px solid var(--line);border-radius:15px;background:rgba(13,15,22,.72)}
        .invitation-avatar{width:58px;height:58px;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));font-size:1.4rem;font-weight:800;color:#0d0d14}
        .invitation-avatar img{width:100%;height:100%;object-fit:cover}
        .invitation-body{min-width:0}
        .invitation-body h2{margin:4px 0 8px;font-size:1.1rem}
        .invitation-body h2 span,.invitation-status{color:var(--muted);font-size:.82rem;font-weight:400}
        .invitation-message{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}
        .profile-link{display:inline-block;margin:10px 12px 0 0;color:var(--muted);font-size:.85rem}
        @media(max-width:760px){.invitation-columns{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
