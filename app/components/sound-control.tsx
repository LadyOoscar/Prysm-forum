"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundKind = "click" | "confirm" | "error" | "broadcast" | "cut" | "secret" | "notification";

export default function SoundControl() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(28);
  const [panelOpen, setPanelOpen] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(false);
  const volumeRef = useRef(28);

  useEffect(() => {
    try {
      const savedEnabled = window.localStorage.getItem("prysm-sound-enabled") === "true";
      const savedVolume = Number(window.localStorage.getItem("prysm-sound-volume"));
      setEnabled(savedEnabled);
      enabledRef.current = savedEnabled;
      if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100) {
        setVolume(savedVolume);
        volumeRef.current = savedVolume;
      }
    } catch {}
  }, []);

  const getAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioRef.current) audioRef.current = new AudioContextClass();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }, []);

  const play = useCallback((kind: SoundKind) => {
    if (!enabledRef.current || volumeRef.current <= 0) return;
    const ctx = getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.max(0.0001, volumeRef.current / 100 * 0.12), now);
    master.connect(ctx.destination);

    const tone = (frequency: number, start: number, duration: number, type: OscillatorType = "sine", peak = 0.18, detune = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency * (0.94 + Math.random() * 0.12), now + start);
      if (detune) osc.detune.setValueAtTime(detune, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(peak, now + start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.03);
    };

    const noise = (start: number, duration: number, peak = 0.12, highpass = 900) => {
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = "highpass";
      filter.frequency.value = highpass;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(peak, now + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(now + start);
    };

    switch (kind) {
      case "click":
        tone(1250, 0, 0.035, "square", 0.07);
        tone(720, 0.018, 0.045, "sine", 0.09);
        break;
      case "confirm":
        tone(660, 0, 0.09, "sine", 0.15);
        tone(990, 0.075, 0.14, "sine", 0.13);
        break;
      case "error":
        tone(190, 0, 0.16, "sawtooth", 0.13);
        tone(145, 0.045, 0.19, "square", 0.08);
        break;
      case "notification":
        tone(880, 0, 0.11, "sine", 0.14);
        tone(1175, 0.105, 0.16, "sine", 0.12);
        break;
      case "broadcast":
        noise(0, 0.13, 0.12, 1100);
        tone(540, 0.035, 0.13, "sine", 0.12);
        tone(810, 0.11, 0.17, "triangle", 0.1);
        break;
      case "cut":
        noise(0, 0.19, 0.15, 650);
        tone(330, 0.035, 0.16, "sawtooth", 0.08);
        break;
      case "secret":
        noise(0, 0.34, 0.2, 300);
        tone(310, 0, 0.32, "sawtooth", 0.13, -22);
        tone(317, 0.025, 0.3, "square", 0.09, 19);
        tone(94, 0.08, 0.35, "triangle", 0.16);
        tone(740, 0.17, 0.12, "square", 0.07);
        break;
    }
    window.setTimeout(() => { try { master.disconnect(); } catch {} }, 900);
  }, [getAudio]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    enabledRef.current = next;
    try { window.localStorage.setItem("prysm-sound-enabled", String(next)); } catch {}
    if (next) {
      const ctx = getAudio();
      if (ctx) play("confirm");
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    volumeRef.current = value;
    try { window.localStorage.setItem("prysm-sound-volume", String(value)); } catch {}
  };

  useEffect(() => {
    const onSound = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: SoundKind }>).detail;
      if (detail?.kind) play(detail.kind);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest("button, a, [role='button'], input[type='submit']");
      if (!control || control.closest("[data-prysm-sound-control]")) return;
      if ((control as HTMLButtonElement).disabled || control.getAttribute("aria-disabled") === "true") return;
      play("click");
    };
    window.addEventListener("prysm:sound", onSound);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("prysm:sound", onSound);
      document.removeEventListener("click", onClick, true);
    };
  }, [play]);

  useEffect(() => () => { if (audioRef.current) void audioRef.current.close(); }, []);

  return (
    <div className="prysm-sound-control" data-prysm-sound-control>
      {panelOpen && (
        <div className="prysm-sound-panel" role="group" aria-label="Réglages sonores">
          <div className="prysm-sound-panel__heading">AUDIO SYSTÈME <span>PRYSM // 01</span></div>
          <label className="prysm-sound-toggle">
            <input type="checkbox" checked={enabled} onChange={toggle} />
            <span className="prysm-sound-switch" aria-hidden="true" />
            <span>{enabled ? "Sons activés" : "Sons désactivés"}</span>
          </label>
          <label className="prysm-sound-volume">
            <span>VOLUME <b>{volume}%</b></span>
            <input aria-label="Volume des effets sonores" type="range" min="0" max="100" step="1" value={volume} onChange={(e) => changeVolume(Number(e.target.value))} />
          </label>
          <button className="prysm-sound-test" type="button" disabled={!enabled} onClick={() => play((["broadcast", "notification", "cut", "error", "confirm", "secret"] as SoundKind[])[Math.floor(Math.random() * 6)])}>▶ Tester un son aléatoire</button>
          <p>Effets synthétiques originaux. Aucun son sans activation.</p>
        </div>
      )}
      <button className={`prysm-sound-launcher${enabled ? " is-on" : ""}`} type="button" aria-expanded={panelOpen} aria-label="Ouvrir les réglages sonores" onClick={() => setPanelOpen((open) => !open)}>
        <span aria-hidden="true">{enabled ? "♫" : "♪"}</span><span className="prysm-sound-launcher__label">AUDIO {enabled ? "ON" : "OFF"}</span>
      </button>
    </div>
  );
}
