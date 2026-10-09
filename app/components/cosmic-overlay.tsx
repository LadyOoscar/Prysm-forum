"use client";

import { useEffect, useState } from "react";
import "./cosmic-eclipse.css";

type EventId =
  | "dust-one"
  | "dust-two"
  | "dust-three"
  | "shooting-one"
  | "shooting-two"
  | "ripple"
  | "comet"
  | "constellation"
  | "birth"
  | "pulse"
  | "eclipse";

type CosmicEvent = {
  id: EventId;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  durationMs: number;
};

const EVENTS: CosmicEvent[] = [
  { id: "dust-one", rarity: "common", durationMs: 8000 },
  { id: "dust-two", rarity: "common", durationMs: 8000 },
  { id: "dust-three", rarity: "common", durationMs: 8000 },
  { id: "shooting-one", rarity: "common", durationMs: 17000 },
  { id: "shooting-two", rarity: "common", durationMs: 23000 },
  { id: "ripple", rarity: "common", durationMs: 25000 },
  { id: "comet", rarity: "uncommon", durationMs: 29000 },
  { id: "constellation", rarity: "uncommon", durationMs: 31000 },
  { id: "birth", rarity: "rare", durationMs: 21000 },
  { id: "pulse", rarity: "rare", durationMs: 33000 },
  { id: "eclipse", rarity: "legendary", durationMs: 37000 },
];

const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3,
} as const;

function chooseEvent(excludeLegendary: boolean): CosmicEvent {
  const eligible = EVENTS.filter(
    (event) => !excludeLegendary || event.rarity !== "legendary",
  );
  const totalWeight = eligible.reduce(
    (sum, event) => sum + RARITY_WEIGHTS[event.rarity] / EVENTS.filter((candidate) => candidate.rarity === event.rarity).length,
    0,
  );
  let roll = Math.random() * totalWeight;

  for (const event of eligible) {
    const rarityCount = EVENTS.filter((candidate) => candidate.rarity === event.rarity).length;
    roll -= RARITY_WEIGHTS[event.rarity] / rarityCount;
    if (roll < 0) return event;
  }

  return eligible[eligible.length - 1];
}

function randomPauseMs(): number {
  // Random quiet interval between events: 6 to 18 seconds.
  return 6000 + Math.random() * 12000;
}

export default function CosmicOverlay() {
  const [activeEvent, setActiveEvent] = useState<EventId | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let legendaryProtectionDraws = 0;

    const scheduleNext = (delay: number) => {
      timer = setTimeout(() => {
        if (stopped) return;

        const protectedDraw = legendaryProtectionDraws > 0;
        if (protectedDraw) legendaryProtectionDraws -= 1;

        const event = chooseEvent(protectedDraw);
        if (event.rarity === "legendary") legendaryProtectionDraws = 3;

        setActiveEvent(event.id);
        timer = setTimeout(() => {
          if (stopped) return;
          setActiveEvent(null);
          scheduleNext(randomPauseMs());
        }, event.durationMs);
      }, delay);
    };

    scheduleNext(randomPauseMs());

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const activeClass = (id: EventId) => (activeEvent === id ? "is-active" : "");

  return (
    <div className="cosmic-overlay" aria-hidden="true">
      <span className={`cosmic-eclipse-dim ${activeClass("eclipse")}`} />
      <span className={`cosmic-comet ${activeClass("comet")}`} />
      <span className={`cosmic-shooting cosmic-shooting-one ${activeClass("shooting-one")}`} />
      <span className={`cosmic-shooting cosmic-shooting-two ${activeClass("shooting-two")}`} />
      <span className={`cosmic-dust cosmic-dust-one ${activeClass("dust-one")}`} />
      <span className={`cosmic-dust cosmic-dust-two ${activeClass("dust-two")}`} />
      <span className={`cosmic-dust cosmic-dust-three ${activeClass("dust-three")}`} />
      <span className={`cosmic-birth ${activeClass("birth")}`} />
      <span className={`cosmic-eclipse ${activeClass("eclipse")}`} />
      <span className={`cosmic-ripple ${activeClass("ripple")}`} />
      <span className={`cosmic-constellation ${activeClass("constellation")}`}><i /><i /><i /><i /><i /></span>
      <span className={`cosmic-pulse ${activeClass("pulse")}`} />
    </div>
  );
}
