"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Sticker = { id:string; name:string; tags:string[]; image_url:string; usage_count:number };

type Props = { onSelect:(sticker:Sticker)=>void };

export default function StickerPicker({ onSelect }: Props) {

  const [open,setOpen]=useState(false);
  const [stickers,setStickers]=useState<Sticker[]>([]);
  const [query,setQuery]=useState("");
  const [uploading,setUploading]=useState(false);
  const [notice,setNotice]=useState("");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("stickers").select("id,name,tags,image_url,usage_count").eq("status","approved").order("usage_count",{ascending:false}).limit(80);
    setStickers((data ?? []) as Sticker[]);
  }
  useEffect(()=>{ if(open) load(); },[open]);

  async function upload(file:File) {
    const supabase = createClient();
    setNotice("");
    if (!file.type.startsWith("image/") || file.size > 5*1024*1024) {
      setNotice("Image PNG, JPG, GIF ou WebP de 5 Mo maximum.");
      return;
    }
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) { setNotice("Connecte-toi pour proposer un sticker."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = userId + "/" + crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await supabase.storage.from("stickers").upload(path,file,{contentType:file.type,upsert:false});
    if (uploadError) { setNotice("Upload impossible."); setUploading(false); return; }
    const { data: publicData } = supabase.storage.from("stickers").getPublicUrl(path);
    const name = file.name.replace(/\.[^.]+$/,"").slice(0,80);
    const { error } = await supabase.from("stickers").insert({creator_id:userId,name,tags:[],image_url:publicData.publicUrl,mime_type:file.type});
    setUploading(false);
    setNotice(error ? "Sticker envoyé en modération." : "Sticker envoyé en modération. Il apparaîtra après validation.");
  }

  const filtered = stickers.filter(s => !query.trim() || s.name.toLowerCase().includes(query.toLowerCase()) || s.tags.some(t=>t.toLowerCase().includes(query.toLowerCase())));

  return <div className="stickerPicker">
    <button type="button" className="stickerTrigger" onClick={()=>setOpen(v=>!v)}>🖼️ Stickers</button>
    {open && <div className="stickerPanel">
      <div className="stickerPanelHeader"><strong>Stickers PRYSM</strong><button type="button" onClick={()=>setOpen(false)}>×</button></div>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un sticker…" />
      <div className="stickerGrid">
        {filtered.map(sticker=><button type="button" className="stickerItem" key={sticker.id} title={sticker.name} onClick={()=>{onSelect(sticker);setOpen(false);}}>
          <img src={sticker.image_url} alt={sticker.name} />
        </button>)}
      </div>
      {!filtered.length && <p className="stickerEmpty">Aucun sticker pour le moment.</p>}
      <label className="stickerUpload">{uploading ? "Envoi…" : "＋ Proposer un sticker"}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f) upload(f);e.currentTarget.value="";}} /></label>
      {notice && <p className="stickerNotice">{notice}</p>}
    </div>}
  </div>;
}
