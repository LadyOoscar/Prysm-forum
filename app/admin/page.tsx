"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PrysmNav from "@/components/PrysmNav";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    const db = createClient();
    void (async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) { setAllowed(false); return; }
      const { data } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      setAllowed(Boolean(data?.is_admin));
    })();
  }, []);

  return <>
    <PrysmNav />
    <main className="shell" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 72px" }}>
      <p className="eyebrow">PRYSM // Contrôle système</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", marginBottom: 8 }}>Administration</h1>
      <p style={{ opacity: .8, maxWidth: 720, lineHeight: 1.7 }}>Outils réservés aux administrateurs du forum.</p>
      {allowed === null ? <p>Vérification des accès…</p> : !allowed ? <section className="panel" style={{ padding: 24, marginTop: 24 }}><h2>Accès refusé</h2><p>Connecte-toi avec un compte administrateur pour accéder à cette section.</p><Link className="button" href="/profile">Retour au profil</Link></section> : <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16, marginTop: 28 }}>
        <Link href="/admin/decorations" className="panel" style={{ display: "block", padding: 24, borderRadius: 18, textDecoration: "none", border: "1px solid var(--line, rgba(255,255,255,.14))" }}>
          <span style={{ fontSize: 32 }}>🖼️</span><h2 style={{ margin: "12px 0 8px" }}>Atelier de décorations PNG</h2><p style={{ opacity: .78, lineHeight: 1.6 }}>Importer des images transparentes, choisir leur emplacement et régler leur affichage sur mobile et ordinateur.</p><strong>Ouvrir l’atelier ↗</strong>
        </Link>
        <Link href="/moderation" className="panel" style={{ display: "block", padding: 24, borderRadius: 18, textDecoration: "none", border: "1px solid var(--line, rgba(255,255,255,.14))" }}>
          <span style={{ fontSize: 32 }}>🛡️</span><h2 style={{ margin: "12px 0 8px" }}>Modération</h2><p style={{ opacity: .78, lineHeight: 1.6 }}>Accéder aux outils communautaires et aux signalements.</p><strong>Ouvrir la modération ↗</strong>
        </Link>
      </section>}
    </main>
  </>;
}
