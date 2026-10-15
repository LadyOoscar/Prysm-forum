"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Member = { id: string; username: string; display_name: string; avatar_url: string | null; location: string; distance_km: number };
type Profile = { username: string; display_name: string; avatar_url: string | null; location: string | null };
type Coordinates = { latitude: number; longitude: number };
type GeocodingResult = Coordinates & { name: string; country_code?: string; feature_code?: string };

const DEFAULT_RADIUS = 50;
const cityCache = new Map<string, Promise<Coordinates | null>>();
const rings = [
  { id: 1, fraction: 0.25, name: "Tout proche", color: "#b58cff", size: "25%" },
  { id: 2, fraction: 0.5, name: "Voisinage", color: "#66a5ff", size: "50%" },
  { id: 3, fraction: 0.75, name: "Horizon local", color: "#52e0d0", size: "75%" },
  { id: 4, fraction: 1, name: "Limite du rayon", color: "#f2c56b", size: "95%" },
];

function cityName(value: string | null | undefined) {
  return (value ?? "").split(",")[0].trim();
}
function normalizeCity(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
}
function geocodeCity(location: string | null | undefined): Promise<Coordinates | null> {
  const city = cityName(location);
  if (!city) return Promise.resolve(null);
  const key = normalizeCity(city);
  const cached = cityCache.get(key);
  if (cached) return cached;
  const request = (async () => {
    try {
      const params = new URLSearchParams({ name: city, count: "10", language: "fr", format: "json" });
      const response = await fetch("https://geocoding-api.open-meteo.com/v1/search?" + params.toString());
      if (!response.ok) return null;
      const data = await response.json() as { results?: GeocodingResult[] };
      const results = data.results ?? [];
      const exactCity = results.find(item => item.feature_code?.startsWith("PPL") && normalizeCity(item.name) === key);
      return exactCity ? { latitude: exactCity.latitude, longitude: exactCity.longitude } : null;
    } catch {
      return null;
    }
  })();
  cityCache.set(key, request);
  return request;
}
function distanceKm(a: Coordinates, b: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export default function GAYDARPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchRadius, setSearchRadius] = useState(DEFAULT_RADIUS);
  const [radiusReady, setRadiusReady] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<string[]>([]);
  const orbitStageRef = useRef<HTMLDivElement | null>(null);
  const [orbitStageWidth, setOrbitStageWidth] = useState(0);

  useEffect(() => {
    const stage = orbitStageRef.current;
    if (!stage) return;
    const measure = () => setOrbitStageWidth(stage.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem("prysm-gaydar-radius"));
      if (Number.isFinite(saved) && saved >= 10 && saved <= 100) setSearchRadius(saved);
    } catch { /* Le rayon par défaut reste disponible sans stockage local. */ }
    setRadiusReady(true);
  }, []);
  useEffect(() => {
    if (!radiusReady) return;
    try { window.localStorage.setItem("prysm-gaydar-radius", String(searchRadius)); } catch { /* Préférence limitée à la session. */ }
  }, [searchRadius, radiusReady]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.href = "/auth"; return; }

      const [{ data: own, error: ownError }, { data: people, error: peopleError }, { data: ownSensitiveRows, error: ownSensitiveError }] = await Promise.all([
        supabase.from("profiles").select("username,display_name,avatar_url").eq("id", auth.user.id).maybeSingle(),
        supabase.rpc("get_public_discovery_profiles"),
        supabase.rpc("get_my_sensitive_profile"),
      ]);
      if (!active) return;
      if (ownError || ownSensitiveError || !own) {
        setMessage("Impossible de charger ton profil. Réessaie après avoir actualisé la page.");
        setLoading(false);
        return;
      }
      const ownSensitive = Array.isArray(ownSensitiveRows) ? ownSensitiveRows[0] : null;
      const ownProfile = { ...own, ...(ownSensitive || {}) } as Profile;
      setProfile(ownProfile);
      if (!cityName(ownProfile.location)) {
        setMessage("Renseigne ta ville dans ton profil pour activer le Gaydar. Aucune localisation GPS ne sera demandée.");
        setLoading(false);
        return;
      }
      if (peopleError) {
        setMessage("Impossible de charger les profils visibles pour le moment. Réessaie dans un instant.");
        setLoading(false);
        return;
      }

      setMessage("Repérage des villes et calcul des distances estimées…");
      const peopleList = (people ?? []) as Array<{ id: string; username: string; display_name: string; avatar_url: string | null; location: string | null }>;
      const uniqueLocations = [...new Set([ownProfile.location ?? "", ...peopleList.map(person => person.location ?? "")].filter(value => cityName(value)))];
      const coordinates = new Map<string, Coordinates | null>();
      for (let index = 0; index < uniqueLocations.length; index += 4) {
        const batch = uniqueLocations.slice(index, index + 4);
        const results = await Promise.all(batch.map(async location => [normalizeCity(cityName(location)), await geocodeCity(location)] as const));
        results.forEach(([key, value]) => coordinates.set(key, value));
      }
      if (!active) return;
      const origin = coordinates.get(normalizeCity(cityName(ownProfile.location)));
      if (!origin) {
        setMessage("Ville non reconnue. Dans ton profil, indique le nom précis d'une ville, par exemple Épernay ou Reims, plutôt qu'une région.");
        setLoading(false);
        return;
      }
      const nextMembers: Member[] = [];
      for (const person of peopleList) {
        if (!person.location) continue;
        const destination = coordinates.get(normalizeCity(cityName(person.location)));
        if (!destination) continue;
        nextMembers.push({
          ...person,
          location: cityName(person.location),
          distance_km: distanceKm(origin, destination),
        });
      }
      setMembers(nextMembers.sort((a, b) => a.distance_km - b.distance_km));
      setMessage("");
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [supabase]);

  const visibleMembers = useMemo(
    () => members.filter(member => member.distance_km <= searchRadius).sort((a, b) => a.distance_km - b.distance_km),
    [members, searchRadius]
  );
  const grouped = useMemo(() => rings.map(ring => ({
    ...ring,
    label: Math.round(searchRadius * ring.fraction) + " km",
    members: visibleMembers.filter(member => ring.id === 1
      ? member.distance_km <= searchRadius * ring.fraction
      : member.distance_km > searchRadius * rings[ring.id - 2].fraction && member.distance_km <= searchRadius * ring.fraction),
  })), [visibleMembers, searchRadius]);

  if (loading) return <main className="shell"><section className="page-head"><p className="eyebrow">PRYSM · GAYDAR</p><h1>GAYDAR.</h1><p className="lead">Calcul des distances entre les villes…</p></section></main>;

  return <main className="shell orbit-page">
    <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link href="/rencontres">Rencontres</Link><Link href="/messages">Messages</Link><Link href="/profil">Profil</Link><Link className="active" href="/gaydar">Gaydar</Link></nav></header>
    <section className="page-head compact"><p className="eyebrow">PRYSM · Proximité par ville</p><h1>GAYDAR<span>.</span></h1><p className="lead">Découvre les membres près de ta ville, avec une distance estimée entre les villes de vos profils. Aucun GPS, aucune position en direct.</p></section>

    <section className="orbit-controls gaydar-controls">
      <div className="gaydar-radius-copy"><strong>{searchRadius} km autour de {cityName(profile?.location) || "ta ville"}</strong><p>Choisis ton périmètre. Le rayon est mémorisé sur cet appareil.</p></div>
      <label className="gaydar-slider-label" htmlFor="gaydar-radius"><span>Rayon de recherche</span><strong>{searchRadius} km</strong></label>
      <input id="gaydar-radius" className="gaydar-slider" type="range" min="10" max="100" step="10" value={searchRadius} onChange={event => setSearchRadius(Number(event.target.value))} />
      <div className="gaydar-slider-ticks"><span>10 km</span><span>50 km</span><span>100 km</span></div>
    </section>
    {message && <p className="orbit-message" role="status">{message}</p>}
    {!cityName(profile?.location) ? <section className="orbit-empty"><h2>Ajoute ta ville pour commencer</h2><p>Dans ton profil, indique une ville comme Épernay ou Reims. Le Gaydar ne demande jamais l'accès au GPS.</p><Link className="button primary" href="/profil">Compléter mon profil</Link></section> :
      <section className="orbit-layout">
        <div ref={orbitStageRef} className="orbit-stage" aria-label="Radar illustratif des membres proches">
          <div className="orbit-stars" />
          {rings.map(ring => <div key={ring.id} className="orbit-ring" style={{ "--orbit-size": ring.size, "--orbit-color": ring.color } as React.CSSProperties}><span>{Math.round(searchRadius * ring.fraction)} km</span></div>)}
          {visibleMembers.map((member, index) => {
            const angle = (index * 137.5 + 29) * Math.PI / 180;
            const normalizedDistance = Math.min(member.distance_km / searchRadius, 1);
            const radialDistance = orbitStageWidth * 0.46 * normalizedDistance;
            const style = {
              left: `${50 + (orbitStageWidth > 0 ? Math.cos(angle) * radialDistance / orbitStageWidth * 100 : 0)}%`,
              top: `${50 + (orbitStageWidth > 0 ? Math.sin(angle) * radialDistance / orbitStageWidth * 100 : 0)}%`,
              position: "absolute", width: "38px", height: "38px", zIndex: 50, display: "block",
              visibility: "visible", opacity: 1, transform: "translate(-50%, -50%)", borderRadius: "50%",
            } as React.CSSProperties;
            return <Link key={member.id} className="orbit-person" href={`/membre/${encodeURIComponent(member.username)}`} style={style} title={`${member.display_name || member.username} · ${Math.round(member.distance_km)} km estimés`} aria-label={`Voir le profil de ${member.display_name || member.username}, à environ ${Math.round(member.distance_km)} kilomètres`}>
              <span className="orbit-person-face" style={{ display: "grid", placeItems: "center", width: "38px", height: "38px", minWidth: "38px", minHeight: "38px", overflow: "hidden", boxSizing: "border-box", borderRadius: "50%", border: `2px solid ${rings[index % rings.length].color}`, background: "#11152d", color: "#ffffff", fontSize: "14px", fontWeight: 800, lineHeight: 1, boxShadow: `0 0 12px ${rings[index % rings.length].color}88` }}>{member.avatar_url && !failedAvatars.includes(member.id) ? <img style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} src={member.avatar_url} alt="" loading="eager" decoding="async" onError={() => setFailedAvatars(current => current.includes(member.id) ? current : [...current, member.id])} /> : (member.display_name || member.username).slice(0, 1).toUpperCase()}</span>
            </Link>;
          })}
          <div className="orbit-center"><div className="orbit-center-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.display_name || profile?.username || "P").slice(0, 1).toUpperCase()}</div><strong>{profile?.display_name || profile?.username || "Mon profil"}</strong><small>TA VILLE</small></div>
        </div>
        <aside className="orbit-legend"><div className="orbit-legend-head"><div><p className="eyebrow">Les distances</p><h2>Ton voisinage</h2></div><strong>{visibleMembers.length}<small> profils</small></strong></div>
          {grouped.map(ring => <div className="orbit-legend-row" key={ring.id}><span className="orbit-legend-dot" style={{ background: ring.color, boxShadow: `0 0 14px ${ring.color}` }} /><div><strong>{ring.name}</strong><small>Jusqu'à {ring.label}</small></div><b>{ring.members.length}</b></div>)}
          {visibleMembers.length > 0 && <section className="orbit-member-list" aria-label="Membres visibles dans le Gaydar"><h3>Membres à proximité</h3>{visibleMembers.map(member => <Link key={member.id} className="orbit-member-link" href={`/membre/${encodeURIComponent(member.username)}`}><span className="orbit-member-avatar">{member.avatar_url && !failedAvatars.includes(member.id) ? <img src={member.avatar_url} alt="" loading="eager" onError={() => setFailedAvatars(current => current.includes(member.id) ? current : [...current, member.id])} /> : (member.display_name || member.username).slice(0, 1).toUpperCase()}</span><span className="orbit-member-name"><strong>{member.display_name || member.username}</strong><small>{member.location} · {Math.round(member.distance_km)} km estimés</small></span><span className="orbit-member-arrow">↗</span></Link>)}</section>}
          <p className="orbit-privacy">🔒 La distance est calculée entre les centres des villes. Les positions sur le radar sont illustratives et n'indiquent aucune direction réelle. Seuls les profils publics ayant activé la découverte apparaissent.</p>
        </aside>
      </section>}
    {cityName(profile?.location) && visibleMembers.length === 0 && <section className="orbit-empty"><h2>Aucun profil dans ce rayon pour le moment.</h2><p>Essaie d'augmenter le rayon ou reviens plus tard. Les profils sans ville reconnue ne sont pas inclus.</p></section>}
    <footer>PRYSM GAYDAR · Distances estimées entre villes, sans GPS.</footer>
    <style jsx>{`
      .orbit-controls{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 20px;margin-bottom:12px;border:1px solid var(--line);background:rgba(14,17,46,.92)}
      .orbit-controls p{margin:4px 0 0;color:var(--muted);font-size:.8rem}
      .orbit-message{padding:11px 14px;margin:0 0 14px;border:1px solid #414878;color:#b9c5e8;background:#101433;font-size:.78rem}
      .orbit-layout{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:22px;align-items:center;padding-bottom:45px}
      .orbit-stage{--stage-size:min(82vw,650px);container-type:size;position:relative;width:100%;max-width:650px;aspect-ratio:1;margin:auto;overflow:hidden;border:1px solid rgba(69,239,255,.16);border-radius:50%;background:radial-gradient(circle at 50% 50%,rgba(139,98,255,.10),rgba(8,11,32,.30) 58%,rgba(8,11,32,.12) 100%);box-shadow:inset 0 0 30px rgba(69,239,255,.04)}
            .orbit-stars{position:absolute;z-index:0;inset:0;border-radius:50%;opacity:.85;background-image:radial-gradient(#e2e8ff 1px,transparent 1.6px),radial-gradient(#7d91df 1px,transparent 1.7px);background-size:31px 37px,53px 61px;background-position:4px 9px,22px 31px;pointer-events:none}
      .orbit-ring{position:absolute;z-index:2;left:50%;top:50%;width:var(--orbit-size);height:var(--orbit-size);transform:translate(-50%,-50%);background:transparent!important;border:2px solid color-mix(in srgb,var(--orbit-color),transparent 12%);border-radius:50%;box-shadow:0 0 8px color-mix(in srgb,var(--orbit-color),transparent 72%);pointer-events:none}
      .orbit-ring span{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);padding:2px 7px;border:1px solid var(--orbit-color);border-radius:20px;background:#0b0d25;color:var(--orbit-color);font-size:.58rem;white-space:nowrap}
      .orbit-ring:nth-of-type(3) span{left:100%;top:50%;transform:translate(-50%,-50%)}
      .orbit-ring:nth-of-type(4) span{left:50%;top:100%;transform:translate(-50%,-50%)}
      .orbit-ring:nth-of-type(5) span{left:0;top:50%;transform:translate(-50%,-50%)}
      .orbit-person{position:absolute;left:50%;top:50%;width:38px;height:38px;z-index:50;display:block;visibility:visible;opacity:1;isolation:isolate;transform:translate(-50%,-50%);border-radius:50%;outline:1px solid rgba(255,255,255,.45);background:rgba(9,11,32,.75)}
      .orbit-person-face{position:relative;z-index:21;left:auto;top:auto;display:grid;place-items:center;width:100%;height:100%;margin:0;border:0 solid transparent;border-radius:50%;overflow:hidden;background:transparent;color:#fff;font-weight:800;font-size:.8rem;box-shadow:none}
      .orbit-person-face img,.orbit-center-avatar img{display:block;width:100%;height:100%;min-width:100%;min-height:100%;object-fit:cover;border-radius:inherit}
      .orbit-center{position:absolute;z-index:30;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;flex-direction:column;justify-content:center;width:116px;height:116px;padding:9px;border:1px solid var(--cyan);border-radius:50%;background:radial-gradient(circle,#25245b,#0b0d25 75%);box-shadow:0 0 24px rgba(69,239,255,.18);text-align:center}
      .orbit-center-avatar{display:grid;place-items:center;width:46px;height:46px;margin-bottom:4px;border:2px solid var(--pink);border-radius:50%;overflow:hidden;background:#20265b;color:#fff;font-weight:800}
      .orbit-center strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.68rem}.orbit-center small{color:var(--cyan);font-size:.55rem;letter-spacing:.2em}
      .orbit-overlay{position:absolute;z-index:40;left:50%;bottom:12%;transform:translateX(-50%);width:68%;display:grid;gap:4px;padding:10px 12px;border:1px solid rgba(69,239,255,.3);border-radius:14px;background:rgba(7,9,27,.94);text-align:center;overflow-wrap:anywhere}
      .orbit-overlay strong{font-size:.9rem}.orbit-overlay span{color:var(--muted);font-size:.7rem}
      .orbit-legend{padding:20px;border:1px solid var(--line);background:rgba(14,17,46,.92)}
      .orbit-legend-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:20px}.orbit-legend-head .eyebrow{margin-bottom:5px}.orbit-legend-head h2{font-size:1.35rem}.orbit-legend-head>strong{font-size:1.3rem;color:var(--cyan)}.orbit-legend-head>strong small{font-size:.6rem;color:var(--muted);display:block}
      .orbit-legend-row{display:flex;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid rgba(54,58,112,.7)}.orbit-legend-dot{width:9px;height:9px;flex:none;border-radius:50%}.orbit-legend-row div{display:grid;gap:1px;flex:1}.orbit-legend-row strong{font-size:.8rem}.orbit-legend-row small{font-size:.68rem;color:var(--muted)}.orbit-legend-row>b{font-size:1.1rem}
      .orbit-member-list{margin-top:22px;padding-top:16px;border-top:1px solid rgba(54,58,112,.7)}.orbit-member-list h3{margin:0 0 10px;font-size:.88rem}.orbit-member-link{display:flex;align-items:center;gap:10px;padding:9px 0;color:inherit;text-decoration:none;border-bottom:1px solid rgba(54,58,112,.45)}.orbit-member-link:hover .orbit-member-name strong{color:var(--cyan)}.orbit-member-avatar{display:grid;place-items:center;flex:none;width:38px;height:38px;overflow:hidden;border:1px solid var(--cyan);border-radius:50%;background:#20265b;color:#fff;font-weight:800}.orbit-member-avatar img{display:block;width:100%;height:100%;object-fit:cover}.orbit-member-name{display:grid;gap:3px;flex:1;min-width:0}.orbit-member-name strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem}.orbit-member-name small{color:var(--muted);font-size:.68rem}.orbit-member-arrow{color:var(--cyan)}
      .orbit-privacy{margin:19px 0 0;color:#8189ad;font-size:.68rem;line-height:1.65}
      @media(prefers-reduced-motion:reduce){.orbit-person,.orbit-person-face{animation:none!important}}
      @media(max-width:900px){.orbit-layout{grid-template-columns:1fr}.orbit-stage{--stage-size:min(86vw,650px)}}
      @media(max-width:600px){.orbit-controls{align-items:stretch;flex-direction:column}.orbit-controls .button{width:100%}.orbit-stage{--stage-size:calc(100vw - 40px)}.orbit-center{width:92px;height:92px}.orbit-center-avatar{width:36px;height:36px}.orbit-person{width:32px;height:32px}.orbit-ring span{font-size:.5rem}.orbit-overlay{width:64%;bottom:12%;padding:8px 9px}.orbit-overlay strong{font-size:.78rem}.orbit-overlay span{font-size:.62rem}}

      .gaydar-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 22px;align-items:center}
      .gaydar-radius-copy{grid-column:1/-1}
      .gaydar-radius-copy strong{font-size:1rem;color:var(--text,#f2f3ff)}
      .gaydar-radius-copy p{margin:5px 0 0;color:var(--muted);font-size:.8rem}
      .gaydar-slider-label{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:.8rem}
      .gaydar-slider-label strong{color:var(--cyan);font-size:1rem}
      .gaydar-slider{grid-column:1/-1;width:100%;accent-color:var(--cyan);cursor:pointer}
      .gaydar-slider-ticks{grid-column:1/-1;display:flex;justify-content:space-between;margin-top:-5px;color:var(--muted);font-size:.68rem}
      .orbit-empty{padding:25px;margin:0 0 18px;border:1px solid var(--line);background:rgba(14,17,46,.92);text-align:center}
      .orbit-empty h2{margin:0 0 8px;font-size:1.2rem}
      .orbit-empty p{margin:0 0 16px;color:var(--muted);font-size:.84rem;line-height:1.6}
      .orbit-empty .button{display:inline-flex;text-decoration:none}
      @media(max-width:600px){.gaydar-controls{grid-template-columns:1fr}.gaydar-slider-label,.gaydar-slider,.gaydar-slider-ticks{grid-column:1}.gaydar-radius-copy{grid-column:1}}
\n    `}</style>
  </main>;
}
