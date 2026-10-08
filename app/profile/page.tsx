"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PrysmNav from "@/components/PrysmNav";
import ProfileAvatar from "@/components/ProfileAvatar";

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
  age: number | null;
  location: string | null;
  orientation: string | null;
  looking_for: string | null;
  dating_enabled: boolean;
};

function normalizeUsername(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 32);
}

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
      const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      setEmail(typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,avatar_url,banner_url,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,reputation")
        .eq("id", userId)
        .single();

      if (error || !data) setMessage("Impossible de charger ton profil.");
      else setProfile(data as Profile);
      setLoading(false);
    }

    load();
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;

    const supabase = createClient();
    setSaving(true);
    setMessage("");

    const username = normalizeUsername(profile.username);
    const displayName = profile.display_name.trim().slice(0, 60);

    if (username.length < 3) {
      setMessage("Le pseudo doit contenir au moins 3 caractères.");
      setSaving(false);
      return;
    }

    if (!displayName) {
      setMessage("Le nom affiché ne peut pas être vide.");
      setSaving(false);
      return;
    }

    let avatarUrl = profile.avatar_url;

    if (avatarFile) {
      if (!avatarFile.type.startsWith("image/")) {
        setMessage("Le fichier choisi n'est pas une image.");
        setSaving(false);
        return;
      }

      if (avatarFile.size > 5 * 1024 * 1024) {
        setMessage("La photo doit faire 5 Mo maximum.");
        setSaving(false);
        return;
      }

      const extension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type, cacheControl: "3600" });

      if (uploadError) {
        setMessage("Impossible d'envoyer la photo. Vérifie le fichier puis réessaie.");
        setSaving(false);
        return;
      }

      avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        bio: profile.bio.slice(0, 500),
        pronouns: profile.pronouns?.trim().slice(0, 40) || null,
        avatar_url: avatarUrl,
        banner_url: profile.banner_url?.trim() || null,
        identity: profile.identity?.trim().slice(0, 80) || null,
        interests: [...new Set(profile.interests.map(item => item.trim()).filter(Boolean))].slice(0, 12),
        age: profile.age,
        location: profile.location?.trim().slice(0, 80) || null,
        orientation: profile.orientation?.trim().slice(0, 80) || null,
        looking_for: profile.looking_for?.trim().slice(0, 120) || null,
        dating_enabled: profile.dating_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("id,username,display_name,bio,avatar_url,banner_url,pronouns,identity,interests,reputation")
      .single();

    if (error) {
      setMessage(error.message.toLowerCase().includes("duplicate") ? "Ce pseudo est déjà pris." : "Impossible d'enregistrer le profil.");
    } else {
      setProfile(data as Profile);
      setAvatarFile(null);
      setMessage("Profil enregistré.");
    }

    setSaving(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <main className="authPage"><div className="authCard"><p className="authMessage">Chargement du profil…</p></div></main>;

  if (!profile) {
    return <main className="authPage"><div className="authCard"><a className="brand authBrand" href="/">PRYSM<span>✦</span></a><p className="authMessage">{message}</p></div></main>;
  }

  return (
    <main className="profilePage">
      <PrysmNav active="forum" />
      <div className="profileShell">
        <div className="authCard">
          <a className="brand authBrand" href="/">PRYSM<span>✦</span></a>
          <p className="eyebrow">MON PROFIL</p>
          <h1>{profile.display_name || profile.username}</h1>
          <p className="authIntro">Ton identité publique sur PRYSM. Tu peux la modifier à tout moment.</p>

          <div className="profileAvatarEditor">
            <ProfileAvatar src={profile.avatar_url} name={profile.display_name || profile.username} className="editorAvatar" />
            <div>
              <strong>Photo de profil</strong>
              <p>JPG, PNG, GIF ou WebP · 5 Mo maximum</p>
              <label className="fileButton">
                Choisir une image
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} />
              </label>
              {avatarFile && <span className="fileName">{avatarFile.name}</span>}
            </div>
          </div>

          <form onSubmit={saveProfile} className="authForm">
            <label>Pseudo<input value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} minLength={3} maxLength={32} required /></label>
            <label>Nom affiché<input value={profile.display_name} onChange={e => setProfile({...profile, display_name: e.target.value})} maxLength={60} required /></label>
            <label>Pronoms<input value={profile.pronouns ?? ""} onChange={e => setProfile({...profile, pronouns: e.target.value})} maxLength={40} placeholder="ex. elle / iel" /></label>
            <label>Identité<input value={profile.identity ?? ""} onChange={e => setProfile({...profile, identity: e.target.value})} maxLength={80} placeholder="ex. lesbienne, trans, non-binaire…" /></label>
            <label>
              Centres d'intérêt
              <input value={profile.interests.join(", ")} onChange={e => setProfile({...profile, interests: e.target.value.split(",").map(v => v.trim()).filter(Boolean).slice(0, 12)})} placeholder="jeux vidéo, fantasy, cuisine…" />
              <small className="fieldHint">Sépare les centres d'intérêt par des virgules, jusqu'à 12.</small>
            </label>
            <div className="datingSettings">
              <p className="eyebrow">RENCONTRES</p>
              <label className="toggleLabel"><input type="checkbox" checked={profile.dating_enabled} onChange={e => setProfile({...profile, dating_enabled: e.target.checked})} /> Afficher mon profil dans Rencontres</label>
              <div className="profileTwoCols">
                <label>Âge<input type="number" min="18" max="120" value={profile.age ?? ""} onChange={e => setProfile({...profile, age: e.target.value ? Number(e.target.value) : null})} placeholder="18+" /></label>
                <label>Région / ville<input value={profile.location ?? ""} onChange={e => setProfile({...profile, location: e.target.value})} maxLength={80} placeholder="ex. Paris, Bretagne…" /></label>
              </div>
              <label>Orientation<input value={profile.orientation ?? ""} onChange={e => setProfile({...profile, orientation: e.target.value})} maxLength={80} placeholder="ex. lesbienne, bi, pan…" /></label>
              <label>Je recherche<input value={profile.looking_for ?? ""} onChange={e => setProfile({...profile, looking_for: e.target.value})} maxLength={120} placeholder="ex. amitié, relation, rencontres…" /></label>
            </div>

            <label>Bio<textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} maxLength={500} rows={5} placeholder="Quelques mots sur toi…" /></label>
            <label>URL d'avatar externe <input type="url" value={profile.avatar_url ?? ""} onChange={e => setProfile({...profile, avatar_url: e.target.value})} placeholder="https://…" /></label>
            <label>URL de bannière externe <input type="url" value={profile.banner_url ?? ""} onChange={e => setProfile({...profile, banner_url: e.target.value})} placeholder="https://…" /></label>
            <label>E-mail<input type="email" value={email} disabled /></label>

            <p className="authMessage">⭐ Réputation : {profile.reputation}</p>
            {message && <p className="authMessage">{message}</p>}
            <button className="primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer mon profil"}</button>
          </form>

          <button className="authSwitch" onClick={signOut}>Se déconnecter</button>
          <a className="authSwitch" href="/">← Retour au forum</a>
        </div>
      </div>
    </main>
  );
}
