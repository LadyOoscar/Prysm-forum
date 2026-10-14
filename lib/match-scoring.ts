export type MatchProfile = { id?: string; interests?: string[] | null; dating_open_to?: string[] | null; dating_intentions?: string[] | null; location?: string | null; };
export type MatchPreferences = { myInterests: string[]; myIntentions: string[]; myOpenTo: string[]; myLocation: string | null; };
const MUTUAL_INTENTIONS = ["friendship","romance","discussion","community"] as const;
function normalized(values:string[]|null|undefined):Set<string>{return new Set((values??[]).map(value=>value.toLocaleLowerCase().trim()).filter(Boolean))}
function normalizeLocation(value:string|null|undefined):string[]{return (value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").split(/[,:;()\-]+/).map(part=>part.trim()).filter(Boolean)}
/** Conservative indicative score: location contributes only when a non-empty city/region token clearly matches. */
export function calculateCompatibility(profile:MatchProfile,preferences:MatchPreferences):number{
 const mine=normalized(preferences.myInterests),theirs=normalized(profile.interests);let sharedInterests=0;for(const interest of theirs)if(mine.has(interest))sharedInterests++;
 const myIntentions=normalized(preferences.myIntentions),myOpenTo=normalized(preferences.myOpenTo),theirOpenTo=normalized(profile.dating_open_to),theirIntentions=normalized(profile.dating_intentions);
 const mutual=MUTUAL_INTENTIONS.some(value=>myIntentions.has(value)&&theirOpenTo.has(value)&&(value!=="romance"||(myOpenTo.has("romance")&&theirIntentions.has("romance"))));
 const myPlaces=normalizeLocation(preferences.myLocation),theirPlaces=normalizeLocation(profile.location);const samePlace=myPlaces.some(a=>a.length>=3&&theirPlaces.some(b=>b===a));
 return Math.min(100,Math.min(50,sharedInterests*5)+(mutual?35:0)+(samePlace?15:0));
}
