"use client";
import {useEffect,useState} from "react";
import {createSupabaseBrowser} from "../../lib/supabase-browser";
export default function DatingFavorite({profileId}:{profileId:string}){const supabase=createSupabaseBrowser();const [favorite,setFavorite]=useState(false);const [busy,setBusy]=useState(false);
useEffect(()=>{async function load(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from("dating_favorites").select("favorite_id").eq("user_id",user.id).eq("favorite_id",profileId).maybeSingle();setFavorite(Boolean(data))}void load()},[profileId]);
async function toggle(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;setBusy(true);if(favorite){await supabase.from("dating_favorites").delete().eq("user_id",user.id).eq("favorite_id",profileId);setFavorite(false)}else{const {error}=await supabase.from("dating_favorites").insert({user_id:user.id,favorite_id:profileId});if(!error)setFavorite(true)}setBusy(false)}
return <button className="button" type="button" disabled={busy} onClick={()=>void toggle()}>{favorite?"★ Favori":"☆ Ajouter aux favoris"}</button>}