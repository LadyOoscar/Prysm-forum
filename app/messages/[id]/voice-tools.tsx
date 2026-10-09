"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "../../../lib/supabase-browser";

type Message = { id: string; body: string; sender_id: string; created_at: string };

export function VoiceAudioPlayer({ src, label = "Message vocal" }: { src: string; label?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frequencyReady, setFrequencyReady] = useState(false);

  function formatTime(value: number) {
    if (!Number.isFinite(value)) return "0:00";
    return Math.floor(value / 60) + ":" + String(Math.floor(value % 60)).padStart(2, "0");
  }

  function stopVisualizer() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  function drawVisualizer() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const width = canvas.width;
    const height = canvas.height;
    const bars = 40;
    const gap = 3;
    const barWidth = (width - gap * (bars - 1)) / bars;

    const draw = () => {
      analyser.getByteFrequencyData(bins);
      context.clearRect(0, 0, width, height);
      for (let i = 0; i < bars; i++) {
        const binIndex = Math.floor(Math.pow(i / bars, 1.65) * bins.length * 0.72);
        const energy = bins[binIndex] / 255;
        const barHeight = Math.max(3, energy * (height - 2));
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        const gradient = context.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "#ff4fc3");
        gradient.addColorStop(0.52, "#8b62ff");
        gradient.addColorStop(1, "#45efff");
        context.fillStyle = gradient;
        context.globalAlpha = 0.48 + energy * 0.52;
        context.fillRect(x, y, barWidth, barHeight);
      }
      context.globalAlpha = 1;
      if (!audioRef.current?.paused) frameRef.current = requestAnimationFrame(draw);
      else frameRef.current = null;
    };
    stopVisualizer();
    frameRef.current = requestAnimationFrame(draw);
  }

  async function setupVisualizer(audio: HTMLAudioElement) {
    if (typeof window === "undefined" || !("AudioContext" in window)) return;
    try {
      if (!audioContextRef.current) {
        const AudioContextConstructor = window.AudioContext;
        const audioContext = new AudioContextConstructor();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.78;
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }
      if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();
      setFrequencyReady(true);
      drawVisualizer();
    } catch {
      // Playback still works if the browser blocks Web Audio analysis.
      setFrequencyReady(false);
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        await setupVisualizer(audio);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      stopVisualizer();
    }
  }

  useEffect(() => () => {
    stopVisualizer();
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
  }, []);

  const progress = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

  return (
    <div className="prysm-audio-player" aria-label={label}>
      <audio
        ref={audioRef}
        src={src}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) && value > 0 ? value : 0);
        }}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value) && value > 0) setDuration(value);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); stopVisualizer(); }}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
          stopVisualizer();
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
      />
      <button className="audio-play-button" type="button" onClick={() => void togglePlayback()} aria-label={playing ? "Mettre en pause" : "Lire le vocal"}>
        {playing ? "Ⅱ" : "▶"}
      </button>
      <div className="audio-player-main">
        <div className="audio-player-topline">
          <span className="audio-player-label"><span className={playing ? "audio-live-dot is-playing" : "audio-live-dot"} /> VOCAL PRYSM</span>
          <span className="audio-player-time">{formatTime(current)} <span>/</span> {formatTime(duration)}</span>
        </div>
        <input
          className="audio-progress"
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={Math.min(current, duration || 1)}
          style={{ background: `linear-gradient(90deg, #45efff 0%, #8b62ff ${progress}%, rgba(69,239,255,.16) ${progress}%, rgba(69,239,255,.16) 100%)` }}
          aria-label="Position dans le vocal"
          onChange={(event) => {
            const next = Number(event.currentTarget.value);
            if (audioRef.current) audioRef.current.currentTime = next;
            setCurrent(next);
          }}
        />
        <canvas
          ref={canvasRef}
          className={frequencyReady && playing ? "audio-waveform is-active" : "audio-waveform"}
          width={360}
          height={34}
          aria-label="Visualisation des fréquences audio"
          role="img"
        />
      </div>
    </div>
  );
}

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
  return <VoiceAudioPlayer src={url} />;
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
          <VoiceAudioPlayer src={preview} label="Écouter le vocal avant envoi" />
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
