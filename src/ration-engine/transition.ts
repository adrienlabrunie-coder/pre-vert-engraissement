import { estConcentre } from "./feeds";
import { calculerApports, round2 } from "./ration";
import type { Feed, LigneRation } from "./types";

export interface JourTransition {
  jour: number;
  lignes: LigneRation[];
  partConcentre: number;
}

/**
 * Plan de transition alimentaire.
 * La montée en concentré ne doit pas dépasser environ 4 points de MS par semaine
 * (INRA 2018, chap. 15) : la flore du rumen a besoin de temps pour s'adapter.
 */
export function dureeTransition(partConcentreFinale: number, partDepart = 15): number {
  const ecart = Math.max(0, partConcentreFinale - partDepart);
  // ~4 points de concentré par semaine, minimum 10 jours, maximum 42 jours
  return Math.min(42, Math.max(10, Math.round((ecart / 4) * 7)));
}

export function planTransition(
  rationFinale: LigneRation[],
  feeds: Feed[],
  partDepart = 15,
): { jours: JourTransition[]; duree: number } {
  const finale = calculerApports(rationFinale, feeds);
  const duree = dureeTransition(finale.partConcentre, partDepart);
  const concentreIds = new Set(
    rationFinale
      .filter((l) => {
        const f = feeds.find((x) => x.id === l.feedId);
        return f && estConcentre(f);
      })
      .map((l) => l.feedId),
  );

  const paliers = [1, Math.round(duree / 3), Math.round((2 * duree) / 3), duree];
  const jours: JourTransition[] = [];
  for (const jour of [...new Set(paliers)]) {
    const progression = Math.min(1, jour / duree);
    // le concentré monte progressivement, le fourrage compense en début de période
    const fractionConcentre = 0.35 + 0.65 * progression;
    const fractionFourrage = 1.15 - 0.15 * progression;
    const lignes = rationFinale.map((l) => ({
      feedId: l.feedId,
      kgMS: round2(l.kgMS * (concentreIds.has(l.feedId) ? fractionConcentre : fractionFourrage)),
    }));
    jours.push({
      jour,
      lignes,
      partConcentre: calculerApports(lignes, feeds).partConcentre,
    });
  }
  return { jours, duree };
}

