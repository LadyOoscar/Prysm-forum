export type MatchProfile = {
  id?: string;
  interests?: string[] | null;
  dating_open_to?: string[] | null;
  dating_intentions?: string[] | null;
  location?: string | null;
};

export type MatchPreferences = {
  myInterests: string[];
  myIntentions: string[];
  myOpenTo: string[];
  myLocation: string | null;
};

const MUTUAL_INTENTIONS = ["friendship", "romance", "discussion", "community"] as const;

function normalized(values: string[] | null | undefined): Set<string> {
  return new Set((values ?? []).map(value => value.toLocaleLowerCase().trim()).filter(Boolean));
}

/** Keep this scoring function pure so the compatibility rules can be tested without Supabase. */
export function calculateCompatibility(profile: MatchProfile, preferences: MatchPreferences): number {
  const mine = normalized(preferences.myInterests);
  const theirs = normalized(profile.interests);
  let sharedInterests = 0;
  for (const interest of theirs) if (mine.has(interest)) sharedInterests += 1;

  const myIntentions = normalized(preferences.myIntentions);
  const myOpenTo = normalized(preferences.myOpenTo);
  const theirOpenTo = normalized(profile.dating_open_to);
  const theirIntentions = normalized(profile.dating_intentions);
  const mutual = MUTUAL_INTENTIONS.some(value =>
    myIntentions.has(value) &&
    theirOpenTo.has(value) &&
    (value !== "romance" || (myOpenTo.has("romance") && theirIntentions.has("romance")))
  );

  const sameRegion = Boolean(
    preferences.myLocation?.trim() &&
    profile.location?.trim() &&
    preferences.myLocation.trim().toLocaleLowerCase() === profile.location.trim().toLocaleLowerCase()
  );

  return Math.min(100, Math.min(50, sharedInterests * 5) + (mutual ? 35 : 0) + (sameRegion ? 15 : 0));
}
