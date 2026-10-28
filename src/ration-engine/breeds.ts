import type { Breed } from "./types";

export const BREEDS: Breed[] = [
  { id: "charolaise", nom: "Charolaise", poidsAdulte: 800, format: "grand", precocite: 1.0 },
  { id: "limousine", nom: "Limousine", poidsAdulte: 720, format: "grand", precocite: 1.05 },
  { id: "blonde", nom: "Blonde d'Aquitaine", poidsAdulte: 820, format: "grand", precocite: 0.95 },
  { id: "salers", nom: "Salers", poidsAdulte: 720, format: "grand", precocite: 1.0 },
  { id: "aubrac", nom: "Aubrac", poidsAdulte: 650, format: "moyen", precocite: 1.1 },
  { id: "gasconne", nom: "Gasconne", poidsAdulte: 650, format: "moyen", precocite: 1.05 },
  { id: "parthenaise", nom: "Parthenaise", poidsAdulte: 700, format: "moyen", precocite: 1.1 },
  { id: "rouge_des_pres", nom: "Rouge des Prés", poidsAdulte: 780, format: "grand", precocite: 1.1 },
  { id: "normande", nom: "Normande", poidsAdulte: 700, format: "moyen", precocite: 1.1 },
  { id: "angus", nom: "Angus", poidsAdulte: 600, format: "petit", precocite: 1.2 },
  { id: "highland", nom: "Highland", poidsAdulte: 500, format: "petit", precocite: 1.15 },
  { id: "croisee", nom: "Croisée / autre", poidsAdulte: 700, format: "moyen", precocite: 1.05 },
];

export function getBreed(id: string): Breed {
  return BREEDS.find((b) => b.id === id) ?? BREEDS[0]!;
}

