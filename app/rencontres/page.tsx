"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  identity: string | null;
  interests: string[];
  age: number | null;
  location: string | null;
  orientation: string | null;
  looking_for: string | null;
};

export default function DatingPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [me, setMe] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (!userId) { router.push("/login"); return; }
    setMe(userId);

    const [{ data: people }, { data: likes }] = await Promise.all([
      supabase.from("profiles")
        .select("id,username,display_name,bio,avatar_url,pronouns,identity,interests,age,location,orientation,looking_for")
        .eq("dating_enabled", true)
        .neq("id", userId)
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase.from("dating_likes").select("liked_id").eq("liker_id", userId),
    ]);
    setProfiles((people ?? []) as Profile[]);
    setLiked((likes ?? []).map(x => x.liked_id));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleLike(profile: Profile) {
    const supabase = createClient();
    setMessage("");
    const already = liked.includes(profile.id);

    if (already) {
      await supabase.from("dating_likes").delete().eq("liker_id", me).eq("liked_id", profile.id);
      setLiked(current => current.filter(id => id !== profile.id));
      return;
    }

    const { error } = await supabase.from("dating_likes").insert({ liker_id: me, liked_id: profile.id });
    if (error) { setMessage("Impossible d'envoyer le like pour le moment."); return; }

    setLiked(current => [...current, profile.id]);

    const { data: reciprocal } = await supabase.from("dating_likes")
      .select("liker_id")
      .eq("liker_id", profile.id)
      .eq("liked_id", me)
      .maybeSingle();

    if (reciprocal) {
      const [userA, userB] = [me, profile.id].sort();
      await supabase.from("dating_matches").upsert({ user_a: userA, user_b: userB }, { onConflict: "user_a,user_b" });
      setMessage("💕 Match ! Vous vous êtes likés mutuellement.");
    } else {
      setMessage("❤️ Like envoyé.");
    }
  }

  return (
    <main className="datingPage">
      <PrysmNav active="dating" />
      <section className="datingHero">
        <div>
          <p className="eyebrow">RENCONTRES PRYSM</p>
          <h1>Des rencontres qui commencent par une communauté.</h1>
          <p>Découvre les membres qui souhaitent faire des rencontres, échange d'abord autour de vos centres d'intérêt, puis laisse les affinités faire le reste.</p>
        </div>
        <a className="secondaryButton" href="/profile">Modifier mon profil</a>
      </section>

      <div className="datingShell">
        {message && <p className="authMessage">{message}</p>}
        {loading ? <div className="emptyCommunity">Chargement des profils…</div> :
          profiles.length === 0 ? <div className="emptyCommunity"><h2>Pas encore de profils à découvrir.</h2><p>Active les rencontres depuis ton profil pour rejoindre cette partie de PRYSM.</p></div> :
          <section className="datingGrid">
            {profiles.map(profile => (
              <article className="datingCard" key={profile.id}>
                <button className="datingProfile" onClick={() => router.push("/profile/" + profile.username)}>
                  <ProfileAvatar src={profile.avatar_url} name={profile.display_name} className="datingAvatar" />
                  <div>
                    <h2>{profile.display_name}{profile.age ? ", " + profile.age : ""}</h2>
                    <p>@{profile.username}{profile.pronouns ? " · " + profile.pronouns : ""}</p>
                  </div>
                </button>
                <div className="datingMeta">
                  {profile.location && <span>📍 {profile.location}</span>}
                  {profile.orientation && <span>♥ {profile.orientation}</span>}
                  {profile.looking_for && <span>✦ {profile.looking_for}</span>}
                </div>
                <p className="datingBio">{profile.bio || "Cette personne n'a pas encore ajouté de présentation."}</p>
                {!!profile.interests?.length && <div className="interestTags">{profile.interests.map(i => <span key={i}>{i}</span>)}</div>}
                <div className="datingActions">
                  <button className={liked.includes(profile.id) ? "likeButton liked" : "likeButton"} onClick={() => toggleLike(profile)}>
                    {liked.includes(profile.id) ? "♥ Liké" : "♡ J'aime"}
                  </button>
                  <button className="outlineButton" onClick={() => router.push("/messages?user=" + encodeURIComponent(profile.username))}>💬 Écrire</button>
                </div>
              </article>
            ))}
          </section>
        }
      </div>
    </main>
  );
}
