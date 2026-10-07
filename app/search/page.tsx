"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Topic = { id:string; title:string; body:string; created_at:string; community_id:string; author_id:string };
type Profile = { id:string; username:string; display_name:string; bio:string; avatar_url:string|null };
type Community = { id:string; slug:string; name:string; icon:string; category:string };

function SearchContent() {
  const router=useRouter();
  const params=useSearchParams();
  
  const initial=params.get("q") ?? "";
  const [query,setQuery]=useState(initial);
  const [submitted,setSubmitted]=useState(initial);
  const [topics,setTopics]=useState<Topic[]>([]);
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [communities,setCommunities]=useState<Community[]>([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{ setQuery(initial); setSubmitted(initial); },[initial]);

  useEffect(()=>{
    if(!submitted.trim()){setTopics([]);setProfiles([]);setCommunities([]);return;}
    let cancelled=false;
    async function search(){
      setLoading(true);
      const supabase=createClient();
      const term=submitted.trim().replace(/,/g," ");
      const pattern=`%${term}%`;
      const [{data:topicRows},{data:profileRows},{data:communityRows}]=await Promise.all([
        supabase.from("topics").select("id,title,body,created_at,community_id,author_id").or(`title.ilike.${pattern},body.ilike.${pattern}`).order("created_at",{ascending:false}).limit(30),
        supabase.from("profiles").select("id,username,display_name,bio,avatar_url").or(`username.ilike.${pattern},display_name.ilike.${pattern},bio.ilike.${pattern}`).order("username").limit(20),
        supabase.from("communities").select("id,slug,name,icon,category").or(`name.ilike.${pattern},slug.ilike.${pattern}`).order("name").limit(20)
      ]);
      if(!cancelled){setTopics(topicRows??[]);setProfiles(profileRows??[]);setCommunities(communityRows??[]);setLoading(false);}
    }
    search();
    return()=>{cancelled=true;};
  },[submitted]);

  function submit(e:FormEvent){e.preventDefault();const q=query.trim();router.push(q?`/search?q=${encodeURIComponent(q)}`:"/search");setSubmitted(q);}
  return <main>
    <header><div className="brand">PRYSM<span>✦</span></div><nav><a href="/">Forum</a><a className="active">Recherche</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav><a className="profile" href="/profile">☾ <span>Mon profil</span></a></header>
    <div className="searchPage">
      <button className="backButton" onClick={()=>router.push("/")}>← Retour au forum</button>
      <h1>Recherche</h1>
      <p className="searchIntro">Retrouvez des discussions, des membres et des communautés dans tout PRYSM.</p>
      <form className="searchForm" onSubmit={submit}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher sur PRYSM…" aria-label="Recherche" /><button className="primary">Rechercher</button></form>
      {loading?<div className="authCard"><p>Recherche…</p></div>:submitted.trim()?<div className="searchResults">
        <section><h2>Discussions <span>{topics.length}</span></h2>{topics.length?<div className="searchList">{topics.map(t=><button className="searchResult" key={t.id} onClick={()=>router.push(`/topic?id=${t.id}`)}><strong>{t.title}</strong><p>{t.body.slice(0,180)}{t.body.length>180?"…":""}</p><small>{new Date(t.created_at).toLocaleDateString("fr-FR")}</small></button>)}</div>:<p className="emptyState">Aucune discussion trouvée.</p>}</section>
        <section><h2>Membres <span>{profiles.length}</span></h2>{profiles.length?<div className="searchList">{profiles.map(p=><button className="searchResult" key={p.id} onClick={()=>router.push(`/profile/${p.username}`)}><strong>{p.display_name||p.username}</strong><small>@{p.username}</small>{p.bio&&<p>{p.bio.slice(0,140)}{p.bio.length>140?"…":""}</p>}</button>)}</div>:<p className="emptyState">Aucun membre trouvé.</p>}</section>
        <section><h2>Communautés <span>{communities.length}</span></h2>{communities.length?<div className="searchList">{communities.map(c=><button className="searchResult" key={c.id} onClick={()=>router.push(`/community/${c.slug}`)}><strong>{c.icon} {c.name}</strong><small>{c.category}</small></button>)}</div>:<p className="emptyState">Aucune communauté trouvée.</p>}</section>
      </div>:<div className="searchEmpty"><div>⌕</div><p>Commencez par rechercher un sujet, un membre ou une communauté.</p></div>}
    </div>
  </main>;
}
export default function SearchPage(){return <Suspense fallback={<main><div className="authPage"><div className="authCard"><p>Chargement…</p></div></div></main>}><SearchContent/></Suspense>;}
