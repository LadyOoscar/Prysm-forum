"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = "/";
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (data.user) {
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username: cleanUsername || "prysm-user",
          display_name: username.trim() || "Nouveau membre",
        });
        if (profileError) setMessage(profileError.message);
        else setMessage("Compte créé. Vérifie ton adresse e-mail si la confirmation est activée.");
      }
    }

    setLoading(false);
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <a className="brand authBrand" href="/">PRYSM<span>✦</span></a>
        <p className="eyebrow">{mode === "login" ? "BIENVENUE" : "REJOINDRE PRYSM"}</p>
        <h1>{mode === "login" ? "Ravi de te revoir." : "Entre dans le Cocon."}</h1>
        <p className="authIntro">
          {mode === "login"
            ? "Retrouve tes communautés, tes discussions et ton identité PRYSM."
            : "Crée ton compte et commence à construire ta place dans la communauté."}
        </p>

        <form onSubmit={submit} className="authForm">
          {mode === "signup" && (
            <label>
              Pseudo
              <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={32} />
            </label>
          )}
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          {message && <p className="authMessage">{message}</p>}
          <button className="primary" disabled={loading}>
            {loading ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <button className="authSwitch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà membre ? Se connecter"}
        </button>
      </div>
    </main>
  );
}
