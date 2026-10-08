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
    e.preventDefault(); setLoading(true); setMessage("");
    if(mode==="signup"){
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback?next=/profil`;
      const {error}=await supabase.auth.signUp({
        email,
        password,
        options:{
          data:{username,display_name:username},
          emailRedirectTo: redirectTo,
        },
      });
      setMessage(error ? error.message : "Compte créé. Vérifie ton e-mail pour confirmer ton adresse.");
    } else {
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error) setMessage(error.message); else window.location.href="/profil";
    }
    setLoading(false);
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
        <label>Mot de passe<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <button className="button primary" disabled={loading}>{loading?"Patiente…":mode==="login"?"Se connecter":"Créer mon compte"}</button>
      </form>
      {message && <div className="notice">{message}</div>}
      <button className="switch" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("")}}>{mode==="login"?"Pas encore de compte ? Créer un compte":"Déjà un compte ? Se connecter"}</button>
    </section>
  </main>;
}
