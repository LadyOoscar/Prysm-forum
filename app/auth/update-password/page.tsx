"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

function validPassword(password: string) {
  return password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

export default function UpdatePasswordPage() {
  const supabase = createSupabaseBrowser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) setMessage("Le lien est invalide ou expiré. Demande un nouveau lien.");
    });
  }, [supabase]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!validPassword(password)) {
      setMessage("Le mot de passe doit contenir au moins 12 caractères, une minuscule, une majuscule, un chiffre et un symbole.");
      return;
    }
    if (password !== confirm) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : "Mot de passe modifié. Tu peux maintenant te reconnecter.");
    if (!error) {
      await supabase.auth.signOut();
      window.setTimeout(() => { window.location.href = "/auth"; }, 700);
    }
    setLoading(false);
  }

  return <main className="shell auth-shell">
    <header className="topbar">
      <Link className="brand" href="/">PRYSM</Link>
      <nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link></nav>
    </header>
    <section className="auth-card">
      <p className="eyebrow">Sécurité du compte</p>
      <h1>Nouveau mot de passe</h1>
      <p className="lead">Choisis une phrase de passe longue et unique. PRYSM exige au minimum 12 caractères avec minuscules, majuscules, chiffre et symbole.</p>
      <form onSubmit={submit}>
        <label>Nouveau mot de passe<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <label>Confirmation<input required minLength={12} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} /></label>
        <button className="button primary" disabled={loading || !ready}>{loading ? "Modification…" : "Changer le mot de passe"}</button>
      </form>
      {message && <div className="notice">{message}</div>}
      <Link className="switch" href="/auth">Retour à la connexion</Link>
    </section>
  </main>;
}
