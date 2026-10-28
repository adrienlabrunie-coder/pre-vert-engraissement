import { estConcentre } from "./feeds";
import { feedById } from "./ration";
import type { Feed, LigneRation, Lot } from "./types";

export interface LigneStock {
  feedId: string;
  nom: string;
  famille: Feed["famille"];
  kgMSJourAnimal: number;
  kgBrutJourAnimal: number;
  tonnesMS: number;
  tonnesBrut: number;
  cout: number;
}

export interface Bilan {
  lignes: LigneStock[];
  duree: number;
  gainTotal: number;
  coutTotal: number;
  coutAliments: number;
  coutEau: number;
  volumeEauM3: number;
  coutParAnimal: number;
  coutParJourAnimal: number;
  coutParKgGain: number;
  repartition: { fourrages: number; concentres: number; mineraux: number };
}

export interface Eau {
  /** Litres bus par animal et par jour (abreuvoir + préparation) */
  litresJour: number;
  /** Prix de l'eau en € / m³ (0 si forage non valorisé) */
  prixM3: number;
}

export function calculerBilan(
  lot: Lot,
  lignes: LigneRation[],
  feeds: Feed[],
  duree: number,
  margeSecurite = 5,
  eau: Eau = { litresJour: 60, prixM3: 0 },
): Bilan {
  const marge = 1 + margeSecurite / 100;
  const res: LigneStock[] = [];
  let coutTotal = 0;
  const repartition = { fourrages: 0, concentres: 0, mineraux: 0 };

  for (const l of lignes) {
    const f = feedById(feeds, l.feedId);
    if (!f || l.kgMS <= 0) continue;
    const kgBrut = l.kgMS / (f.ms / 100);
    const tonnesBrut = (kgBrut * lot.effectif * duree * marge) / 1000;
    const tonnesMS = (l.kgMS * lot.effectif * duree * marge) / 1000;
    const cout = tonnesBrut * f.prix;
    coutTotal += cout;
    if (f.famille === "mineral") repartition.mineraux += cout;
    else if (estConcentre(f)) repartition.concentres += cout;
    else repartition.fourrages += cout;

    res.push({
      feedId: f.id,
      nom: f.nom,
      famille: f.famille,
      kgMSJourAnimal: l.kgMS,
      kgBrutJourAnimal: kgBrut,
      tonnesMS,
      tonnesBrut,
      cout,
    });
  }

  const gainTotal = Math.max(0, lot.poidsVente - lot.poidsDepart) * lot.effectif;
  // Eau : volume total sur la période (marge incluse), coût ajouté au bilan
  const volumeEauM3 = (eau.litresJour * lot.effectif * duree * marge) / 1000;
  const coutEau = volumeEauM3 * eau.prixM3;
  const coutAliments = coutTotal;
  coutTotal += coutEau;
  const coutParAnimal = lot.effectif > 0 ? coutTotal / lot.effectif : 0;

  return {
    lignes: res.sort((a, b) => b.cout - a.cout),
    duree,
    gainTotal,
    coutTotal,
    coutAliments,
    coutEau,
    volumeEauM3,
    coutParAnimal,
    coutParJourAnimal: duree > 0 ? coutParAnimal / duree : 0,
    coutParKgGain: gainTotal > 0 ? coutTotal / gainTotal : 0,
    repartition,
  };
}

export const euro = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const euro2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

export const nb = (n: number, d = 1) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

