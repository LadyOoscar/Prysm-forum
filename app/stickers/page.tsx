"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StickerPicker from "@/components/StickerPicker";

type Sticker={id:string;name:string;tags:string[];category:string;image_url:string;usage_count:number;creator_id:string};

export default function StickersPage(){
 const [items,setItems]=useState<Sticker[]>([]);
 const [favorites,setFavorites]=useState<string[]>([]);
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("Tous");
 const [mode,setMode]=useState<"popular"|"recent"|"favorites">("popular");
 const categories=["Tous","Général","Humour","LGBTQIA+","Gaming","Animaux","Manga & BD","Culture","Créateurs"];
 async function load(){
  const supabase=createClient();
  const {data}=await supabase.from("stickers").select("id,name,tags,category,image_url,usage_count,creator_id").eq("status","approved").order(mode==="recent"?"created_at":"usage_count",{ascending:false}).limit(120);
  setItems((data??[]) as Sticker[]);
  const {data:claims}=await supabase.auth.getClaims();
  if(claims?.claims?.sub){const {data:f}=await supabase.from("sticker_favorites").select("sticker_id").eq("user_id",claims.claims.sub);setFavorites((f??[]).map(x=>x.sticker_id));}
 }
 useEffect(()=>{load()},[mode]);
 async function toggleFavorite(id:string){
  const supabase=createClient();
  const {data:claims}=await supabase.auth.getClaims(); const uid=claims?.claims?.sub;
  if(!uid)return;
  if(favorites.includes(id)){await supabase.from("sticker_favorites").delete().match({sticker_id:id,user_id:uid});setFavorites(f=>f.filter(x=>x!==id))}
  else{await supabase.from("sticker_favorites").insert({sticker_id:id,user_id:uid});setFavorites(f=>[...f,id])}
 }
 const filtered=items.filter(s=>(category==="Tous"||s.category===category)&&(mode!=="favorites"||favorites.includes(s.id))&&(!query.trim()||s.name.toLowerCase().includes(query.toLowerCase())||s.tags.some(t=>t.toLowerCase().includes(query.toLowerCase()))));
 return <main><header><div className="brand">PRYSM<span>✦</span></div><nav><a href="/">Forum</a><a href="/messages">Messages</a><a className="active" href="/stickers">Stickers</a><a href="/pantheon">Panthéon</a></nav><a className="profile" href="/profile">☾ <span>Mon profil</span></a></header>
 <div className="stickerLibrary"><div className="eyebrow">BANQUE COMMUNAUTAIRE</div><h1>Les stickers de PRYSM</h1><p className="libraryIntro">Une galerie créée par les membres, pour les membres. Propose tes propres images, explore les créations et garde tes favorites sous la main.</p>
 <div className="stickerLibraryTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="🔎 Rechercher par nom ou tag…"/><div className="stickerModes">{(["popular","recent","favorites"] as const).map(m=><button key={m} className={mode===m?"active":""} onClick={()=>setMode(m)}>{m==="popular"?"🔥 Populaires":m==="recent"?"✨ Récents":"⭐ Favoris"}</button>)}</div></div>
 <div className="stickerCategories">{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
 <div className="stickerLibraryGrid">{filtered.map(s=><article className="stickerCard" key={s.id}><div className="stickerImage"><img src={s.image_url} alt={s.name}/></div><div className="stickerCardMeta"><strong>{s.name}</strong><small>{s.category} · {s.usage_count} utilisation{s.usage_count!==1?"s":""}</small><div>{s.tags.slice(0,3).map(t=><span key={t}>#{t}</span>)}</div></div><button className={favorites.includes(s.id)?"favorite active":"favorite"} onClick={()=>toggleFavorite(s.id)}>★</button></article>)}</div>
 {!filtered.length&&<div className="stickerEmptyLarge">Aucun sticker ne correspond à cette recherche.</div>}
 <div className="stickerSubmit"><h2>Créer la collection PRYSM</h2><p>Tu as une image qui mérite sa place dans la galerie ? Propose-la. Elle sera vérifiée par la modération avant publication.</p><StickerPicker onSelect={()=>{}}/></div>
 </div></main>
}