"use client";

import { useEffect, useMemo, useState } from "react";
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

type Coordinates = { latitude: number; longitude: number };
type GeocodingResult = Coordinates & { name: string; country_code?: string; feature_code?: string };
const DEFAULT_RADIUS = 50;
const CITY_CACHE = new Map<string, Promise<Coordinates | null>>();

function cityQuery(location: string | null | undefined) {
  return (location ?? "").split(",")[0].trim();
}

function normalizeCity(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("fr");
}

function geocodeCity(location: string | null | undefined): Promise<Coordinates | null> {
  const city = cityQuery(location);
  if (!city) return Promise.resolve(null);
  const key = normalizeCity(city);
  const cached = CITY_CACHE.get(key);
  if (cached) return cached;

  const request = (async () => {
    try {
      const params = new URLSearchParams({ name: city, count: "10", language: "fr", format: "json" });
      const response = await fetch("https://geocoding-api.open-meteo.com/v1/search?" + params.toString());
      if (!response.ok) return null;
      const data = await response.json() as { results?: GeocodingResult[] };
      const results = data.results ?? [];
      const french = results.filter(item => item.country_code?.toUpperCase() === "FR");
      const exact = french.find(item => normalizeCity(item.name) === key);
      const populated = french.find(item => item.feature_code?.startsWith("PPL"));
      const chosen = exact ?? populated ?? results.find(item => normalizeCity(item.name) === key);
      return chosen ? { latitude: chosen.latitude, longitude: chosen.longitude } : null;
    } catch {
      return null;
    }
  })();
  CITY_CACHE.set(key, request);
  return request;
}

function distanceKm(a: Coordinates, b: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export default function DatingPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [me, setMe] = useState("");
  const [myCity, setMyCity] = useState("");
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [radiusReady, setRadiusReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem("prysm-gaydar-radius"));
      if (Number.isFinite(saved) && saved >= 10 && saved <= 300) setRadius(saved);
    } catch { /* Le radar reste utilisable si le stockage local est indisponible. */ }
    setRadiusReady(true);
  }, []);

  useEffect(() => {
    if (!radiusReady) return;
    try { window.localStorage.setItem("prysm-gaydar-radius", String(radius)); } catch { /* Préférence conservée pour cette session. */ }
  }, [radius, radiusReady]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
      if (!userId) { router.push("/login"); return; }
      setMe(userId);

      const [{ data: people, error: peopleError }, { data: likes }, { data: ownProfile }] = await Promise.all([
        supabase.from("profiles")
          .select("id,username,display_name,bio,avatar_url,pronouns,identity,interests,age,location,orientation,looking_for")
          .eq("dating_enabled", true)
          .neq("id", userId)
          .order("updated_at", { ascending: false })
          .limit(200),
        supabase.from("dating_likes").select("liked_id").eq("liker_id", userId),
        supabase.from("profiles").select("location").eq("id", userId).maybeSingle(),
      ]);

      if (cancelled) return;
      if (peopleError) {
        setMessage("Impossible de charger les profils pour le moment. Réessaie dans un instant.");
        setLoading(false);
        return;
      }

      const peopleList = (people ?? []) as Profile[];
      setProfiles(peopleList);
      setLiked((likes ?? []).map(item => item.liked_id));
      const ownLocation = ownProfile?.location ?? "";
      setMyCity(cityQuery(ownLocation));

      if (!cityQuery(ownLocation)) {
        setMessage("Ajoute ta ville dans ton profil pour activer le calcul des distances du Gaydar.");
        setLoading(false);
        return;
      }

      setMessage("Calcul des distances entre les villes…");
      const uniqueLocations = [...new Set([ownLocation, ...peopleList.map(person => person.location ?? "")].filter(value => cityQuery(value)))];
      const coordinates = new Map<string, Coordinates | null>();
      for (let index = 0; index < uniqueLocations.length; index += 4) {
        const batch = uniqueLocations.slice(index, index + 4);
        const results = await Promise.all(batch.map(async location => [normalizeCity(cityQuery(location)), await geocodeCity(location)] as const));
        results.forEach(([key, value]) => coordinates.set(key, value));
      }

      if (cancelled) return;
      const origin = coordinates.get(normalizeCity(cityQuery(ownLocation)));
      if (!origin) {
        setMessage("Je n'arrive pas à reconnaître ta ville. Vérifie le champ « Ville » dans ton profil, puis réessaie.");
        setLoading(false);
        return;
      }

      const nextDistances: Record<string, number> = {};
      for (const person of peopleList) {
        const destination = coordinates.get(normalizeCity(cityQuery(person.location)));
        if (destination) nextDistances[person.id] = distanceKm(origin, destination);
      }
      setDistances(nextDistances);
      setMessage("");
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [router]);

  const visibleProfiles = useMemo(
    () => profiles
      .filter(profile => Number.isFinite(distances[profile.id]) && distances[profile.id] <= radius)
      .sort((a, b) => distances[a.id] - distances[b.id]),
    [profiles, distances, radius]
  );

  async function toggleLike(profile: Profile) {
    const supabase = createClient();
    setMessage("");
    const already = liked.includes(profile.id);

    if (already) {
      const { error } = await supabase.from("dating_likes").delete().eq("liker_id", me).eq("liked_id", profile.id);
      if (error) { setMessage("Impossible de retirer le like pour le moment."); return; }
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
      const { error: matchError } = await supabase.from("dating_matches").upsert({ user_a: userA, user_b: userB }, { onConflict: "user_a,user_b" });
      setMessage(matchError ? "Like réciproque détecté, mais le match n'a pas pu être enregistré." : "💕 Match ! Vous vous êtes likés mutuellement.");
    } else {
      setMessage("❤️ Like envoyé.");
    }
  }

  return (
    <main className="datingPage">
      <PrysmNav active="dating" />
      <section className="datingHero">
        <div>
          <p className="eyebrow">GAYDAR PRYSM</p>
          <h1>Les bonnes rencontres, près de ta ville.</h1>
          <p>Découvre les membres qui souhaitent faire des rencontres, classés par distance estimée entre les villes de vos profils. Aucun GPS, aucune position en direct.</p>
        </div>
        <a className="secondaryButton" href="/profile">Modifier mon profil</a>
      </section>

      <div className="datingShell">
        <section className="gaydarControls" aria-label="Réglages du Gaydar">
          <div className="gaydarControlHeading">
            <div>
              <p className="eyebrow">TON PÉRIMÈTRE</p>
              <h2>{radius} km autour de {myCity || "ta ville"}</h2>
              <p>Distance à vol d'oiseau entre les centres des villes, arrondie au kilomètre.</p>
            </div>
            <span className="gaydarRadarIcon" aria-hidden="true">⌁</span>
          </div>
          <label className="gaydarRadiusLabel" htmlFor="gaydar-radius">
            <span>Rayon de recherche</span>
            <strong>{radius} km</strong>
          </label>
          <input id="gaydar-radius" className="gaydarRadius" type="range" min="10" max="300" step="10" value={radius} onChange={event => setRadius(Number(event.target.value))} />
          <div className="gaydarRadiusTicks"><span>10 km</span><span>150 km</span><span>300 km</span></div>
        </section>

        {message && <p className="authMessage gaydarMessage" role="status">{message}</p>}
        {loading ? <div className="emptyCommunity">Calcul des distances entre villes…</div> :
          !cityQuery(myCity) ? <div className="emptyCommunity"><h2>Indique ta ville pour commencer</h2><p>Dans ton profil, renseigne une ville comme Épernay ou Reims. Le Gaydar n'utilise jamais le GPS.</p><a className="secondaryButton" href="/profile">Compléter mon profil</a></div> :
          visibleProfiles.length === 0 ? <div className="emptyCommunity"><h2>Aucun profil dans ce rayon pour le moment.</h2><p>Essaie d'augmenter le rayon ou reviens plus tard. Les membres sans ville reconnue ne sont pas inclus dans le calcul.</p></div> :
          <section className="datingGrid">
            {visibleProfiles.map(profile => (
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
                  <span className="gaydarDistance">↗ {Math.round(distances[profile.id])} km estimés</span>
                  {profile.orientation && <span>♥ {profile.orientation}</span>}
                  {profile.looking_for && <span>✦ {profile.looking_for}</span>}
                </div>
                <p className="datingBio">{profile.bio || "Cette personne n'a pas encore ajouté de présentation."}</p>
                {!!profile.interests?.length && <div className="interestTags">{profile.interests.map(interest => <span key={interest}>{interest}</span>)}</div>}
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
