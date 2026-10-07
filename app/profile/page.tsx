"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PrysmNav from "@/components/PrysmNav";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  pronouns: string | null;
  reputation: number;
  banner_url: string | null;
  identity: string | null;
  interests: string[];
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
    const supabase = createClient();
      const { data: claimsData } = await supabase.auth.getClaims();

      if (!claimsData?.claims?.sub) {
        window.location.href = "/login";
        return;
      }

      setEmail(typeof claimsData.claims.email === "string" ? claimsData.claims.email : "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, banner_url, pronouns, identity, interests, reputation")
        .eq("id", claimsData.claims.sub)
        .single();

      if (error || !data) {
        setMessage("Impossible de charger ton profil.");
      } else {
        setProfile(data as Profile);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function saveProfile(event: React.FormEvent) {
    const supabase = createClient();
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage("");

    let avatarUrl = profile.avatar_url;

    const username = profile.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);

    if (username.length < 3) {
      setMessage("Le pseudo doit contenir au moins 3 caractères valides.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: profile.display_name.trim().slice(0, 60),
        bio: profile.bio.slice(0, 500),
        pronouns: profile.pronouns?.trim().slice(0, 40) || null,
        avatar_url: avatarUrl,
        banner_url: profile.banner_url,
        identity: profile.identity?.trim().slice(0, 80) || null,
        interests: [...new Set(profile.interests.map(item => item.trim()).filter(Boolean))].slice(0, 12),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("id, username, display_name, bio, avatar_url, banner_url, pronouns, identity, interests, reputation")
      .single();

    if (error) {
      setMessage(error.message.includes("duplicate") ? "Ce pseudo est déjà pris." : error.message);
    } else {
      setProfile(data as Profile);
      setMessage("Profil enregistré.");
    }

    setSaving(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return <main className="authPage"><div className="authCard"><p className="authMessage">Chargement du profil…</p></div></main>;
  }

  if (!profile) {
    return <main className="authPage"><div className="authCard"><a className="brand authBrand" href="/">PRYSM<span>✦</span></a><p className="authMessage">{message}</p></div></main>;
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <a className="brand authBrand" href="/">PRYSM<span>✦</span></a>
        <p className="eyebrow">MON PROFIL</p>
        <h1>{profile.display_name || profile.username}</h1>
        <p className="authIntro">Ton identité publique sur PRYSM. Tu peux la modifier à tout moment.</p>

        <div className="profileAvatarEditor">\n          <div className="publicAvatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile.display_name || profile.username).charAt(0).toUpperCase()}</div>\n          <div>\n            <strong>Photo de profil</strong>\n            <p>JPG, PNG, GIF ou WebP · 5 Mo maximum</p>\n            <label className="fileButton">Choisir une image<input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} /></label>\n            {avatarFile && <span className="fileName">{avatarFile.name}</span>}\n          </div>\n        </div>\n\n        <form onSubmit={saveProfile} className="authForm">
          <label>
            Pseudo
            <input value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} minLength={3} maxLength={32} required />
          </label>

          <label>
            Nom affiché
            <input value={profile.display_name} onChange={e => setProfile({...profile, display_name: e.target.value})} maxLength={60} required />
          </label>

          <label>
            Pronoms
            <input value={profile.pronouns ?? ""} onChange={e => setProfile({...profile, pronouns: e.target.value})} maxLength={40} placeholder="ex. elle / iel" />
          </label>

          <label>
            Identité
            <input value={profile.identity ?? ""} onChange={e => setProfile({...profile, identity: e.target.value})} maxLength={80} placeholder="ex. lesbienne, trans, non-binaire…" />
          </label>

          <label>
            Centres d'intérêt
            <input value={profile.interests.join(", ")} onChange={e => setProfile({...profile, interests: e.target.value.split(",").map(v => v.trim()).filter(Boolean).slice(0, 12)})} placeholder="jeux vidéo, fantasy, cuisine…" />
            <small className="fieldHint">Sépare les centres d'intérêt par des virgules, jusqu'à 12.</small>
          </label>

          <label>
            Bio
            <textarea
              value={profile.bio}
              onChange={e => setProfile({...profile, bio: e.target.value})}
              maxLength={500}
              rows={5}
              style={{background:"#100c18",border:"1px solid #3a3044",color:"#eee",borderRadius:9,padding:12,resize:"vertical"}}
              placeholder="Quelques mots sur toi…"
            />
          </label>

          <label>
            Avatar
            <input type="url" value={profile.avatar_url ?? ""} onChange={e => setProfile({...profile, avatar_url: e.target.value})} placeholder="https://…" />
          </label>

          <label>
            Bannière
            <input type="url" value={profile.banner_url ?? ""} onChange={e => setProfile({...profile, banner_url: e.target.value})} placeholder="https://…" />
          </label>

          <label>
            E-mail
            <input type="email" value={email} disabled />
          </label>

          <p className="authMessage">⭐ Réputation : {profile.reputation}</p>
          {message && <p className="authMessage">{message}</p>}

          <button className="primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer mon profil"}</button>
        </form>

        <button className="authSwitch" onClick={signOut}>Se déconnecter</button>
        <a className="authSwitch" href="/">← Retour au forum</a>
      </div>
    </main>
  );
}