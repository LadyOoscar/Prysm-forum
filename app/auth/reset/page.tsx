"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

export default function ResetPasswordPage() {
  const supabase = createSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/auth/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setMessage(
      error
        ? error.message
        : "Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d'être envoyé."
    );
    setLoading(false);
  }

  return <main className="shell auth-shell">
    <header className="topbar">
      <Link className="brand" href="/">PRYSM</Link>
      <nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link></nav>
    </header>
    <section className="auth-card">
      <p className="eyebrow">Sécurité du compte</p>
      <h1>Réinitialiser le mot de passe</h1>
      <p className="lead">Entre ton adresse e-mail. Pour éviter de révéler quels comptes existent, PRYSM affiche le même résultat dans les deux cas.</p>
      <form onSubmit={submit}>
        <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <button className="button primary" disabled={loading}>{loading ? "Envoi…" : "Recevoir le lien"}</button>
      </form>
      {message && <div className="notice">{message}</div>}
      <Link className="switch" href="/auth">Retour à la connexion</Link>
    </section>
  </main>;
}
