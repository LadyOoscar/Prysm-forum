"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

export default function ProfilPage(){
 const supabase=createSupabaseBrowser(); const [email,setEmail]=useState(""); const [name,setName]=useState(""); const [loading,setLoading]=useState(true);
 useEffect(()=>{supabase.auth.getUser().then(async({data})=>{if(!data.user){window.location.href="/auth";return;} setEmail(data.user.email||""); const {data:p}=await supabase.from("profiles").select("display_name").eq("id",data.user.id).maybeSingle();setName(p?.display_name||"");setLoading(false);});},[]);
 async function logout(){await supabase.auth.signOut();window.location.href="/";}
 return <main className="shell"><header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link className="active" href="/profil">Profil</Link></nav></header><section className="page-head"><p className="eyebrow">Ton espace</p><h1>Profil.</h1>{loading?<p className="lead">Chargement…</p>:<div className="profile-box"><div className="avatar">{name.slice(0,1).toUpperCase()||"P"}</div><h2>{name||"Membre PRYSM"}</h2><p>{email}</p><button className="button" onClick={logout}>Se déconnecter</button></div>}</section></main>
}
