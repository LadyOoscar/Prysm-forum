"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Member = { id: string; username: string; display_name: string; avatar_url: string | null; distance_band: 1 | 2 | 3 | 4 };
type Profile = { username: string; display_name: string; avatar_url: string | null };
const rings = [
  { id: 1, label: "1 à 5 km", name: "Proximité", color: "#b58cff", size: "30%", duration: "30s" },
  { id: 2, label: "6 à 10 km", name: "Voisinage", color: "#66a5ff", size: "51%", duration: "38s" },
  { id: 3, label: "11 à 25 km", name: "Horizon local", color: "#52e0d0", size: "73%", duration: "46s" },
  { id: 4, label: "26 à 50 km", name: "Grand voisinage", color: "#f2c56b", size: "95%", duration: "56s" },
];

export default function OrbitePage() {
  const supabase = createSupabaseBrowser();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_orbit_members");
    if (error) { setMessage("Impossible de charger Orbite pour le moment."); return; }
    setMembers((data ?? []) as Member[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.href = "/auth"; return; }
      setUserId(auth.user.id);
      const [{ data: p }, { data: loc }] = await Promise.all([
        supabase.from("profiles").select("username,display_name,avatar_url").eq("id", auth.user.id).maybeSingle(),
        supabase.from("orbit_locations").select("enabled").eq("user_id", auth.user.id).maybeSingle(),
      ]);
      if (!active) return;
      setProfile((p as Profile | null) ?? null);
      setEnabled(Boolean(loc?.enabled));
      if (loc?.enabled) await loadMembers();
      if (active) setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [supabase, loadMembers]);

  async function enable() {
    setBusy(true);
    setMessage("");

    if (!window.isSecureContext) {
      setMessage("La géolocalisation exige une connexion HTTPS. Ouvre PRYSM directement dans Chrome à l’adresse https://prysm-clean.onrender.com/orbite.");
      setBusy(false);
      return;
    }
    if (!navigator.geolocation) {
      setMessage("Ce navigateur ne propose pas la géolocalisation. Ouvre PRYSM dans Chrome plutôt que dans un navigateur intégré.");
      setBusy(false);
      return;
    }
    if (!userId) {
      setMessage("Ta session n’est pas encore prête. Actualise la page puis réessaie.");
      setBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { error } = await supabase.from("orbit_locations").upsert({
            user_id: userId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            enabled: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          if (error) {
            console.error("PRYSM Orbite: sauvegarde de position impossible", error);
            setMessage(`Position obtenue, mais l’enregistrement a échoué : ${error.message}`);
          } else {
            setEnabled(true);
            await loadMembers();
            setMessage("Orbite est activée. Ta position exacte reste privée.");
          }
        } catch (error) {
          console.error("PRYSM Orbite: erreur inattendue", error);
          setMessage("La position a été obtenue, mais PRYSM n’a pas pu l’enregistrer. Vérifie ta connexion puis réessaie.");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        console.warn("PRYSM Orbite: géolocalisation refusée ou indisponible", { code: err.code, message: err.message });
        if (err.code === err.PERMISSION_DENIED) {
          setMessage("Autorisation refusée. Dans Chrome Android : appuie sur le cadenas à gauche de l’adresse → Autorisations → Position → Autoriser, puis recharge PRYSM.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setMessage("Le téléphone n’arrive pas à déterminer ta position. Active la localisation Android, puis réessaie près d’une fenêtre ou en extérieur.");
        } else if (err.code === err.TIMEOUT) {
          setMessage("La recherche de position a expiré. Active la localisation Android et réessaie.");
        } else {
          setMessage(`Géolocalisation indisponible : ${err.message || "erreur inconnue"}`);
        }
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
    );
  }

  async function disable() {
    setBusy(true); setMessage("");
    const { error } = await supabase.from("orbit_locations").delete().eq("user_id", userId);
    if (error) setMessage("Impossible de désactiver Orbite pour le moment.");
    else { setEnabled(false); setMembers([]); setMessage("Orbite désactivée. Ta position enregistrée a été supprimée."); }
    setBusy(false);
  }

  if (loading) return <main className="shell"><section className="page-head"><p className="eyebrow">PRYSM · Orbite</p><h1>Orbite.</h1><p className="lead">Préparation de ta galaxie…</p></section></main>;
  const grouped = rings.map(r => ({ ...r, members: members.filter(m => m.distance_band === r.id) }));

  return <main className="shell orbit-page">
    <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link href="/rencontres">Rencontres</Link><Link href="/messages">Messages</Link><Link href="/profil">Profil</Link><Link className="active" href="/orbite">Orbite</Link></nav></header>
    <section className="page-head compact"><p className="eyebrow">PRYSM · Système social</p><h1>Orbite<span>.</span></h1><p className="lead">Les membres qui gravitent autour de toi, répartis sur quatre anneaux de distance.</p></section>
    <section className="orbit-controls"><div><strong>{enabled ? "Ta présence est activée" : "Entre dans l’Orbite"}</strong><p>{enabled ? "Les membres ayant activé Orbite peuvent te découvrir." : "Active volontairement ta position pour découvrir les membres à proximité."}</p></div>
      {enabled ? <button className="button" disabled={busy} onClick={() => void disable()}>{busy ? "Mise à jour…" : "Désactiver Orbite"}</button> : <button className="button primary" disabled={busy} onClick={() => void enable()}>{busy ? "Localisation…" : "Activer ma position"}</button>}
    </section>
    {message && <p className="orbit-message" role="status">{message}</p>}
    <section className="orbit-layout">
      <div className="orbit-stage" aria-label="Carte orbitale des membres à proximité">
        <div className="orbit-stars" />
        {rings.map(r => <div key={r.id} className="orbit-ring" style={{ "--orbit-size": r.size, "--orbit-color": r.color } as React.CSSProperties}><span>{r.label}</span></div>)}
        {grouped.map(r => r.members.map((m, i) => {
          const angle = (i * 360 / Math.max(1, r.members.length) + r.id * 29) % 360;
          const style = { "--radius": `calc(var(--stage-size) * ${Number(r.size.slice(0, -1)) / 200})`, "--start-angle": `${angle}deg`, "--duration": r.duration } as React.CSSProperties;
          return <Link key={m.id} className="orbit-person" href={`/membre/${encodeURIComponent(m.username)}`} style={style} title={`${m.display_name || m.username} · ${r.label}`} aria-label={`Voir le profil de ${m.display_name || m.username}, ${r.label}`}>
            <span className="orbit-person-face">{m.avatar_url ? <img src={m.avatar_url} alt="" /> : (m.display_name || m.username).slice(0, 1).toUpperCase()}</span>
          </Link>;
        }))}
        <div className="orbit-center"><div className="orbit-center-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.display_name || profile?.username || "P").slice(0, 1).toUpperCase()}</div><strong>{profile?.display_name || profile?.username || "Mon profil"}</strong><small>TOI</small></div>
        {!enabled && <div className="orbit-overlay"><strong>Ta galaxie t’attend</strong><span>Active ta position pour voir les membres à proximité.</span></div>}
        {enabled && !members.length && <div className="orbit-overlay"><strong>Ton espace est calme</strong><span>Aucun membre visible dans un rayon de 50 km pour le moment.</span></div>}
      </div>
      <aside className="orbit-legend"><div className="orbit-legend-head"><div><p className="eyebrow">Les anneaux</p><h2>Ton voisinage</h2></div><strong>{members.length}<small> profils</small></strong></div>
        {grouped.map(r => <div className="orbit-legend-row" key={r.id}><span className="orbit-legend-dot" style={{ background: r.color, boxShadow: `0 0 14px ${r.color}` }} /><div><strong>{r.name}</strong><small>{r.label}</small></div><b>{r.members.length}</b></div>)}
        <p className="orbit-privacy">🔒 Les coordonnées exactes ne sont jamais affichées. Seuls les membres ayant activé Orbite et un profil public apparaissent. Tu peux te retirer en un clic.</p>
      </aside>
    </section>
    <footer>PRYSM ORBITE · Distances indicatives.</footer>
    <style jsx>{`
      .orbit-controls{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 20px;margin-bottom:12px;border:1px solid var(--line);background:rgba(14,17,46,.92)}
      .orbit-controls p{margin:4px 0 0;color:var(--muted);font-size:.8rem}
      .orbit-message{padding:11px 14px;margin:0 0 14px;border:1px solid #414878;color:#b9c5e8;background:#101433;font-size:.78rem}
      .orbit-layout{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:22px;align-items:center;padding-bottom:45px}
      .orbit-stage{--stage-size:min(82vw,650px);position:relative;width:100%;max-width:650px;aspect-ratio:1;margin:auto;overflow:hidden;border:1px solid rgba(69,239,255,.16);border-radius:50%;background:radial-gradient(circle at 50% 50%,rgba(139,98,255,.15),transparent 35%),#080b20;box-shadow:inset 0 0 65px rgba(69,239,255,.07),0 0 38px rgba(139,98,255,.08)}
      .orbit-stars{position:absolute;inset:0;border-radius:50%;opacity:.48;background-image:radial-gradient(#bfcaff 1px,transparent 1.5px),radial-gradient(#5b6caa 1px,transparent 1.5px);background-size:47px 53px,71px 83px;background-position:4px 9px,22px 31px;pointer-events:none}
      .orbit-ring{position:absolute;left:50%;top:50%;width:var(--orbit-size);height:var(--orbit-size);transform:translate(-50%,-50%);border:1px solid color-mix(in srgb,var(--orbit-color),transparent 38%);border-radius:50%;box-shadow:0 0 14px color-mix(in srgb,var(--orbit-color),transparent 90%);pointer-events:none}
      .orbit-ring span{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);padding:2px 7px;border:1px solid var(--orbit-color);border-radius:20px;background:#0b0d25;color:var(--orbit-color);font-size:.58rem;white-space:nowrap}
      .orbit-person{position:absolute;left:50%;top:50%;width:0;height:0;z-index:3;transform:rotate(var(--start-angle)) translateX(var(--radius));animation:orbit-path var(--duration) linear infinite}
      .orbit-person-face{position:absolute;left:0;top:0;display:grid;place-items:center;width:38px;height:38px;margin:-19px;border:2px solid var(--cyan);border-radius:50%;overflow:hidden;background:#20265b;color:#fff;font-weight:800;font-size:.8rem;box-shadow:0 0 15px rgba(69,239,255,.22);animation:face-counter-spin var(--duration) linear infinite}
      .orbit-person-face img,.orbit-center-avatar img{width:100%;height:100%;object-fit:cover}
      .orbit-center{position:absolute;z-index:4;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;flex-direction:column;justify-content:center;width:116px;height:116px;padding:9px;border:1px solid var(--cyan);border-radius:50%;background:radial-gradient(circle,#25245b,#0b0d25 75%);box-shadow:0 0 24px rgba(69,239,255,.18);text-align:center}
      .orbit-center-avatar{display:grid;place-items:center;width:46px;height:46px;margin-bottom:4px;border:2px solid var(--pink);border-radius:50%;overflow:hidden;background:#20265b;color:#fff;font-weight:800}
      .orbit-center strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.68rem}.orbit-center small{color:var(--cyan);font-size:.55rem;letter-spacing:.2em}
      .orbit-overlay{position:absolute;z-index:5;left:50%;bottom:7%;transform:translateX(-50%);width:84%;display:grid;gap:4px;padding:12px;border:1px solid rgba(69,239,255,.3);background:rgba(7,9,27,.9);text-align:center}
      .orbit-overlay strong{font-size:.9rem}.orbit-overlay span{color:var(--muted);font-size:.7rem}
      .orbit-legend{padding:20px;border:1px solid var(--line);background:rgba(14,17,46,.92)}
      .orbit-legend-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:20px}.orbit-legend-head .eyebrow{margin-bottom:5px}.orbit-legend-head h2{font-size:1.35rem}.orbit-legend-head>strong{font-size:1.3rem;color:var(--cyan)}.orbit-legend-head>strong small{font-size:.6rem;color:var(--muted);display:block}
      .orbit-legend-row{display:flex;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid rgba(54,58,112,.7)}.orbit-legend-dot{width:9px;height:9px;flex:none;border-radius:50%}.orbit-legend-row div{display:grid;gap:1px;flex:1}.orbit-legend-row strong{font-size:.8rem}.orbit-legend-row small{font-size:.68rem;color:var(--muted)}.orbit-legend-row>b{font-size:1.1rem}
      .orbit-privacy{margin:19px 0 0;color:#8189ad;font-size:.68rem;line-height:1.65}
      @keyframes orbit-path{from{transform:rotate(var(--start-angle)) translateX(var(--radius))}to{transform:rotate(calc(var(--start-angle) + 360deg)) translateX(var(--radius))}}
      @keyframes face-counter-spin{from{transform:rotate(calc(-1 * var(--start-angle)))}to{transform:rotate(calc(-1 * var(--start-angle) - 360deg))}}
      @media(prefers-reduced-motion:reduce){.orbit-person,.orbit-person-face{animation:none!important}}
      @media(max-width:900px){.orbit-layout{grid-template-columns:1fr}.orbit-stage{--stage-size:min(86vw,650px)}}
      @media(max-width:600px){.orbit-controls{align-items:stretch;flex-direction:column}.orbit-controls .button{width:100%}.orbit-stage{--stage-size:calc(100vw - 40px)}.orbit-center{width:92px;height:92px}.orbit-center-avatar{width:36px;height:36px}.orbit-person-face{width:32px;height:32px;margin:-16px}.orbit-ring span{font-size:.5rem}}
    `}</style>
  </main>;
}
