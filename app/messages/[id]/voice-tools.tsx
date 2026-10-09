"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

type Message = { id: string; body: string; sender_id: string; created_at: string };

export function VoiceMessage({ path }: { path: string }) {
  const supabase = createSupabaseBrowser();
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.storage.from("prysm-voice-messages").createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.signedUrl) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => { active = false; };
  }, [path]);

  if (failed) return <span className="field-hint">Vocal indisponible.</span>;
  if (!url) return <span className="field-hint">Chargement du vocal…</span>;
  return <audio controls preload="metadata" src={url} aria-label="Message vocal" style={{ display: "block", width: "min(100%, 340px)", marginTop: 6 }} />;
}

export function VoiceRecorder({
  conversationId,
  userId,
  disabled,
  onSent,
  onError,
}: {
  conversationId: string;
  userId: string;
  disabled: boolean;
  onSent: (message: Message) => void;
  onError: (message: string) => void;
}) {
  const supabase = createSupabaseBrowser();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const previewUrlRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimers() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }

  function discardPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreview("");
    setAudioBlob(null);
    setSeconds(0);
  }

  useEffect(() => () => {
    clearTimers();
    stopTracks();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  async function startRecording() {
    onError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Cet appareil ou navigateur ne permet pas l’enregistrement vocal. Essaie un navigateur récent.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearTimers();
        stopTracks();
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) {
          onError("L’enregistrement est vide. Réessaie.");
          return;
        }
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreview(url);
        setAudioBlob(blob);
      };
      recorder.start(250);
      setRecording(true);
      setSeconds(0);
      intervalRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      timeoutRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 90_000);
    } catch {
      onError("Accès au micro refusé ou indisponible. Autorise le micro dans les réglages du navigateur.");
      stopTracks();
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  async function sendVoice() {
    if (!audioBlob || !conversationId || !userId || disabled || sending) return;
    setSending(true);
    onError("");
    const extension = audioBlob.type.includes("mp4") ? "m4a" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
    const path = conversationId + "/" + userId + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await supabase.storage.from("prysm-voice-messages").upload(path, audioBlob, {
      contentType: audioBlob.type || "audio/webm",
      upsert: false,
    });
    if (uploadError) {
      onError("Impossible d’envoyer le vocal. Vérifie ta connexion puis réessaie.");
      setSending(false);
      return;
    }
    const { data, error } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body: "voice:" + path })
      .select("id, body, sender_id, created_at")
      .single();
    if (error || !data) {
      await supabase.storage.from("prysm-voice-messages").remove([path]);
      onError("Le vocal a été enregistré mais n’a pas pu être envoyé.");
      setSending(false);
      return;
    }
    onSent(data as Message);
    discardPreview();
    setSending(false);
  }

  return (
    <div className="voice-recorder" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {recording ? (
        <>
          <span aria-live="polite" className="field-hint">● Enregistrement {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} / 1:30</span>
          <button className="button" type="button" onClick={stopRecording}>Arrêter</button>
        </>
      ) : preview ? (
        <>
          <audio controls src={preview} aria-label="Écouter le vocal avant envoi" style={{ width: "min(100%, 280px)" }} />
          <button className="button primary" type="button" onClick={() => void sendVoice()} disabled={disabled || sending}>{sending ? "Envoi…" : "Envoyer le vocal"}</button>
          <button className="button" type="button" onClick={discardPreview} disabled={sending}>Annuler</button>
        </>
      ) : (
        <button className="button" type="button" onClick={() => void startRecording()} disabled={disabled || sending}>
          <span aria-hidden="true">🎙️ </span>Enregistrer un vocal
        </button>
      )}
      {!recording && !preview && <span className="field-hint">90 secondes maximum</span>}
    </div>
  );
}
