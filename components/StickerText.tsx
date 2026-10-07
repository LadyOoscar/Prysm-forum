"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Sticker = { id:string; name:string; image_url:string };

export default function StickerText({ body }: { body:string }) {
  const supabase = createClient();
  const [stickers,setStickers]=useState<Record<string,Sticker>>({});
  const ids=[...body.matchAll(/\[sticker:([0-9a-f-]{36})\]/gi)].map(m=>m[1]);
  useEffect(()=>{ if(!ids.length) return; supabase.from("stickers").select("id,name,image_url").in("id",ids).eq("status","approved").then(({data})=>setStickers(Object.fromEntries((data??[]).map(s=>[s.id,s as Sticker])))); },[body]);
  const parts=body.split(/(\[sticker:[0-9a-f-]{36}\])/gi);
  return <>{parts.map((part,i)=>{ const m=part.match(/^\[sticker:([0-9a-f-]{36})\]$/i); if(!m) return <span key={i}>{part}</span>; const s=stickers[m[1]]; return s ? <img key={i} className="inlineSticker" src={s.image_url} alt={s.name} loading="lazy" /> : null; })}</>;
}
