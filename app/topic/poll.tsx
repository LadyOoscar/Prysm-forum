"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Option = { id:string; label:string; position:number };
type Props = { pollId:string };

export default function Poll({ pollId }: Props) {
  const supabase = createSupabaseBrowser();
  const [question,setQuestion]=useState("");
  const [multiple,setMultiple]=useState(false);
  const [options,setOptions]=useState<Option[]>([]);
  const [votes,setVotes]=useState<Record<string,number>>({});
  const [selected,setSelected]=useState<string[]>([]);
  const [voted,setVoted]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function load() {
    const { data: p } = await supabase.from("forum_polls").select("question,multiple_choice").eq("id",pollId).maybeSingle();
    const { data: o } = await supabase.from("forum_poll_options").select("id,label,position").eq("poll_id",pollId).order("position");
    const { data: v } = await supabase.from("forum_poll_results").select("option_id,vote_count").eq("poll_id",pollId);
    if (p) { setQuestion(p.question); setMultiple(p.multiple_choice); }
    setOptions((o ?? []) as Option[]);
    const counts:Record<string,number> = {};
    for (const row of v ?? []) counts[row.option_id] = row.vote_count ?? 0;
    setVotes(counts);
    const { data:{user} } = await supabase.auth.getUser();
    if (user) {
      
      const { data: mine } = await supabase.from("forum_poll_votes").select("option_id").eq("poll_id",pollId).eq("user_id",user.id);
      setSelected((mine ?? []).map((row:any)=>row.option_id));
      setVoted(Boolean(mine?.length));
    }
  }

  useEffect(()=>{ load(); },[pollId]);

  const total = useMemo(()=>Object.values(votes).reduce((a,b)=>a+b,0),[votes]);

  function toggle(id:string) {
    setSelected(current => multiple
      ? current.includes(id) ? current.filter(x=>x!==id) : [...current,id]
      : current.includes(id) ? [] : [id]);
  }

  async function submit() {
    setError("");
    if (!selected.length) { setError("Choisis au moins une option."); return; }
    setLoading(true);
    const { error } = await supabase.rpc("vote_poll",{p_poll_id:pollId,p_option_ids:selected});
    if (error) setError(error.message);
    else { setVoted(true); await load(); }
    setLoading(false);
  }

  return <section className="poll-card">
    <p className="eyebrow">SONDAGE</p>
    <h2>{question}</h2>
    <div className="poll-options">
      {options.map(option => {
        const count=votes[option.id] ?? 0;
        const percent=total ? Math.round(count/total*100) : 0;
        return <button type="button" className={"poll-option"+(selected.includes(option.id)?" selected":"")} key={option.id} onClick={()=>toggle(option.id)}>
          <span className="poll-option-top"><span>{option.label}</span><strong>{percent}%</strong></span>
          <span className="poll-bar"><span style={{width:percent+"%"}} /></span>
          <small>{count} vote{count!==1?"s":""}</small>
        </button>;
      })}
    </div>
    {error && <div className="notice error">{error}</div>}
    {!voted && <button className="button primary" onClick={submit} disabled={loading}>{loading?"Vote…":"Voter"}</button>}
    {voted && <p className="poll-status">Ton vote est enregistré. Tu peux revoter pour modifier ton choix.</p>}
  </section>;
}
