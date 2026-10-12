"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

export default function AdminCustomizationPage() {
  const db = createSupabaseBrowser();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await db.auth.getUser();
      if (!user) { setAllowed(false); return; }
      const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      setAllowed(Boolean(profile?.is_admin));
    }
    void checkAccess();
  }, []);

  if (allowed === null) return <main className="shell"><section className="page-head"><h1>Chargement…</h1></section></main>;
  if (!allowed) return <main className="shell"><section className="page-head"><p className="eyebrow">Administration</p><h1>Accès refusé</h1><p className="lead">La personnalisation du forum est réservée aux administrateurs PRYSM.</p><Link className="button" href="/forum">Retour au forum</Link></section></main>;

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
        <p className="eyebrow">Administration // Atelier visuel</p>
        <h1>Personnalisation du forum.</h1>
        <p className="lead">Tous les outils qui façonnent l’apparence et l’identité de PRYSM, réunis au même endroit.</p>
      </section>

      <div className="admin-subtabs" aria-label="Sous-sections administration">
        <Link className="button" href="/admin">Gestion &amp; sécurité</Link>
        <Link className="button primary" href="/admin/customization" aria-current="page">🎨 Personnalisation du forum</Link>
      </div>

      <section className="admin-section-head">
        <p className="eyebrow">Modules disponibles</p>
        <h2>Identité visuelle</h2>
        <p>Les changements des modules disponibles sont partagés avec l’ensemble des visiteurs du forum.</p>
      </section>

      <section className="admin-action-grid">
        <Link className="admin-action-card" href="/admin/decorations">
          <span className="admin-action-icon">🖼️</span>
          <strong>Icônes &amp; décorations</strong>
          <small>Importer des PNG, personnaliser les icônes des onglets, régler leur taille, leur position et leur visibilité sur mobile ou ordinateur.</small>
        </Link>
        <Link className="admin-action-card" href="/moderation#badges">
          <span className="admin-action-icon">⬡</span>
          <strong>Badges &amp; insignes</strong>
          <small>Créer les badges illustrés et gérer leur attribution manuelle aux membres.</small>
        </Link>
        <article className="admin-action-card locked">
          <span className="admin-action-icon">🎨</span>
          <strong>Palette &amp; couleurs</strong>
          <small>Module à venir : centraliser les couleurs, les accents lumineux et les contrastes du thème PRYSM.</small>
        </article>
        <article className="admin-action-card locked">
          <span className="admin-action-icon">📺</span>
          <strong>Logo &amp; habillage</strong>
          <small>Module à venir : gérer le logo, les éléments graphiques communs et l’habillage de l’interface.</small>
        </article>
        <article className="admin-action-card locked">
          <span className="admin-action-icon">🧭</span>
          <strong>Navigation &amp; libellés</strong>
          <small>Module à venir : personnaliser les intitulés et l’apparence des onglets du forum.</small>
        </article>
      </section>

      <p className="decoration-footnote">Les modules marqués « à venir » sont des emplacements prévus, pas des réglages déjà actifs.</p>
    </main>
  );
}
