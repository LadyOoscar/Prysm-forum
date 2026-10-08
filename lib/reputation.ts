export function getReputationTitle(reputation: number): string {
  if (reputation <= -500) return "Paria de PRYSM";
  if (reputation <= -250) return "Indésirable";
  if (reputation <= -100) return "Mal vu";
  if (reputation <= -50) return "Controversé";
  if (reputation <= -25) return "Impopulaire";
  if (reputation <= -10) return "Contesté";
  if (reputation >= 500) return "Figure de PRYSM";
  if (reputation >= 250) return "Référence";
  if (reputation >= 100) return "Pilier";
  if (reputation >= 50) return "Membre reconnu";
  if (reputation >= 25) return "Membre actif";
  if (reputation >= 10) return "Apprécié";
  return "Nouveau";
}

export function getReputationTone(reputation: number): "negative" | "neutral" | "positive" {
  if (reputation < 0) return "negative";
  if (reputation > 0) return "positive";
  return "neutral";
}
