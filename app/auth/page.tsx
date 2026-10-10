"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

export default function AuthPage() {
  const supabase = createSupabaseBrowser();
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [username,setUsername]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "confirmation") {
      setMessage("Le lien de confirmation est invalide ou expiré. Demande un nouveau lien puis réessaie.");
    }
  }, []);

  async function submit(e:FormEvent){
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if(mode==="signup"){
        const cleanUsername = username.trim();
        if (!cleanUsername) {
          setMessage("Choisis un pseudo avant de créer ton compte.");
          return;
        }
        if (
          password.length < 12 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password) ||
          !/[^A-Za-z0-9]/.test(password)
        ) {
          setMessage("Le mot de passe doit contenir au moins 12 caractères, une minuscule, une majuscule, un chiffre et un symbole.");
          return;
        }
        const { data: existing, error: lookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();
        if (lookupError) {
          setMessage("Impossible de vérifier la disponibilité du pseudo. Réessaie dans un instant.");
          return;
        }
        if (existing) {
          setMessage("Ce pseudo est déjà utilisé. Choisis-en un autre.");
          return;
        }
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const redirectTo = `${siteUrl}/auth/callback?next=/profil`;
        const {error}=await supabase.auth.signUp({
          email: email.trim(),
          password,
          options:{
            data:{username:cleanUsername,display_name:cleanUsername},
            emailRedirectTo: redirectTo,
          },
        });
        if (error) {
          const detail = error.message.toLowerCase();
          setMessage(detail.includes("email") && (detail.includes("already") || detail.includes("registered"))
            ? "Un compte utilise déjà cette adresse e-mail."
            : detail.includes("profiles_username_key") || detail.includes("duplicate key")
              ? "Ce pseudo est déjà utilisé. Choisis-en un autre."
              : error.message);
        } else {
          setMessage("Compte créé. Vérifie ton e-mail pour confirmer ton adresse.");
        }
      } else {
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(error) setMessage(error.message); else window.location.href="/profil";
      }
    } catch {
      setMessage("La demande n’a pas abouti à cause d’un problème de connexion. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="shell auth-shell">
    <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link></nav></header>
    <section className="auth-card">
      <p className="eyebrow">Compte PRYSM</p>
      <h1>{mode==="login"?"Se connecter":"Créer un compte"}</h1>
      <p className="lead">{mode==="login"?"Retrouve tes discussions et ton profil.":"Rejoins la communauté et participe aux discussions."}</p>
      <form onSubmit={submit}>
        {mode==="signup" && <label>Pseudo<input required minLength={2} maxLength={32} value={username} onChange={e=>setUsername(e.target.value)} /></label>}
        <label>E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label>Mot de passe<input required minLength={12} type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <button className="button primary" disabled={loading}>{loading?"Patiente…":mode==="login"?"Se connecter":"Créer mon compte"}</button>
      </form>
      {message && <div className="notice">{message}</div>}
      {mode==="signup" && <p className="notice">Mot de passe : 12 caractères minimum, avec une minuscule, une majuscule, un chiffre et un symbole.</p>}
      {mode==="login" && <Link className="switch" href="/auth/reset">Mot de passe oublié ?</Link>}
      <button className="switch" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("")}}>{mode==="login"?"Pas encore de compte ? Créer un compte":"Déjà un compte ? Se connecter"}</button>
    </section>
  </main>;
}
