"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";
import { VoiceMessage } from "../../messages/[id]/voice-tools";

export function ForumVoice({ path }: { path: string }) {
  return <VoiceMessage path={path} />;
}

export default function ForumVoiceRecorder({ topicId, disabled, onSent }: {
  topicId: string;
  disabled: boolean;
  onSent: () => void;
}) {
  const supabase = createSupabaseBrowser();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function stopStream() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setBlob(null);
    setSeconds(0);
  }
  useEffect(() => () => {
    stopStream();
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Ton navigateur ne permet pas l’enregistrement vocal.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const type = types.find(t => MediaRecorder.isTypeSupported(t));
      const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stopStream();
        setRecording(false);
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!audio.size) { setError("Le vocal est vide. Réessaie."); return; }
        setBlob(audio);
        setPreview(URL.createObjectURL(audio));
      };
      recorder.start(250);
      setRecording(true);
      setSeconds(0);
      const started = Date.now();
      const ticker = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 90) {
          window.clearInterval(ticker);
          if (recorder.state !== "inactive") recorder.stop();
        }
      }, 500);
    } catch {
      setError("Micro inaccessible. Autorise le micro dans les réglages du navigateur.");
      stopStream();
    }
  }

  async function send() {
    if (!blob || disabled || busy) return;
    setBusy(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/auth"; return; }
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const path = topicId + "/" + user.id + "/" + crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await supabase.storage.from("prysm-voice-messages").upload(path, blob, { contentType: blob.type || "audio/webm" });
    if (uploadError) {
      setError("Impossible d’envoyer le vocal. Réessaie.");
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase.from("forum_posts").insert({
      topic_id: topicId,
      author_id: user.id,
      body: "voice:" + path,
      parent_post_id: null,
    });
    if (insertError) {
      await supabase.storage.from("prysm-voice-messages").remove([path]);
      setError("Le vocal n’a pas pu être publié.");
      setBusy(false);
      return;
    }
    clearPreview();
    setBusy(false);
    onSent();
  }

  return <div className="voice-recorder" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
    {recording ? <>
      <span className="field-hint" aria-live="polite">● Enregistrement {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} / 1:30</span>
      <button type="button" className="button" onClick={() => recorderRef.current?.state !== "inactive" && recorderRef.current?.stop()}>Arrêter</button>
    </> : preview ? <>
      <audio controls src={preview} aria-label="Écouter le vocal avant envoi" style={{ width: "min(100%, 280px)" }} />
      <button type="button" className="button primary" disabled={busy || disabled} onClick={() => void send()}>{busy ? "Envoi…" : "Publier le vocal"}</button>
      <button type="button" className="button" disabled={busy} onClick={clearPreview}>Annuler</button>
    </> : <button type="button" className="button" disabled={disabled} onClick={() => void start()}>🎙️ Enregistrer un vocal</button>}
    {!recording && !preview && <span className="field-hint">90 secondes maximum</span>}
    {error && <span className="notice error">{error}</span>}
  </div>;
}
