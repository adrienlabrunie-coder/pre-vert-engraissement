/**
 * Interactions digestives entre aliments (INRA 2018, Sauvant & Nozière 2013 ;
 * Nozière et al., INRAE Prod. Anim. 2026, 39(2), 9526 — section 2.3).
 *
 * Les apports permis par une ration ne sont pas la somme pondérée des valeurs
 * de table des aliments : trois caractéristiques de la ration corrigent ces
 * valeurs.
 *
 * 1. Le niveau d'ingestion (NI, en % du poids vif) accélère le transit :
 *    la matière organique est moins digérée (moins d'énergie), mais les
 *    protéines échappent davantage au rumen (PDIA en hausse).
 * 2. La proportion de concentré (PCO) fait baisser le pH du rumen, donc
 *    l'activité cellulolytique : les fourrages sont moins bien valorisés.
 * 3. La balance protéique du rumen (BPR) : une carence en azote dégradable
 *    diminue la digestibilité de la matière organique et la synthèse
 *    microbienne (donc les PDI d'origine microbienne).
 *
 * Les coefficients ci-dessous sont une transcription simplifiée mais bornée
 * de ces effets, calée pour rester cohérente avec les essais publiés utilisés
 * comme référence (Malterre 1989, IDELE 2014).
 */
export interface Interactions {
  /** Niveau d'ingestion, % du poids vif (null si le poids n'est pas connu) */
  ni: number | null;
  /** Proportion de concentré, % de la MS */
  pco: number;
  /** Balance protéique du rumen, g/kg MS */
  bprKg: number;
  /** Pertes d'énergie par interaction digestive, en % */
  perteUfv: number;
  /** Pertes de PDI par interaction digestive, en % */
  pertePdi: number;
  facteurUfv: number;
  facteurPdi: number;
  /** Explication en langage d'éleveur, vide si les interactions sont négligeables */
  explication: string;
}

const NI_REFERENCE = 1.75; // % du poids vif, niveau d'ingestion pivot des tables

export function calculerInteractions(
  msTotale: number,
  pv: number | undefined,
  pcoPct: number,
  bprKg: number,
): Interactions {
  const ni = pv && pv > 0 && msTotale > 0 ? (msTotale / pv) * 100 : null;

  // 1. Transit : au-delà du niveau d'ingestion des tables, la digestion baisse
  const perteNi = ni == null ? 0 : borner(1.2 * Math.max(0, ni - NI_REFERENCE), 0, 4);
  // 2. Concentré : activité cellulolytique réduite au-delà de 20 % de la MS
  const pertePco = borner(0.09 * Math.max(0, pcoPct - 20), 0, 5);
  // 3. Carence en azote dégradable dans le rumen
  const carence = Math.max(0, -bprKg);
  const perteBpr = borner(0.2 * carence, 0, 8);

  const perteUfv = borner(perteNi + pertePco + perteBpr, 0, 14);
  // Les PDI sont moins touchées : le transit rapide protège les protéines
  // alimentaires, seule la part microbienne souffre de la carence azotée.
  const pertePdi = borner(0.1 * carence + 0.02 * Math.max(0, pcoPct - 20), 0, 6);

  const causes: string[] = [];
  if (perteBpr > 0.5) causes.push("les microbes du rumen manquent d'azote");
  if (pertePco > 0.8) causes.push("la part de concentré freine la digestion des fourrages");
  if (perteNi > 0.8) causes.push("la ration transite vite parce qu'elle est très ingérée");

  return {
    ni,
    pco: pcoPct,
    bprKg,
    perteUfv,
    pertePdi,
    facteurUfv: 1 - perteUfv / 100,
    facteurPdi: 1 - pertePdi / 100,
    explication:
      perteUfv < 1
        ? ""
        : `La ration vaut environ ${perteUfv.toFixed(0)} % de moins que la somme de ses aliments : ${causes.join(", ")}.`,
  };
}

function borner(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Conversion UFV -> UFL. En dessous de 1 000 g de croissance par jour, les
 * tables INRA expriment l'énergie en UFL : les fourrages y sont relativement
 * mieux valorisés que dans l'échelle UFV, d'autant plus qu'ils sont grossiers.
 */
export function uflDepuisUfv(ufv: number): number {
  return ufv * Math.max(1, 1 + 0.38 * (1 - ufv));
}

