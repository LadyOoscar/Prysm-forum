"use client";
import {useEffect} from "react";
import {createSupabaseBrowser} from "../../lib/supabase-browser";
export default function ActivityPulse(){const supabase=createSupabaseBrowser();useEffect(()=>{let timer:ReturnType<typeof setInterval>|null=null;async function ping(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;await supabase.from("profiles").update({last_seen_at:new Date().toISOString()}).eq("id",user.id);}void ping();timer=setInterval(()=>void ping(),60000);return()=>{if(timer)clearInterval(timer)}},[]);return null}