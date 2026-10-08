"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

const reasons = [
  ["spam", "Spam"],
  ["harassment", "Harcèlement"],
  ["hate", "Haine ou discrimination"],
  ["sexual", "Contenu sexuel"],
  ["illegal", "Contenu illégal"],
  ["other", "Autre"],
] as const;

export default function ReportButton({ postId }: { postId: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    const { error } = await supabase.from("forum_reports").insert({
      post_id: postId,
      reporter_id: user.id,
      reason,
      details: details.trim(),
    });
    if (error) {
      setMessage(error.code === "23505" ? "Vous avez déjà signalé ce message." : "Impossible d’envoyer le signalement.");
      setBusy(false);
      return;
    }
    setMessage("Signalement envoyé. Merci.");
    setDetails("");
    setTimeout(() => setOpen(false), 900);
    setBusy(false);
  }

  return <div className="report-wrap">
    <button className="report-button" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>⚑ Signaler</button>
    {open && <div className="report-panel">
      <strong>Signaler ce message</strong>
      <select value={reason} onChange={(e) => setReason(e.target.value)}>
        {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} placeholder="Précisions facultatives..." />
      <div className="report-actions">
        <button className="button" type="button" onClick={() => setOpen(false)}>Annuler</button>
        <button className="button primary" type="button" onClick={submit} disabled={busy}>{busy ? "Envoi..." : "Envoyer"}</button>
      </div>
      {message && <p className="report-message">{message}</p>}
    </div>}
  </div>;
}
