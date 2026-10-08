"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Profile = {
  username: string; display_name: string; bio: string; pronouns: string | null; identity: string | null;
  interests: string[]; age: number | null; location: string | null; orientation: string | null;
  looking_for: string | null; dating_enabled: boolean; profile_visibility: "public" | "private";
};

export default function ProfilPage() {
  const supabase = createSupabaseBrowser();
  const [email, setEmail] = useState(""); const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({display_name:"",bio:"",pronouns:"",identity:"",interests:"",age:"",location:"",orientation:"",looking_for:"",dating_enabled:true,profile_visibility:"public" as "public"|"private"});
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");

  useEffect(()=>{async function load(){const {data}=await supabase.auth.getUser();if(!data.user){window.location.href="/auth";return;}setEmail(data.user.email||"");
    const {data:p}=await supabase.from("profiles").select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,profile_visibility").eq("id",data.user.id).maybeSingle();
    if(p){const next=p as Profile;setProfile(next);setForm({display_name:next.display_name||"",bio:next.bio||"",pronouns:next.pronouns||"",identity:next.identity||"",interests:(next.interests||[]).join(", "),age:next.age?.toString()||"",location:next.location||"",orientation:next.orientation||"",looking_for:next.looking_for||"",dating_enabled:next.dating_enabled,profile_visibility:next.profile_visibility||"public"});}setLoading(false);}void load()},[]);

  function updateField(field:string,value:string|boolean){setForm(current=>({...current,[field]:value}));}
  async function save(event:React.FormEvent){event.preventDefault();setSaving(true);setMessage("");const {data}=await supabase.auth.getUser();if(!data.user){window.location.href="/auth";return;}
    const age=form.age.trim()?Number(form.age):null;if(age!==null&&(!Number.isInteger(age)||age<18||age>120)){setMessage("L’âge doit être compris entre 18 et 120 ans.");setSaving(false);return;}
    const interests=form.interests.split(",").map(item=>item.trim()).filter(Boolean).slice(0,20);
    const {data:updated,error}=await supabase.from("profiles").update({display_name:form.display_name.trim(),bio:form.bio.trim(),pronouns:form.pronouns.trim()||null,identity:form.identity.trim()||null,interests,age,location:form.location.trim()||null,orientation:form.orientation.trim()||null,looking_for:form.looking_for.trim()||null,dating_enabled:form.dating_enabled,profile_visibility:form.profile_visibility,updated_at:new Date().toISOString()}).eq("id",data.user.id).select("username,display_name,bio,pronouns,identity,interests,age,location,orientation,looking_for,dating_enabled,profile_visibility").single();
    if(error)setMessage("Impossible d’enregistrer le profil pour le moment.");else{setProfile(updated as Profile);setMessage("Profil enregistré.");}setSaving(false);
  }
  async function logout(){await supabase.auth.signOut();window.location.href="/";}
  if(loading)return <main className="shell"><section className="page-head"><p className="eyebrow">Ton espace</p><h1>Profil.</h1><p className="lead">Chargement…</p></section></main>;
  return <main className="shell"><header className="topbar"><Link className="brand" href="/">PRYSM</Link><nav><Link href="/">Accueil</Link><Link href="/forum">Forum</Link><Link href="/recherche">Recherche</Link><Link className="active" href="/profil">Profil</Link></nav></header>
    <section className="page-head compact"><p className="eyebrow">Ton espace</p><h1>Profil.</h1><p className="lead">Présente-toi comme tu veux. Les informations de rencontre restent facultatives.</p></section>
    <section className="profile-box profile-editor"><div className="profile-summary"><div className="avatar">{(form.display_name||profile?.username||"P").slice(0,1).toUpperCase()}</div><div><h2>{form.display_name||profile?.username||"Membre PRYSM"}</h2><p>{email} · @{profile?.username}</p></div></div>
      <form className="profile-form" onSubmit={save}><label>Nom affiché<input value={form.display_name} onChange={e=>updateField("display_name",e.target.value)} maxLength={80}/></label><label>Bio<textarea value={form.bio} onChange={e=>updateField("bio",e.target.value)} maxLength={1000} placeholder="Quelques mots sur toi..."/></label>
      <div className="profile-grid"><label>Pronoms<input value={form.pronouns} onChange={e=>updateField("pronouns",e.target.value)} maxLength={40} placeholder="ex. elle/elle"/></label><label>Identité<input value={form.identity} onChange={e=>updateField("identity",e.target.value)} maxLength={80} placeholder="ex. femme"/></label><label>Âge<input type="number" min="18" max="120" value={form.age} onChange={e=>updateField("age",e.target.value)}/></label><label>Région<input value={form.location} onChange={e=>updateField("location",e.target.value)} maxLength={100} placeholder="Ville ou région, sans adresse"/></label><label>Orientation<input value={form.orientation} onChange={e=>updateField("orientation",e.target.value)} maxLength={80} placeholder="Facultatif"/></label><label>Je cherche<input value={form.looking_for} onChange={e=>updateField("looking_for",e.target.value)} maxLength={120} placeholder="ex. amitié, relation..."/></label></div>
      <label>Centres d’intérêt <span className="field-hint">séparés par des virgules</span><input value={form.interests} onChange={e=>updateField("interests",e.target.value)} maxLength={500} placeholder="lecture, jeux, musique..."/></label>
      <label className="toggle-row"><span><strong>Visibilité du profil</strong><small>Public permet aux autres membres de consulter ton profil. Privé le masque, sauf pour toi.</small></span><select value={form.profile_visibility} onChange={e=>updateField("profile_visibility",e.target.value)}><option value="public">Public</option><option value="private">Privé</option></select></label>
      <label className="toggle-row"><span><strong>Afficher mon profil dans les rencontres</strong><small>Tu peux désactiver cette visibilité à tout moment.</small></span><input type="checkbox" checked={form.dating_enabled} onChange={e=>updateField("dating_enabled",e.target.checked)}/></label>
      <div className="profile-actions"><button className="button primary" type="submit" disabled={saving}>{saving?"Enregistrement...":"Enregistrer le profil"}</button><button className="button" type="button" onClick={logout}>Se déconnecter</button></div>{message&&<p className="profile-message">{message}</p>}</form></section></main>;
}
