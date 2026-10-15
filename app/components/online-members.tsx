"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type OnlineMember = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
};

export default function OnlineMembers() {
  const [members, setMembers] = useState<OnlineMember[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadMembers = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase.rpc("get_online_members", { p_limit: 12 });
    if (!error) setMembers((data ?? []) as OnlineMember[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void loadMembers();
    const timer = window.setInterval(() => void loadMembers(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadMembers]);

  return (
    <section className="online-members" aria-labelledby="online-members-title">
      <div className="online-members-heading">
        <div>
          <p className="eyebrow">En direct sur PRYSM</p>
          <h2 id="online-members-title">Membres connectés <span>{members.length}</span></h2>
        </div>
        <span className="online-members-live"><i /> En ligne</span>
      </div>
      {!loaded ? <p className="online-members-empty">Recherche des membres présents…</p> :
        members.length ? <div className="online-members-list">{members.map((member) => (
          <Link className="online-member" href={"/membre/" + encodeURIComponent(member.username)} key={member.id} title={"Voir le profil de " + (member.display_name || member.username)}>
            <span className="online-member-avatar">{member.avatar_url ? <img src={member.avatar_url} alt="" /> : (member.display_name || member.username || "?").slice(0, 1).toUpperCase()}<i /></span>
            <span className="online-member-name">{member.display_name || member.username}<small>@{member.username}</small></span>
          </Link>
        ))}</div> : <p className="online-members-empty">Personne n’est signalé en ligne pour le moment. Passe dire bonjour quand tu arrives !</p>}
      <style jsx>{`
        .online-members{margin:0 0 28px;padding:20px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(135deg,rgba(107,231,218,.055),rgba(171,126,255,.07))}
        .online-members-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
        .online-members-heading .eyebrow{margin:0 0 5px}
        .online-members-heading h2{margin:0;font-size:clamp(1.25rem,2.4vw,1.8rem)}
        .online-members-heading h2 span{display:inline-grid;place-items:center;min-width:25px;height:25px;padding:0 7px;margin-left:5px;border:1px solid var(--line);border-radius:999px;color:var(--accent);font-size:.8rem;vertical-align:middle}
        .online-members-live{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:.78rem;white-space:nowrap}
        .online-members-live i,.online-member-avatar i{width:8px;height:8px;border-radius:50%;background:#5ee6a8;box-shadow:0 0 10px #5ee6a866}
        .online-members-list{display:flex;flex-wrap:wrap;gap:10px}
        .online-member{display:flex;align-items:center;gap:9px;min-width:0;max-width:100%;padding:8px 11px 8px 8px;border:1px solid var(--line);border-radius:12px;background:rgba(8,10,22,.5);text-decoration:none;color:var(--text);transition:border-color .15s,transform .15s}
        .online-member:hover{border-color:var(--accent);transform:translateY(-1px)}
        .online-member-avatar{position:relative;display:grid;place-items:center;flex:none;width:38px;height:38px;overflow:visible;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#111;font-weight:800}
        .online-member-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
        .online-member-avatar i{position:absolute;right:-1px;bottom:0;width:10px;height:10px;border:2px solid #111}
        .online-member-name{display:flex;flex-direction:column;min-width:0;font-size:.88rem;font-weight:700}
        .online-member-name small{max-width:180px;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:.72rem;font-weight:400}
        .online-members-empty{margin:0;color:var(--muted);font-size:.88rem;line-height:1.6}
        @media(max-width:480px){.online-members{padding:15px}.online-member{flex:1 1 135px}.online-member-name small{max-width:130px}}
      `}</style>
    </section>
  );
}
