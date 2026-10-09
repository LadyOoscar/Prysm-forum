"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundKind = "click" | "confirm" | "error" | "broadcast" | "cut" | "secret" | "notification" | "crt" | "military" | "static" | "arcade" | "ambient" | "door" | "impact" | "panel";
const TEST_SOUNDS: SoundKind[] = ["ambient", "door", "impact", "panel", "crt", "military", "static", "secret"];

export default function SoundControl() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(28);
  const [panelOpen, setPanelOpen] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(false);
  const volumeRef = useRef(28);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const uiSoundRef = useRef<HTMLAudioElement | null>(null);

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
    if (!audioRef.current || audioRef.current.state === "closed") audioRef.current = new AudioContextClass();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }, []);

  const stopAmbient = useCallback(() => {
    const track = ambientRef.current;
    if (!track) return;
    ambientRef.current = null;
    track.pause();
    track.currentTime = 0;
  }, []);

  const startAmbient = useCallback(() => {
    if (!enabledRef.current || ambientRef.current) return;
    const track = new Audio("https://opengameart.org/sites/default/files/sector_0.mp3");
    track.loop = true;
    track.preload = "auto";
    track.volume = Math.max(0, Math.min(1, volumeRef.current / 100 * 0.18));
    ambientRef.current = track;
    void track.play().catch(() => {
      if (ambientRef.current === track) ambientRef.current = null;
    });
  }, [stopAmbient]);

  const play = useCallback((kind: SoundKind) => {
    if (!enabledRef.current || volumeRef.current <= 0) return;
    if (kind === "click" || kind === "panel") {
      if (!uiSoundRef.current) {
        uiSoundRef.current = new Audio("https://opengameart.org/sites/default/files/hover_0.mp3");
        uiSoundRef.current.preload = "auto";
      }
      const sound = uiSoundRef.current.cloneNode(true) as HTMLAudioElement;
      sound.volume = Math.max(0, Math.min(1, volumeRef.current / 100 * (kind === "panel" ? 0.22 : 0.14)));
      void sound.play().catch(() => {});
      return;
    }
    const ctx = getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const baseVolume = kind === "ambient" ? 0.009 : kind === "impact" || kind === "door" ? 0.035 : kind === "secret" || kind === "static" ? 0.028 : 0.04;
    master.gain.setValueAtTime(Math.max(0.0001, volumeRef.current / 100 * baseVolume), now);
    master.connect(ctx.destination);

    const tone = (frequency: number, start: number, duration: number, type: OscillatorType = "sine", peak = 0.18, detune = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency * (0.94 + Math.random() * 0.12), now + start);
      if (detune) osc.detune.setValueAtTime(detune, now + start);
      filter.type = kind === "military" || kind === "broadcast" ? "bandpass" : "lowpass";
      filter.frequency.setValueAtTime(kind === "military" || kind === "broadcast" ? 1450 : 7200, now + start);
      filter.Q.value = kind === "secret" ? 3.5 : 0.8;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(peak, now + start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.03);
    };

    const noise = (start: number, duration: number, peak = 0.12, highpass = 900, lowpass = 9000) => {
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = (highpass + lowpass) / 2;
      filter.Q.value = kind === "military" ? 1.2 : 0.5;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(peak, now + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(now + start);
    };

    switch (kind) {
      case "confirm":
        tone(660, 0, 0.09, "sine", 0.15); tone(990, 0.075, 0.14, "sine", 0.13); break;
      case "error":
        tone(190, 0, 0.16, "sawtooth", 0.13); tone(145, 0.045, 0.19, "square", 0.08); break;
      case "notification":
        tone(880, 0, 0.11, "sine", 0.14); tone(1175, 0.105, 0.16, "sine", 0.12); break;
      case "broadcast":
        noise(0, 0.13, 0.12, 700, 2400); tone(540, 0.035, 0.13, "sine", 0.12); tone(810, 0.11, 0.17, "triangle", 0.1); break;
      case "cut":
        noise(0, 0.19, 0.15, 450, 1900); tone(330, 0.035, 0.16, "sawtooth", 0.08); break;
      case "crt":
        tone(110, 0, 0.11, "square", 0.12); noise(0.025, 0.12, 0.09, 900, 5200); tone(1550, 0.09, 0.19, "sine", 0.11); tone(720, 0.22, 0.08, "triangle", 0.08); break;
      case "military":
        noise(0, 0.16, 0.1, 500, 2100); tone(960, 0.045, 0.075, "square", 0.1); tone(960, 0.15, 0.075, "square", 0.1); tone(410, 0.25, 0.11, "sine", 0.08); break;
      case "static":
        noise(0, 0.25, 0.22, 180, 6800); noise(0.08, 0.09, 0.12, 1200, 8000); tone(240, 0.12, 0.16, "sawtooth", 0.06); break;
      case "secret":
        noise(0, 0.34, 0.2, 160, 3400); tone(310, 0, 0.32, "sawtooth", 0.13, -22); tone(317, 0.025, 0.3, "square", 0.09, 19); tone(94, 0.08, 0.35, "triangle", 0.16); tone(740, 0.17, 0.12, "square", 0.07); break;
      case "arcade":
        tone(420, 0, 0.06, "square", 0.09); tone(620, 0.055, 0.07, "square", 0.1); tone(940, 0.12, 0.11, "triangle", 0.12); tone(1280, 0.19, 0.13, "square", 0.08); break;
      case "door":
        noise(0, 1.7, 0.055, 90, 650);
        tone(72, 0.08, 2.5, "sawtooth", 0.075);
        tone(58, 1.35, 1.8, "sine", 0.11);
        tone(180, 2.15, 0.75, "triangle", 0.045);
        break;
      case "impact":
        noise(0, 2.8, 0.07, 35, 260);
        tone(48, 0, 2.4, "sine", 0.14);
        tone(71, 0.07, 1.9, "triangle", 0.07, -9);
        tone(120, 0.3, 1.4, "sine", 0.025);
        break;
      case "ambient":
        tone(41, 0, 9.5, "sine", 0.11);
        tone(61.7, 0.25, 8.8, "triangle", 0.045, -5);
        tone(82.4, 0.8, 7.5, "sine", 0.025);
        noise(0.3, 5.8, 0.012, 80, 360);
        break;
    }
    window.setTimeout(() => { try { master.disconnect(); } catch {} }, kind === "ambient" ? 11000 : kind === "door" || kind === "impact" ? 5200 : 900);
  }, [getAudio]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    enabledRef.current = next;
    try { window.localStorage.setItem("prysm-sound-enabled", String(next)); } catch {}
    if (next) {
      const ctx = getAudio();
      if (ctx) { void ctx.resume(); play("crt"); window.setTimeout(() => startAmbient(), 180); }
    } else {
      stopAmbient();
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    volumeRef.current = value;
    if (ambientRef.current) ambientRef.current.volume = Math.max(0, Math.min(1, value / 100 * 0.18));
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
    return () => { window.removeEventListener("prysm:sound", onSound); document.removeEventListener("click", onClick, true); };
  }, [play]);

  useEffect(() => {
    if (enabled) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
  }, [enabled, startAmbient, stopAmbient]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        const roll = Math.random();
        if (roll < 0.28) play("panel");
        else if (roll < 0.55) play("door");
        else if (roll < 0.78) play("impact");
        else if (roll < 0.9) play("military");
        else play("static");
      }
    }, 21000 + Math.floor(Math.random() * 17000));
    return () => window.clearInterval(timer);
  }, [enabled, play]);

  useEffect(() => () => { stopAmbient(); if (audioRef.current) void audioRef.current.close(); }, [stopAmbient]);

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
          <button className="prysm-sound-test" type="button" disabled={!enabled} onClick={() => play(TEST_SOUNDS[Math.floor(Math.random() * TEST_SOUNDS.length)])}>▶ Tester un son aléatoire</button>
          <p>AMBIANCE : bande-son sombre en boucle, bips de console, sas pressurisés et impacts sourds lointains. Sons désactivés par défaut. La bande-son et les effets sont réglables.</p>
        </div>
      )}
      <button className={`prysm-sound-launcher${enabled ? " is-on" : ""}`} type="button" aria-expanded={panelOpen} aria-label="Ouvrir les réglages sonores" onClick={() => setPanelOpen((open) => !open)}>
        <span aria-hidden="true">{enabled ? "♫" : "♪"}</span><span className="prysm-sound-launcher__label">AUDIO {enabled ? "ON" : "OFF"}</span>
      </button>
    </div>
  );
}
