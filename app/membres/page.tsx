import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export const revalidate = 30;

type SearchParams = Promise<{ q?: string }>;

export default async function MembresPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q || "").trim().replace(/[,%()_*]/g, " ").replace(/\s+/g, " ").slice(0, 80);
  let query = getSupabase()
    .from("profiles")
    .select("username,display_name,avatar_url,last_seen_at,level,title,reputation")
    .eq("profile_visibility", "public")
    .order("last_seen_at", { ascending: false })
    .limit(50);

  if (q) {
    query = query.or("username.ilike.%"+q+"%,display_name.ilike.%"+q+"%");
  }

  const { data } = await query;
  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link href="/rencontres">Rencontres</Link><Link className="active" href="/membres">Membres</Link><Link href="/profil">Profil</Link></nav></header>
    <section className="page-head compact">
      <p className="eyebrow">Communauté</p>
      <h1>{q ? "Trouver un membre." : "Annuaire des membres."}</h1>
      <p className="lead">{q ? "Recherche par pseudo ou nom affiché." : "Retrouve les membres de PRYSM, même ceux qui ne se sont pas connectés récemment."}</p>
    </section>
    <form action="/membres" method="get" role="search" className="member-search">
      <label htmlFor="member-query">Rechercher un membre</label>
      <div className="member-search-row">
        <input id="member-query" type="search" name="q" defaultValue={q} placeholder="Pseudo ou nom affiché…" maxLength={80} autoComplete="off"/>
        <button className="button primary" type="submit">Rechercher</button>
        {q && <Link className="button" href="/membres">Effacer</Link>}
      </div>
      <p className="member-search-hint">Tu peux saisir une partie du pseudo ou du nom. Seuls les profils publics apparaissent.</p>
    </form>
    {!data?.length ? <div className="empty"><div className="empty-symbol">⌕</div><h2>{q ? "Aucun membre trouvé" : "Personne en vue"}</h2><p>{q ? "Essaie un autre pseudo ou une autre orthographe." : "Les membres actifs apparaîtront ici dès qu’ils navigueront sur PRYSM."}</p></div> :
      <section className="cards" aria-label={q ? "Résultats de recherche" : "Annuaire des membres"}>{data.map((p: any) => <Link className="card" href={"/membre/" + encodeURIComponent(p.username)} key={p.username}>
        <div className="avatar">{p.avatar_url ? <img src={p.avatar_url} alt="" /> : (p.display_name || p.username).slice(0, 1).toUpperCase()}</div>
        <span>@{p.username}</span><h3>{p.display_name || p.username}</h3>
        <p>Niveau {p.level || 1} · {p.title || "Nouveau"} · {p.reputation || 0} réputation</p>
        <strong>{p.last_seen_at && new Date(p.last_seen_at).getTime() > Date.now() - 3 * 60 * 1000 ? <><span className="presence-dot active"/> En ligne</> : p.last_seen_at ? "Actif récemment" : "Membre PRYSM"}</strong>
      </Link>)}</section>}
    <style>{`
      .member-search{margin:0 0 24px;padding:18px;border:1px solid var(--line);border-radius:14px;background:rgba(13,15,22,.72)}
      .member-search label{display:block;margin-bottom:9px;font-weight:750}
      .member-search-row{display:flex;flex-wrap:wrap;gap:9px}
      .member-search-row input{flex:1 1 220px;min-width:0;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#090b16;color:var(--text);font:inherit}
      .member-search-row .button{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border:1px solid var(--line);border-radius:10px;color:var(--text);text-decoration:none;font:inherit;cursor:pointer}
      .member-search-hint{margin:9px 0 0;color:var(--muted);font-size:.8rem}
    `}</style>
  </main>;
}
