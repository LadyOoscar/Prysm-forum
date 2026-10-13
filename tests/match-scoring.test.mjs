import test from "node:test";
import assert from "node:assert/strict";
import { calculateCompatibility } from "../lib/match-scoring.ts";

const basePreferences = {
  myInterests: ["Fantasy", "Musique"],
  myIntentions: ["friendship", "discussion"],
  myOpenTo: ["friendship", "discussion"],
  myLocation: "Strasbourg",
};

test("scores each shared interest once, case-insensitively", () => {
  assert.equal(calculateCompatibility({ interests: ["fantasy", "FANTASY", "musique"] }, basePreferences), 10);
});

test("caps interest contribution at 50 points", () => {
  const interests = Array.from({ length: 20 }, (_, i) => `interest-${i}`);
  assert.equal(calculateCompatibility({ interests }, { ...basePreferences, myInterests: interests }), 50);
});

test("adds 35 points for mutually compatible friendship", () => {
  assert.equal(calculateCompatibility({ dating_open_to: ["friendship"] }, basePreferences), 35);
});

test("romance requires both profiles to signal romantic intention and openness", () => {
  const preferences = { ...basePreferences, myIntentions: ["romance"], myOpenTo: ["romance"] };
  assert.equal(calculateCompatibility({ dating_open_to: ["romance"], dating_intentions: ["romance"] }, preferences), 35);
  assert.equal(calculateCompatibility({ dating_open_to: ["romance"], dating_intentions: [] }, preferences), 0);
  assert.equal(calculateCompatibility({ dating_open_to: ["romance"], dating_intentions: ["romance"] }, { ...preferences, myOpenTo: [] }), 0);
});

test("does not award mutual points for one-sided intentions", () => {
  assert.equal(calculateCompatibility({ dating_open_to: ["romance"], dating_intentions: ["romance"] }, basePreferences), 0);
});

test("awards 15 points for the same region regardless of letter case", () => {
  assert.equal(calculateCompatibility({ location: "strasbourg" }, basePreferences), 15);
});

test("does not award region points when either location is missing", () => {
  assert.equal(calculateCompatibility({ location: null }, basePreferences), 0);
  assert.equal(calculateCompatibility({ location: "Strasbourg" }, { ...basePreferences, myLocation: null }), 0);
});

test("normalizes whitespace and ignores empty interests", () => {
  assert.equal(calculateCompatibility({ interests: [" fantasy ", ""] }, { ...basePreferences, myInterests: ["Fantasy", "  "] }), 5);
});

test("caps the overall compatibility score at 100", () => {
  const interests = Array.from({ length: 20 }, (_, i) => `interest-${i}`);
  const result = calculateCompatibility(
    { interests, location: "Strasbourg", dating_open_to: ["friendship"], dating_intentions: [] },
    { ...basePreferences, myInterests: interests }
  );
  assert.equal(result, 100);
});

test("returns zero for missing optional profile arrays", () => {
  assert.equal(calculateCompatibility({}, basePreferences), 0);
});
