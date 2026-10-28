/**
 * Réponses « autres que la croissance » du système INRA 2018
 * (Nozière et al., INRAE Prod. Anim. 2026, 39(2), 9526 — section 4.3) :
 * risque d'acidose agrégé, rejets de méthane et d'azote, besoin en eau.
 */
import { SEUILS } from "./seuils";
import type { Apports, BesoinEau, Rejets, RisqueAcidose } from "./types";

/**
 * Indice global de risque d'acidose : chaque critère relié au pH du rumen
 * (amidon, amidon rapidement dégradable, sucres, part de concentré, fibres de
 * fourrage, brins longs, foin ou paille distribué) est converti en note de 0 à
 * 100 selon sa distance aux seuils, puis les notes sont agrégées (moyenne
 * pondérée par le plus pénalisant). Classes retenues par INRA 2018 :
 * pH moyen < 6,0 = risque fort, 6,0 à 6,2 = risque faible.
 */
export function risqueAcidose(a: Apports): RisqueAcidose {
  if (a.ms <= 0) {
    return {
      indice: 0,
      phEstime: 6.6,
      classe: "negligeable",
      niveau: "vert",
      libelle: "Pas de ration",
      message: "Aucun aliment distribué.",
    };
  }

  const notes = [
    notePlafond(a.amidon, SEUILS.amidonOrange, SEUILS.amidonRouge),
    notePlafond(a.amidonRapide, SEUILS.amidonRapideOrange, SEUILS.amidonRapideRouge),
    notePlafond(a.sucres, SEUILS.sucresOrange, SEUILS.sucresRouge),
    notePlafond(a.partConcentre, SEUILS.concentreOrange, SEUILS.concentreRouge),
    notePlancher(a.ndf, SEUILS.ndfMinOrange, SEUILS.ndfMinRouge),
    notePlancher(a.ndfFourrage, SEUILS.ndfFourrageMinOrange, SEUILS.ndfFourrageMinRouge),
    notePlancher(a.peNdf, SEUILS.peNdfMinOrange, SEUILS.peNdfMinRouge),
    notePlancher(a.msFourrageSec, SEUILS.fourrageSecMinOrange, SEUILS.fourrageSecMinRouge),
  ];

  const moyenne = notes.reduce((s, n) => s + n, 0) / notes.length;
  const maxi = Math.max(...notes);
  // On pondère vers le critère le plus pénalisant : un seul point très dégradé
  // suffit à faire décrocher le pH du rumen.
  const indice = Math.round(Math.min(100, 0.45 * moyenne + 0.55 * maxi));
  const phEstime = Math.round((6.6 - (indice / 100) * 0.85) * 100) / 100;

  const classe = phEstime < 6.0 ? "fort" : phEstime < 6.2 ? "faible" : "negligeable";
  return {
    indice,
    phEstime,
    classe,
    niveau: classe === "fort" ? "rouge" : classe === "faible" ? "orange" : "vert",
    libelle:
      classe === "fort"
        ? "Risque d'acidose fort"
        : classe === "faible"
          ? "Risque d'acidose faible"
          : "Risque d'acidose négligeable",
    message:
      classe === "fort"
        ? `pH du rumen estimé à ${virgule(phEstime)} : en dessous de 6,0, la digestion des fibres s'arrête, les bouses se liquéfient et l'acidose peut devenir clinique.`
        : classe === "faible"
          ? `pH du rumen estimé à ${virgule(phEstime)} : zone de vigilance (entre 6,0 et 6,2). Fractionnez les repas et surveillez les bouses.`
          : `pH du rumen estimé à ${virgule(phEstime)} : le rumen travaille dans de bonnes conditions.`,
  };
}

function notePlafond(valeur: number, orange: number, rouge: number): number {
  if (valeur <= orange * 0.7) return 0;
  if (valeur >= rouge) return 100;
  const bas = orange * 0.7;
  return ((valeur - bas) / (rouge - bas)) * 100;
}

function notePlancher(valeur: number, orange: number, rouge: number): number {
  if (valeur >= orange * 1.25) return 0;
  if (valeur <= rouge) return 100;
  const haut = orange * 1.25;
  return ((haut - valeur) / (haut - rouge)) * 100;
}

/**
 * Rejets prévus par la ration.
 * - Méthane : à partir de la MS ingérée et de la part de concentré.
 * - Azote fécal : 8,4 g N par kg de MS ingérée (valeur très stable).
 * - Azote urinaire : azote ammoniacal en excès dans le rumen (BPR positive),
 *   azote des acides aminés non utilisés (PDI x (1 - efficacité)) et azote
 *   endogène (0,312 g PDI par kg de poids vif).
 */
export function calculerRejets(a: Apports, pv: number, effPdi: number): Rejets {
  if (a.ms <= 0) return { ch4: 0, nUrine: 0, nFecal: 0, nTotal: 0 };
  const ch4 = a.ms * (19 + 0.1 * a.partConcentre);
  const nFecal = 8.4 * a.ms;
  const pdiEndogene = 0.312 * pv;
  const pdiDispo = Math.max(0, a.pdi - pdiEndogene);
  const excesAzoteRumen = Math.max(0, a.bpr);
  const nUrine = (excesAzoteRumen + pdiDispo * (1 - effPdi) + pdiEndogene) / 6.25;
  return {
    ch4: Math.round(ch4),
    nUrine: Math.round(nUrine),
    nFecal: Math.round(nFecal),
    nTotal: Math.round(nUrine + nFecal),
  };
}

/**
 * Besoin d'abreuvement : eau qui serait bue par un animal abreuvé à volonté en
 * thermoneutralité, augmentée des pertes par sudation au-delà de 15 °C, moins
 * l'eau contenue dans les aliments.
 */
export function besoinEau(
  a: Apports,
  eauDesAliments: number,
  temperature = 15,
): BesoinEau {
  if (a.ms <= 0) return { totale: 0, parLaRation: 0, boisson: 0 };
  const totale = a.ms * (3.6 + 0.12 * Math.max(0, temperature - 15));
  return {
    totale: Math.round(totale),
    parLaRation: Math.round(eauDesAliments),
    boisson: Math.max(0, Math.round(totale - eauDesAliments)),
  };
}

function virgule(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

