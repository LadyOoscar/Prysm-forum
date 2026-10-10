"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Member = {
  id: string;
  username: string;
  display_name: string;
  is_moderator: boolean;
  is_admin: boolean;
};

export default function AdminPage() {
  const supabase = createSupabaseBrowser();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAllowed(false);
      return;
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!me?.is_admin) {
      setAllowed(false);
      return;
    }

    setAllowed(true);
    setCurrentUserId(user.id);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, is_moderator, is_admin")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("Impossible de charger les membres.");
      return;
    }

    setMembers((data ?? []) as Member[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setRole(member: Member, field: "is_moderator" | "is_admin", value: boolean) {
    setBusy(member.id);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value, ...(field === "is_admin" && value ? { is_moderator: true } : {}) })
      .eq("id", member.id);

    if (error) {
      setMessage(error.message.includes("ROLE_CHANGE_FORBIDDEN")
        ? "Seul un administrateur peut modifier les rôles."
        : "Impossible de modifier les droits de ce membre.");
      setBusy(null);
      return;
    }

    const updates: Partial<Member> = field === "is_admin"
      ? { is_admin: value, ...(value ? { is_moderator: true } : {}) }
      : { is_moderator: value };
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, ...updates } : item));
    setMessage("Droits mis à jour.");
    setBusy(null);
  }

  if (allowed === null) {
    return <main className="shell"><section className="page-head"><p className="eyebrow">Administration</p><h1>Chargement…</h1></section></main>;
  }

  if (!allowed) {
    return <main className="shell"><section className="page-head"><p className="eyebrow">Administration</p><h1>Accès refusé</h1><p className="lead">Cette section est réservée aux administrateurs PRYSM.</p><Link className="button" href="/forum">Retour au forum</Link></section></main>;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link href="/forum">Forum</Link>
          <Link href="/moderation">Modération</Link>
          <Link className="active" href="/admin">Administration</Link>
          <Link href="/profil">Profil</Link>
        </nav>
      </header>

      <section className="page-head compact">
        <p className="eyebrow">Pouvoirs système</p>
        <h1>Administration.</h1>
        <p className="lead">Gestion des rôles et des accès sensibles de PRYSM. Les protections sont appliquées côté base de données, pas uniquement dans l’interface.</p>
      </section>

      {message && <div className="notice">{message}</div>}

      <section className="admin-action-grid">
        <Link className="admin-action-card" href="#roles"><span className="admin-action-icon">👑</span><strong>Rôles & permissions</strong><small>Promouvoir ou retirer les droits Admin et Modo.</small></Link>
        <Link className="admin-action-card" href="/moderation"><span className="admin-action-icon">🛡️</span><strong>Centre de modération</strong><small>Accéder à la file des signalements et aux sanctions.</small></Link>
        <Link className="admin-action-card" href="/moderation#badges"><span className="admin-action-icon">⬡</span><strong>Atelier de badges</strong><small>Créer les insignes PNG et attribuer les badges manuellement.</small></Link>
        <div className="admin-action-card locked"><span className="admin-action-icon">📋</span><strong>Journal sensible</strong><small>Les actions de rôles sont protégées côté base de données et restent traçables.</small></div>
      </section>

      <section id="roles" className="admin-section-head"><p className="eyebrow">Gestion d’équipe</p><h2>Rôles & permissions</h2><p>Les comptes Admin disposent des pouvoirs système. Les Modos restent limités aux outils communautaires.</p></section>

      <section className="moderation-list">
        {members.map((member) => (
          <article className="moderation-card" key={member.id}>
            <div className="moderation-meta">
              <strong>{member.display_name || member.username}</strong>
              <span>@{member.username}</span>
            </div>
            <div className="moderation-actions">
              <button
                className={member.is_admin ? "button primary" : "button"}
                type="button"
                disabled={busy === member.id || member.id === currentUserId}
                onClick={() => void setRole(member, "is_admin", !member.is_admin)}
              >
                {member.is_admin ? (member.id === currentUserId ? "ADMIN (toi)" : "Retirer admin") : "Promouvoir admin"}
              </button>
              <button
                className={member.is_moderator ? "button primary" : "button"}
                type="button"
                disabled={busy === member.id || (!member.is_moderator && member.is_admin)}
                onClick={() => void setRole(member, "is_moderator", !member.is_moderator)}
              >
                {member.is_moderator ? "MODÉRATEUR" : "Nommer modérateur"}
              </button>
              {member.is_moderator && !member.is_admin && member.id !== currentUserId && (
                <button
                  className="button"
                  type="button"
                  disabled={busy === member.id}
                  onClick={() => void setRole(member, "is_moderator", false)}
                >
                  Retirer modération
                </button>
              )}
              {member.is_admin && <span className="status">POUVOIRS COMPLETS</span>}
              {member.id === currentUserId && <span className="status">COMPTE PROTÉGÉ</span>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
