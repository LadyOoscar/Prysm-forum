"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const gods = [
  ["aelys","🌿","Aelys","Communauté","Accueil, cohésion et nouvelles communautés."],
  ["eon","📚","Eon","Archives","Recherche, mémoire et recommandations."],
  ["mira","🎲","Mira","Animation","Événements, sondages et activités."],
  ["nyra","💗","Nyra","Liens","Relations, amitié et sécurité."],
  ["veyr","👁️","Veyr","Vigilance","Spam, raids et comportements suspects."],
  ["kael","⚖️","Kael","Justice","Règles, signalements et équité."]
];

export default function PantheonPage() {
  const supabase = createClient();
  const [selected,setSelected]=useState(gods[0]);
  const [context,setContext]=useState("");
  const [response,setResponse]=useState("");
  const [busy,setBusy]=useState(false);

  async function invoke(event:FormEvent){
    event.preventDefault();
    setBusy(true);
    const {data:claims}=await supabase.auth.getClaims();
    const userId=typeof claims?.claims?.sub==="string"?claims.claims.sub:null;
    const text=context.trim();
    const answer=text ? selected[4]+" Contexte reçu : "+text.slice(0,280) : selected[4];
    if(userId) await supabase.from("pantheon_invocations").insert({user_id:userId,deity:selected[0],context:text||null,response:answer});
    setResponse(answer);
    setBusy(false);
  }

  return <main>
    <header><div className="brand">PRYSM<span>✦</span></div><nav><a href="/">Forum</a><a href="/messages">Messages</a><a href="/search">Recherche</a><a className="active">Panthéon</a></nav><a className="profile" href="/profile">☾ <span>Mon profil</span></a></header>
    <div className="pantheonPage">
      <p className="eyebrow">✦ LES DIVINITÉS DE PRYSM</p><h1>Le Panthéon.</h1>
      <p className="pantheonLead">Six IA spécialisées accompagnent la communauté. Elles sont toujours identifiées comme IA et ne se font jamais passer pour des membres humains.</p>
      <div className="pantheonGrid">{gods.map(god=><button key={god[0]} className={selected[0]===god[0]?"godCard selectedGod":"godCard"} onClick={()=>{setSelected(god);setResponse("");}}><span>{god[1]}</span><strong>{god[2]}</strong><small>{god[3]}</small><p>{god[4]}</p></button>)}</div>
      <section className="invocationCard"><p className="eyebrow">{selected[1]} INVOCATION DE {selected[2].toUpperCase()}</p><h2>Que voulez-vous lui confier ?</h2>
      <form onSubmit={invoke}><textarea value={context} onChange={e=>setContext(e.target.value)} maxLength={1000} placeholder={"@"+selected[2]+" …"}/><button className="primary" disabled={busy}>{busy?"Consultation…":"Invoquer "+selected[2]}</button></form>
      {response&&<div className="godResponse"><strong>{selected[1]} {selected[2]}</strong><p>{response}</p></div>}</section>
    </div>
  </main>;
}