"use client";
import { FormEvent,useEffect,useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "../../../../lib/supabase-browser";

export default function NewTopic(){
 const {slug}=useParams<{slug:string}>(); const supabase=createSupabaseBrowser();
 const [categoryId,setCategoryId]=useState(""); const [title,setTitle]=useState(""); const [body,setBody]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 useEffect(()=>{supabase.from("forum_categories").select("id").eq("slug",slug).maybeSingle().then(({data})=>setCategoryId(data?.id||""));},[slug]);
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/auth";return;}if(!categoryId){setError("Section introuvable.");setLoading(false);return;}const {data,error}=await supabase.from("forum_topics").insert({category_id:categoryId,author_id:user.id,title}).select("id").single();if(error||!data){setError(error?.message||"Impossible de créer le sujet.");setLoading(false);return;}const post=await supabase.from("forum_posts").insert({topic_id:data.id,author_id:user.id,body});if(post.error){await supabase.from("forum_topics").delete().eq("id",data.id);setError(post.error.message);setLoading(false);return;}window.location.href="/topic/"+data.id;}
 return <main className="shell"><header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/forum">Forum</Link><Link href="/profil">Profil</Link></nav></header><section className="page-head compact"><Link className="back" href={"/forum/"+slug}>← Retour à la section</Link><p className="eyebrow">Nouvelle discussion</p><h1>Ouvrir un sujet.</h1></section><form className="auth-card topic-form" onSubmit={submit}><label>Titre<input required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} /></label><label>Message<textarea required minLength={1} maxLength={10000} value={body} onChange={e=>setBody(e.target.value)} /></label>{error&&<div className="notice error">{error}</div>}<button className="button primary" disabled={loading}>{loading?"Publication…":"Publier le sujet"}</button></form></main>
}
