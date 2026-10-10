"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import { getReputationTitle } from "../../lib/reputation";
import BadgeMedal from "../components/badge-medal";

type AlbumPhoto = {id:string; profile_id:string; image_url:string; storage_path:string; caption:string; created_at:string};

type Profile = {
  username: string; display_name: string; bio: string; pronouns: string | null; identity: string | null;
  interests: string[]; age: number | null; location: string | null; orientation: string | null; banner_url: string | null;
  looking_for: string | null; dating_enabled: boolean; match_discovery_enabled: boolean; dating_intentions: string[]; dating_open_to: string[]; profile_visibility: "public" | "private"; avatar_url: string | null; reputation: number; xp: number; level: number; title: string | null;
};

export default function ProfilPage() {
  const supabase = createSupabaseBrowser();
  const [email, setEmail] = useState(""); const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({display_name:"",bio:"",pronouns:"",identity:"",interests:"",age:"",location:"",orientation:"",looking_for:"",dating_enabled:true,match_discovery_enabled:true,dating_intentions:["friendship","discussion","community"],dating_open_to:["friendship","discussion","community"],profile_visibility:"public" as "public"|"private"});
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false); const [uploadingBanner,setUploadingBanner]=useState(false); const [uploadingAlbum,setUploadingAlbum]=useState(false); const [photos,setPhotos]=useState<AlbumPhoto[]>([]); const [message,setMessage]=useState(""); const [badges,setBadges]=useState<any[]>([]);

  useEffect(()=>{async function load(){const {data}=await supabase.auth.getUser();if(!data.user){window.location.href="/auth";return;}setEmail(data.user.email||"");
    const {data:p}=await supabase.from("profiles").select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,match_discovery_enabled,dating_intentions,dating_open_to,profile_visibility,avatar_url,banner_url,reputation,xp,level,title").eq("id",data.user.id).maybeSingle();
    if(p){const next=p as Profile;setProfile(next);const {data:badgeData}=await supabase.from("profile_badges").select("badge_id,badges:badge_id(name,icon,tone,description,background_color,image_zoom,image_position_x,image_position_y,border_color,border_width,glow_intensity)").eq("profile_id",data.user.id).order("awarded_at",{ascending:false});setBadges(badgeData||[]);const {data:photoData}=await supabase.from("profile_photos").select("id,profile_id,image_url,storage_path,caption,created_at").eq("profile_id",data.user.id).order("created_at",{ascending:false});setPhotos((photoData||[]) as AlbumPhoto[]);setForm({display_name:next.display_name||"",bio:next.bio||"",pronouns:next.pronouns||"",identity:next.identity||"",interests:(next.interests||[]).join(", "),age:next.age?.toString()||"",location:next.location||"",orientation:next.orientation||"",looking_for:next.looking_for||"",dating_enabled:next.dating_enabled,match_discovery_enabled:next.match_discovery_enabled,dating_intentions:next.dating_intentions||["friendship","discussion","community"],dating_open_to:next.dating_open_to||["friendship","discussion","community"],profile_visibility:next.profile_visibility||"public"});}setLoading(false);}void load()},[]);

  function updateField(field:string,value:string|boolean){setForm(current=>({...current,[field]:value}));}
  function toggleIntent(field:"dating_intentions"|"dating_open_to",value:string,checked:boolean){setForm(current=>({...current,[field]:checked?Array.from(new Set([...current[field],value])):current[field].filter(item=>item!==value)}));}
  function getXpProgress(xp:number,level:number){
    const safeXp=Math.max(0,xp||0), safeLevel=Math.max(1,level||1);
    const currentFloor=(safeLevel-1)*(safeLevel-1)*100;
    const nextFloor=safeLevel*safeLevel*100;
    const span=Math.max(1,nextFloor-currentFloor);
    const percent=Math.max(0,Math.min(100,Math.round(((safeXp-currentFloor)/span)*100)));
    return {percent,nextFloor};
  }
  async function uploadAvatar(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]; event.target.value=""; if(!file)return; setMessage("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Format accepté : JPG, PNG ou WebP.");return;}
    if(file.size>5*1024*1024){setMessage("L’image ne doit pas dépasser 5 Mo.");return;}
    setUploading(true); const {data}=await supabase.auth.getUser(); if(!data.user){window.location.href="/auth";return;}
    const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp"; const path=data.user.id+"/avatar-"+Date.now()+"."+ext;
    const {error}=await supabase.storage.from("avatars").upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
    if(error){setMessage("Impossible d’envoyer la photo pour le moment.");setUploading(false);return;}
    const {data:publicData}=supabase.storage.from("avatars").getPublicUrl(path);
    const {data:updated,error:updateError}=await supabase.from("profiles").update({avatar_url:publicData.publicUrl,updated_at:new Date().toISOString()}).eq("id",data.user.id).select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,match_discovery_enabled,dating_intentions,dating_open_to,profile_visibility,avatar_url,banner_url,reputation,xp,level,title").single();
    if(updateError){await supabase.storage.from("avatars").remove([path]);setMessage("La photo a été envoyée mais n’a pas pu être enregistrée.");}else{setProfile(updated as Profile);setMessage("Photo de profil mise à jour.");}
    setUploading(false);
  }
  async function uploadBanner(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]; event.target.value=""; if(!file)return; setMessage("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Format accepté : JPG, PNG ou WebP.");return;}
    if(file.size>5*1024*1024){setMessage("La bannière ne doit pas dépasser 5 Mo.");return;}
    setUploadingBanner(true); const {data}=await supabase.auth.getUser(); if(!data.user){window.location.href="/auth";return;}
    const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp"; const path=data.user.id+"/banner-"+Date.now()+"."+ext;
    const {error}=await supabase.storage.from("avatars").upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
    if(error){setMessage("Impossible d’envoyer la bannière pour le moment.");setUploadingBanner(false);return;}
    const {data:publicData}=supabase.storage.from("avatars").getPublicUrl(path);
    const {data:updated,error:updateError}=await supabase.from("profiles").update({banner_url:publicData.publicUrl,updated_at:new Date().toISOString()}).eq("id",data.user.id).select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,match_discovery_enabled,dating_intentions,dating_open_to,profile_visibility,avatar_url,banner_url,reputation,xp,level,title").single();
    if(updateError){await supabase.storage.from("avatars").remove([path]);setMessage("La bannière a été envoyée mais n’a pas pu être enregistrée.");}else{setProfile(updated as Profile);setMessage("Bannière de profil mise à jour.");}
    setUploadingBanner(false);
  }
  async function uploadAlbumPhotos(event:React.ChangeEvent<HTMLInputElement>){
    const files=Array.from(event.target.files||[]); event.target.value=""; if(!files.length)return; setMessage("");
    if(!profile){setMessage("Charge ton profil avant d’ajouter des photos.");return;}
    if(photos.length+files.length>12){setMessage("Ton album peut contenir jusqu’à 12 photos. Retire-en une avant d’en ajouter d’autres.");return;}
    const allowed=["image/jpeg","image/png","image/webp"];
    const invalid=files.find(file=>!allowed.includes(file.type)||file.size>5*1024*1024);
    if(invalid){setMessage("Chaque photo doit être au format JPG, PNG ou WebP et peser 5 Mo maximum.");return;}
    setUploadingAlbum(true);
    const {data:authData}=await supabase.auth.getUser();
    if(!authData.user){window.location.href="/auth";setUploadingAlbum(false);return;}
    let added=0;
    for(const file of files){
      const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
      const path=authData.user.id+"/album/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
      const {error:uploadError}=await supabase.storage.from("avatars").upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
      if(uploadError){setMessage(added?added+" photo(s) ajoutée(s), mais une autre n’a pas pu être envoyée.":"Impossible d’envoyer les photos pour le moment.");break;}
      const {data:publicData}=supabase.storage.from("avatars").getPublicUrl(path);
      const {data:inserted,error:insertError}=await supabase.from("profile_photos").insert({profile_id:authData.user.id,image_url:publicData.publicUrl,storage_path:path,caption:""}).select("id,profile_id,image_url,storage_path,caption,created_at").single();
      if(insertError){await supabase.storage.from("avatars").remove([path]);setMessage(added?added+" photo(s) ajoutée(s), mais une autre n’a pas pu être enregistrée.":"Impossible d’enregistrer la photo dans ton album.");break;}
      setPhotos(current=>[inserted as AlbumPhoto,...current]); added++;
    }
    if(added===files.length)setMessage(added===1?"Photo ajoutée à ton album.":added+" photos ajoutées à ton album.");
    setUploadingAlbum(false);
  }
  async function removeAlbumPhoto(photo:AlbumPhoto){
    setMessage(""); const {data}=await supabase.auth.getUser(); if(!data.user||photo.profile_id!==data.user.id)return;
    setUploadingAlbum(true);
    const {error}=await supabase.from("profile_photos").delete().eq("id",photo.id).eq("profile_id",data.user.id);
    if(error){setMessage("Impossible de retirer cette photo.");setUploadingAlbum(false);return;}
    setPhotos(current=>current.filter(item=>item.id!==photo.id));
    const {error:storageError}=await supabase.storage.from("avatars").remove([photo.storage_path]);
    setMessage(storageError?"Photo retirée de l’album. Le fichier sera à nettoyer ultérieurement.":"Photo retirée de ton album.");
    setUploadingAlbum(false);
  }
  async function removeBanner(){
    setMessage(""); const {data}=await supabase.auth.getUser(); if(!data.user||!profile?.banner_url)return; setUploadingBanner(true);
    const {data:updated,error}=await supabase.from("profiles").update({banner_url:null,updated_at:new Date().toISOString()}).eq("id",data.user.id).select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,match_discovery_enabled,dating_intentions,dating_open_to,profile_visibility,avatar_url,banner_url,reputation,xp,level,title").single();
    if(error){setMessage("Impossible de retirer la bannière.");setUploadingBanner(false);return;}
    setProfile(updated as Profile);setMessage("Bannière de profil retirée.");setUploadingBanner(false);
  }
  async function removeAvatar(){
    setMessage(""); const {data}=await supabase.auth.getUser(); if(!data.user||!profile?.avatar_url)return; setUploading(true);
    const {data:updated,error}=await supabase.from("profiles").update({avatar_url:null,updated_at:new Date().toISOString()}).eq("id",data.user.id).select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,match_discovery_enabled,dating_intentions,dating_open_to,profile_visibility,avatar_url,banner_url,reputation,xp,level,title").single();
    if(error){setMessage("Impossible de retirer la photo.");setUploading(false);return;}
    setProfile(updated as Profile); setMessage("Photo de profil retirée."); setUploading(false);
  }
  async function save(event:React.FormEvent){event.preventDefault();setSaving(true);setMessage("");const {data}=await supabase.auth.getUser();if(!data.user){window.location.href="/auth";return;}
    const age=form.age.trim()?Number(form.age):null;if(age!==null&&(!Number.isInteger(age)||age<18||age>120)){setMessage("L’âge doit être compris entre 18 et 120 ans.");setSaving(false);return;}
    const interests=form.interests.split(",").map(item=>item.trim()).filter(Boolean).slice(0,20);
    const {data:updated,error}=await supabase.from("profiles").update({display_name:form.display_name.trim(),bio:form.bio.trim(),pronouns:form.pronouns.trim()||null,identity:form.identity.trim()||null,interests,age,location:form.location.trim()||null,orientation:form.orientation.trim()||null,looking_for:form.looking_for.trim()||null,dating_enabled:form.match_discovery_enabled,match_discovery_enabled:form.match_discovery_enabled,dating_intentions:form.dating_intentions,dating_open_to:form.dating_open_to,profile_visibility:form.profile_visibility,updated_at:new Date().toISOString()}).eq("id",data.user.id).select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,match_discovery_enabled,dating_intentions,dating_open_to,profile_visibility,avatar_url,banner_url,reputation,xp,level,title").single();
    if(error)setMessage("Impossible d’enregistrer le profil pour le moment.");else{
      const {data:refreshed}=await supabase.from("profiles").select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,match_discovery_enabled,dating_intentions,dating_open_to,profile_visibility,avatar_url,banner_url,reputation,xp,level,title").eq("id",data.user.id).single();
      setProfile((refreshed||updated) as Profile);setMessage("Profil enregistré.");
    }setSaving(false);
  }
  async function logout(){await supabase.auth.signOut();window.location.href="/";}
  if(loading)return <main className="shell"><section className="page-head"><p className="eyebrow">Ton espace</p><h1>Profil.</h1><p className="lead">Chargement…</p></section></main>;
  return <main className="shell"><header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link href="/recherche">Recherche</Link><Link className="active" href="/profil">Profil</Link></nav></header>
    <section className="page-head compact"><p className="eyebrow">Ton espace</p><h1>Profil.</h1><p className="lead">Présente-toi comme tu veux. Les informations de rencontre restent facultatives.</p></section>
    <style>{`.profile-cover{position:relative;height:clamp(100px,13vw,148px);min-height:0;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:radial-gradient(ellipse at 18% 15%,rgba(107,231,218,.22),transparent 38%),radial-gradient(ellipse at 85% 80%,rgba(171,126,255,.24),transparent 42%),#0b102b;margin-bottom:14px}.profile-cover>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 45%}.profile-cover:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,27,.68),rgba(8,10,27,.08))}.profile-cover-content{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;padding:12px}.profile-cover-content p{margin:3px 0 0;font-size:.75rem;line-height:1.35}.profile-cover-actions .button{min-height:30px;padding:5px 9px;font-size:.67rem;letter-spacing:.035em}.profile-cover-content strong{color:#fff}.profile-cover-actions{display:flex;gap:8px;flex-wrap:wrap}.profile-cover-actions input{display:none}.profile-badge-shelf{display:flex;gap:9px;flex-wrap:wrap}.profile-badge-chip{display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;padding:9px 12px;background:#0d1029;color:var(--text);font-size:.8rem}.profile-badge-chip.negative{border-color:rgba(255,112,142,.55);background:rgba(120,27,56,.22)}.profile-badge-chip span{font-size:1.05rem}.profile-badge-empty{color:var(--muted);font-size:.85rem;line-height:1.6}.profile-album-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.profile-album-item{position:relative;min-width:0;aspect-ratio:1;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#0b102b}.profile-album-item img{width:100%;height:100%;object-fit:cover;display:block}.profile-album-item button{position:absolute;right:6px;top:6px;min-width:34px;min-height:34px;border:1px solid rgba(255,255,255,.45);border-radius:6px;background:rgba(8,9,26,.86);color:#fff;cursor:pointer}.profile-summary{gap:13px;margin-bottom:20px;align-items:center}.profile-summary .profile-avatar{width:64px;height:64px;min-width:64px;min-height:64px;flex:0 0 64px;overflow:hidden;border-radius:50%;display:grid;place-items:center;font-size:1.2rem}.profile-summary .profile-avatar img{display:block;width:100%;height:100%;min-width:0;min-height:0;max-width:100%;max-height:100%;object-fit:cover;border-radius:inherit}.profile-summary>div:nth-child(2){min-width:0;flex:1}.profile-summary h2{font-size:1.35rem;line-height:1.2;overflow-wrap:anywhere}.profile-summary .reputation-line{margin-top:3px;font-size:.72rem;line-height:1.35}.profile-summary .xp-progress{max-width:380px}.profile-summary .xp-progress small{font-size:.65rem}.avatar-upload{max-width:210px}.profile-album-count{color:var(--muted);font-size:.8rem}.profile-tools{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:20px}@media(max-width:700px){.profile-album-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}}@media(max-width:420px){.profile-album-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.profile-box{padding:16px}.profile-cover{height:104px;border-radius:8px;margin-bottom:12px}.profile-cover-content{padding:9px}.profile-cover-content>div:first-child{max-width:100%}.profile-cover-content>div:first-child p{display:none}.profile-cover-actions{gap:5px}.profile-cover-actions .button{min-height:28px;padding:4px 7px;font-size:.61rem}.profile-summary{align-items:center;flex-wrap:wrap;gap:11px;margin-bottom:16px}.profile-summary .profile-avatar{width:56px;height:56px;min-width:56px;min-height:56px;flex-basis:56px}.profile-summary>div:nth-child(2){flex:1 1 calc(100% - 70px)}.profile-summary h2{font-size:1.15rem}.avatar-upload{margin-left:0;max-width:none;width:100%;gap:6px}.avatar-upload .button{min-height:31px;padding:6px 9px;font-size:.68rem}.avatar-upload small{width:100%}}.dating-preferences{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:18px 0}.dating-preferences fieldset{min-width:0;border:1px solid var(--line);border-radius:12px;padding:12px}.dating-preferences legend{padding:0 6px;font-weight:700}.dating-preferences label{display:flex;gap:8px;align-items:center;margin:8px 0}.dating-preferences p{grid-column:1/-1;color:var(--muted);font-size:.85rem;margin:0}@media(max-width:600px){.dating-preferences{grid-template-columns:1fr}}`}</style><section className="profile-box profile-editor"><div className="profile-tools"><Link className="button" href={profile?.username?'/membre/'+encodeURIComponent(profile.username):'/profil'}>Voir mon profil public ↗</Link><span className="field-hint">Aperçu de ce que les autres membres voient.</span></div><div className="profile-cover" aria-label="Bannière du profil">{profile?.banner_url&&<img src={profile.banner_url} alt="Bannière de profil"/>}<div className="profile-cover-content"><div><strong>Ta bannière personnelle</strong><p>Une image pour donner le ton de ton espace.</p></div><div className="profile-cover-actions"><label className="button" htmlFor="banner-file">{uploadingBanner?"Traitement…":profile?.banner_url?"Changer la bannière":"Ajouter une bannière"}</label><input id="banner-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBanner} disabled={uploadingBanner}/>{profile?.banner_url&&<button className="button" type="button" onClick={removeBanner} disabled={uploadingBanner}>Retirer</button>}</div></div></div><p className="field-hint">JPG, PNG ou WebP · 5 Mo max. Une bannière abstraite est affichée si tu n’ajoutes rien.</p><div className="profile-summary"><div className="avatar profile-avatar">{profile?.avatar_url?<img src={profile.avatar_url} alt="" />:(form.display_name||profile?.username||"P").slice(0,1).toUpperCase()}</div><div><h2>{form.display_name||profile?.username||"Membre PRYSM"}</h2><p>{email} · @{profile?.username}</p><p className="reputation-line"><strong>{profile?.reputation ?? 0}</strong> réputation · {getReputationTitle(profile?.reputation ?? 0)}</p><p className="reputation-line"><strong>Niveau {profile?.level ?? 1}</strong> · {profile?.xp ?? 0} XP{profile?.title ? ` · ${profile.title}` : ""}</p>
        {(() => { const progress=getXpProgress(profile?.xp ?? 0,profile?.level ?? 1); return <div className="xp-progress" aria-label={`${progress.percent}% de progression vers le niveau suivant`}><div className="xp-progress-head"><span>Progression</span><strong>{progress.percent}%</strong></div><div className="xp-progress-track"><span style={{width:`${progress.percent}%`}} /></div><small>{profile?.xp ?? 0} / {progress.nextFloor} XP pour le prochain niveau</small></div>; })()}
        </div><div className="avatar-upload"><label className="button" htmlFor="avatar-file">{uploading?"Traitement…":profile?.avatar_url?"Changer la photo":"Ajouter une photo"}</label><input id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploading}/>{profile?.avatar_url&&<button className="button" type="button" onClick={removeAvatar} disabled={uploading}>Retirer</button>}<small>JPG, PNG ou WebP · 5 Mo max.</small></div></div>
      <section className="profile-box" style={{marginTop:0,marginBottom:22}}><div className="profile-cover-content" style={{padding:0,marginBottom:12}}><div><span className="profile-label">Album photo</span><p className="profile-album-count">{photos.length}/12 photos · visible sur ton profil public</p></div><label className="button" htmlFor="album-files">{uploadingAlbum?"Envoi…":"Ajouter des photos"}</label><input id="album-files" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadAlbumPhotos} disabled={uploadingAlbum||photos.length>=12} style={{display:"none"}}/></div><p className="field-hint">JPG, PNG ou WebP · 5 Mo maximum par photo. Seules les photos de ton album sont affichées sur le profil public. Si ton profil est privé, l’album est masqué aux autres membres.</p>{photos.length?<div className="profile-album-grid">{photos.map(photo=><div className="profile-album-item" key={photo.id}><a href={photo.image_url} target="_blank" rel="noreferrer" aria-label="Ouvrir la photo dans un nouvel onglet"><img src={photo.image_url} alt={photo.caption||"Photo de mon album"} loading="lazy"/></a><button type="button" aria-label="Retirer cette photo" title="Retirer cette photo" onClick={()=>removeAlbumPhoto(photo)} disabled={uploadingAlbum}>×</button></div>)}</div>:<p className="profile-badge-empty">Ton album est encore vide. Ajoute quelques photos pour donner un aperçu de ton univers.</p>}</section>
      <section className="profile-box profile-badge-section"><span className="profile-label">Tes badges</span>{badges.length?<div className="profile-badge-shelf">{badges.map((item:any)=>{const badge=Array.isArray(item.badges)?item.badges[0]:item.badges;return badge?<div className="profile-badge-item" key={item.badge_id}><BadgeMedal badge={badge} size="medium"/><strong>{badge.name||"Badge"}</strong></div>:null;})}</div>:<p className="profile-badge-empty">Aucun badge pour le moment. Les badges attribués manuellement apparaîtront ici.</p>}</section>
      <form className="profile-form" onSubmit={save}><label>Nom affiché<input value={form.display_name} onChange={e=>updateField("display_name",e.target.value)} maxLength={80}/></label><label>Bio<textarea value={form.bio} onChange={e=>updateField("bio",e.target.value)} maxLength={1000} placeholder="Quelques mots sur toi..."/></label>
      <div className="profile-grid"><label>Pronoms<input value={form.pronouns} onChange={e=>updateField("pronouns",e.target.value)} maxLength={40} placeholder="ex. elle/elle"/></label><label>Identité<input value={form.identity} onChange={e=>updateField("identity",e.target.value)} maxLength={80} placeholder="ex. femme"/></label><label>Âge<input type="number" min="18" max="120" value={form.age} onChange={e=>updateField("age",e.target.value)}/></label><label>Région<input value={form.location} onChange={e=>updateField("location",e.target.value)} maxLength={100} placeholder="Ville ou région, sans adresse"/></label><label>Orientation<input value={form.orientation} onChange={e=>updateField("orientation",e.target.value)} maxLength={80} placeholder="Facultatif"/></label><label>Je cherche<input value={form.looking_for} onChange={e=>updateField("looking_for",e.target.value)} maxLength={120} placeholder="ex. amitié, relation..."/></label></div>
      <label>Centres d’intérêt <span className="field-hint">séparés par des virgules</span><input value={form.interests} onChange={e=>updateField("interests",e.target.value)} maxLength={500} placeholder="lecture, jeux, musique..."/></label>
      <label className="toggle-row"><span><strong>Visibilité du profil</strong><small>Public permet aux autres membres de consulter ton profil. Privé le masque, sauf pour toi.</small></span><select value={form.profile_visibility} onChange={e=>updateField("profile_visibility",e.target.value)}><option value="public">Public</option><option value="private">Privé</option></select></label>
      <label className="toggle-row"><span><strong>Afficher mon profil dans les rencontres</strong><small>Tu peux désactiver cette visibilité à tout moment.</small></span><input type="checkbox" checked={form.match_discovery_enabled} onChange={e=>updateField("match_discovery_enabled",e.target.checked)}/></label>
      <div className="dating-preferences">
        <fieldset><legend>Ce que je recherche</legend>{(["friendship","romance","discussion","community"] as const).map(value=><label key={value}><input type="checkbox" checked={form.dating_intentions.includes(value)} onChange={e=>toggleIntent("dating_intentions",value,e.target.checked)}/>{value==="friendship"?"Amitié":value==="romance"?"Romance":value==="discussion"?"Discussion":"Découverte communautaire"}</label>)}</fieldset>
        <fieldset><legend>Ce que je suis ouverte à découvrir</legend>{(["friendship","romance","discussion","community"] as const).map(value=><label key={value}><input type="checkbox" checked={form.dating_open_to.includes(value)} onChange={e=>toggleIntent("dating_open_to",value,e.target.checked)}/>{value==="friendship"?"Amitié":value==="romance"?"Romance":value==="discussion"?"Discussion":"Découverte communautaire"}</label>)}</fieldset>
        <p>La romance ne sera proposée que si les deux personnes la recherchent et s’y ouvrent mutuellement.</p>
      </div>
      <div className="profile-actions"><button className="button primary" type="submit" disabled={saving}>{saving?"Enregistrement...":"Enregistrer le profil"}</button><button className="button" type="button" onClick={logout}>Se déconnecter</button></div>{message&&<p className="profile-message">{message}</p>}</form></section></main>;
}
