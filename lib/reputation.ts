export function getReputationTitle(reputation: number): string {
  if (reputation >= 500) return "Figure de PRYSM";
  if (reputation >= 250) return "Référence";
  if (reputation >= 100) return "Pilier";
  if (reputation >= 50) return "Membre reconnu";
  if (reputation >= 25) return "Membre actif";
  if (reputation >= 10) return "Apprécié";
  return "Nouveau";
}
