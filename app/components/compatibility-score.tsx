"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Profile = {
  id: string;
  location: string | null;
  looking_for: string | null;
  interests: string[] | null;
};

export default function CompatibilityScore({ profileId }: { profileId: string }) {
  const supabase = createSupabaseBrowser();
  const [score, setScore] = useState<number | null>(null);
  const [common, setCommon] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === profileId) return;

      const { data: me } = await supabase
        .from("profiles")
        .select("id,location,looking_for,interests")
        .eq("id", user.id)
        .single();

      const { data: them } = await supabase
        .from("profiles")
        .select("id,location,looking_for,interests")
        .eq("id", profileId)
        .single();

      if (!me || !them) return;

      const mine = me as Profile;
      const target = them as Profile;

      const a = new Set(
        (mine.interests ?? [])
          .map((item: string) => item.toLocaleLowerCase().trim())
          .filter(Boolean)
      );
      const b = new Set(
        (target.interests ?? [])
          .map((item: string) => item.toLocaleLowerCase().trim())
          .filter(Boolean)
      );

      const shared = Array.from(a).filter((item) => b.has(item));
      const interestScore = Math.min(60, shared.length * 15);

      const locationScore =
        mine.location &&
        target.location &&
        mine.location.toLocaleLowerCase() === target.location.toLocaleLowerCase()
          ? 15
          : 0;

      const wordsA = (mine.looking_for ?? "")
        .toLocaleLowerCase()
        .split(/[ ,;/]+/)
        .filter(Boolean);
      const wordsB = new Set(
        (target.looking_for ?? "")
          .toLocaleLowerCase()
          .split(/[ ,;/]+/)
          .filter(Boolean)
      );

      const intentScore = wordsA.some((item) => wordsB.has(item)) ? 25 : 0;

      setCommon(shared.slice(0, 4));
      setScore(Math.min(100, interestScore + locationScore + intentScore));
    }

    void load();
  }, [profileId]);

  if (score === null) return null;

  return (
    <div className="compatibility-box">
      <span className="profile-label">Compatibilité indicative</span>
      <strong>{score}%</strong>
      <p>
        {common.length
          ? "Centres d’intérêt communs : " + common.join(", ") + "."
          : "Basée surtout sur les informations de profil communes."}
      </p>
      <small>Ce score n’infère pas l’orientation et reste purement indicatif.</small>
    </div>
  );
}
