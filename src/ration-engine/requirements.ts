import { getBreed } from "./breeds";
import type { Besoins, Lot } from "./types";

/**
 * Besoins des bovins allaitants en croissance / à l'engrais.
 * Référentiel INRA 2018 (chap. 6 énergie, chap. 7 protéines, chap. 19 bovins à l'engrais).
 *
 * 1 UFV = 7,11 MJ d'énergie nette d'engraissement.
 */
export const MJ_PAR_UFV = 7.11;

/** Poids métabolique */
export function pv075(pv: number): number {
  return Math.pow(pv, 0.75);
}

/** Maturité : poids vif rapporté au poids adulte de la race */
export function maturite(pv: number, poidsAdulte: number): number {
  return Math.min(1.15, pv / poidsAdulte);
}

/**
 * Besoin d'entretien en UFV.
 * Tables INRA : 1,4 + 0,6 x PV/100 UF, soit 0,041 x PV^0,75 (5,0 UFV à 600 kg,
 * 5,8 à 740 kg). Le coefficient 0,055 utilisé auparavant surestimait l'entretien
 * de près de 30 % et faisait sous-estimer la croissance permise par les rations
 * de finition à base de foin (réf. IDELE 2014, bœufs bio finis à l'auge).
 */
export function entretienUFV(lot: Lot, pv: number): number {
  const base = 0.041 * pv075(pv);
  const activite = lot.paturage ? 1.15 : 1;
  // Chez les animaux en croissance, l'entretien exprimé en UFV est plus faible
  // qu'en UFL (correction UFV/UFL des tables INRA) : 0,041 x PV^0,75 x 0,86,
  // soit 3,45 UFV pour un animal de 450 kg. Les femelles adultes à l'engrais
  // restent raisonnées sur la base UFL, légèrement abaissée.
  const cat = lot.categorie === "vache" ? 0.97 : 0.86;
  return base * activite * cat;
}

/**
 * Contenu énergétique du gain (MJ / kg de gain de poids vif).
 * Il augmente fortement avec la maturité et l'état d'engraissement :
 * un gain de fin d'engraissement est essentiellement du gras.
 *
 * Bases recalées sur des essais publiés :
 * - vache de réforme : 8,4 à 8,6 kg MS par kg de gain pour 1 200 g/j
 *   (Malterre et al., INRA Prod. Anim. 1989, vaches limousines) ;
 * - bœuf fini à l'auge : 900 g/j avec 7,5 kg MS de foin + 4 kg MS de méteil
 *   (IDELE 2014, bœufs bio de race à viande).
 *
 * Vitesse de croissance : en dessous de 1 000 g/j, les tables INRA raisonnent
 * en UFL et non en UFV, parce que la part de protéines dans le gain augmente
 * et que le rendement d'utilisation de l'énergie pour la croissance (kpf)
 * baisse (Nozière et al., INRAE Prod. Anim. 2026, 39(2), 9526, section 3.3a).
 * Un kilo gagné lentement coûte donc plus d'énergie qu'un kilo gagné vite.
 */
export function energieDuGain(lot: Lot, pv: number, gmqKg?: number): number {
  const race = getBreed(lot.raceId);
  const m = maturite(pv, race.poidsAdulte);
  // Repères de terrain (rations types de jeunes bovins et de bœufs, tables
  // INRA 2018) : 4,3 à 4,8 UFV par kg de gain en croissance active, 4,8 à 5,5
  // en finition, quand le gain devient surtout du gras. Les bases précédentes
  // (22 et 23 MJ) rendaient le kilo de gain deux fois trop bon marché chez les
  // animaux jeunes et surestimaient la croissance d'environ 30 %.
  const basePar: Record<Lot["categorie"], number> = {
    genisse: 33,
    boeuf: 34,
    vache: 39,
  };
  const base = basePar[lot.categorie];
  // 0,55 à 1,0 selon la maturité, puis correction de précocité et d'état corporel
  const facteurMaturite = 0.55 + 0.45 * Math.min(1, m / 0.95);
  const facteurEtat = 1 + (lot.etat - 2.5) * 0.06;
  const gmq = Math.max(0, gmqKg ?? lot.gmq / 1000);
  const facteurVitesse = 1 + 0.2 * Math.min(1, Math.max(0, (1 - gmq) / 1));
  return base * facteurMaturite * race.precocite * facteurEtat * facteurVitesse;
}

/** Unité d'énergie des tables INRA selon la vitesse de croissance visée */
export function uniteEnergie(lot: Lot): "UFL" | "UFV" {
  return lot.gmq < 1000 ? "UFL" : "UFV";
}

/** Besoin de production en UFV pour le GMQ visé */
export function productionUFV(lot: Lot, pv: number, gmqKg: number): number {
  return (energieDuGain(lot, pv, gmqKg) * gmqKg) / MJ_PAR_UFV;
}

/** Teneur en protéines du gain (g PB / kg de gain), décroît avec la maturité */
export function proteineDuGain(lot: Lot, pv: number): number {
  const race = getBreed(lot.raceId);
  const m = maturite(pv, race.poidsAdulte);
  const base = lot.categorie === "vache" ? 110 : 150;
  return Math.max(45, base * (1 - 0.55 * Math.min(1, m)));
}

/**
 * Efficacité d'utilisation des PDI (EffPDI, INRA 2018).
 * Elle décroît avec l'âge car la part de protéines dans le gain diminue :
 * 0,55 chez le jeune, 0,40 chez l'animal proche de sa taille adulte
 * (Nozière et al., 2026, section 4.1). Une vache de réforme est à 0,50.
 */
export function effPdi(lot: Lot, pv: number): number {
  if (lot.categorie === "vache") return 0.5;
  const race = getBreed(lot.raceId);
  const m = Math.min(1, maturite(pv, race.poidsAdulte));
  return 0.55 - 0.15 * m;
}

/**
 * Densité protéique minimale recommandée d'une ration d'engraissement
 * (g PDI par UFV, INRA 2018 chap. 19). C'est ce plancher qui gouverne en
 * pratique : additionner entretien et gain sous-estime le besoin réel.
 */
export function pdiParUFVRecommande(lot: Lot): number {
  // Finition des femelles : « 100 à 110 g PDI/UFV suffisent, au-dessus c'est du
  // gaspillage » (IDELE / AFiVAq, Itinéraires techniques de finition des vaches
  // Blonde d'Aquitaine, 2020, fiche Réf. n°1). Les 11 itinéraires de référence
  // affichent 100 à 110 g PDI/UFV pour des rations à 13 UFV/j.
  return lot.categorie === "genisse" ? 100 : lot.categorie === "boeuf" ? 95 : 100;
}

/**
 * Besoin PDI total (g/j) : le plus exigeant entre
 * (entretien 3,25 g/PV^0,75 + gain / efficacité EffPDI) et la densité minimale
 * de la ration rapportée au besoin énergétique.
 */
export function besoinPDI(lot: Lot, pv: number, gmqKg: number, ufvBesoin?: number): number {
  const entretien = 3.25 * pv075(pv);
  const gain = (proteineDuGain(lot, pv) * gmqKg) / effPdi(lot, pv);
  const additif = entretien + gain;
  const ufv = ufvBesoin ?? entretienUFV(lot, pv) + productionUFV(lot, pv, gmqKg);
  return Math.max(additif, pdiParUFVRecommande(lot) * ufv);
}

/** Capacité d'ingestion (UEB) */
export function capaciteIngestion(lot: Lot, pv: number): number {
  const race = getBreed(lot.raceId);
  const m = maturite(pv, race.poidsAdulte);
  const formatFacteur = race.format === "grand" ? 1.04 : race.format === "petit" ? 0.95 : 1;
  // l'engraissement et l'état corporel réduisent l'ingestion en fin de période
  const etatFacteur = 1 - Math.max(0, lot.etat - 3) * 0.05 - Math.max(0, m - 0.95) * 0.35;
  // Une vache de réforme mange peu : 1,85 à 1,90 kg MS / 100 kg de poids vif
  // mesurés sur vaches limousines (Malterre et al., INRA Prod. Anim. 1989).
  const jeunesse = lot.categorie === "vache" ? 0.89 : 1.03;
  return 0.105 * pv075(pv) * formatFacteur * etatFacteur * jeunesse;
}

/** Besoins calcium / phosphore (g/j) */
export function besoinsMineraux(lot: Lot, pv: number, gmqKg: number) {
  const ca = 0.04 * pv + 14 * gmqKg;
  const p = 0.032 * pv + 7 * gmqKg;
  return { ca, p };
}

export function calculerBesoins(lot: Lot, pv: number): Besoins {
  const gmqKg = lot.gmq / 1000;
  const ci = capaciteIngestion(lot, pv);
  const ufv = entretienUFV(lot, pv) + productionUFV(lot, pv, gmqKg);
  const pdi = besoinPDI(lot, pv, gmqKg, ufv);
  const { ca, p } = besoinsMineraux(lot, pv, gmqKg);
  // MS attendue si la ration a un encombrement moyen de 1,0 UEB/kg MS
  const msTheorique = ci;
  // GMQ atteignable au maximum d'ingestion avec une ration de 0,95 UFV/kg MS
  const ufvDispo = ci * 0.95 - entretienUFV(lot, pv);
  const gmqMax = Math.max(0, (ufvDispo * MJ_PAR_UFV) / energieDuGain(lot, pv, 1.2)) * 1000;
  return {
    ci,
    ufv,
    pdi,
    ca,
    p,
    msTheorique,
    gmqMax,
    unite: uniteEnergie(lot),
    effPdi: effPdi(lot, pv),
  };
}

/**
 * GMQ réellement permis par un apport énergétique donné (g/j).
 * Le coût énergétique du kilo de gain dépend de la vitesse de croissance :
 * on résout donc par approximations successives.
 */
export function gmqDepuisUFV(lot: Lot, pv: number, ufvApportes: number): number {
  const dispo = ufvApportes - entretienUFV(lot, pv);
  let gmqKg = Math.max(0, dispo * MJ_PAR_UFV) / energieDuGain(lot, pv, 1);
  for (let i = 0; i < 12; i++) {
    gmqKg = (dispo * MJ_PAR_UFV) / energieDuGain(lot, pv, Math.max(0, gmqKg));
  }
  const gmq = gmqKg * 1000;
  return dispo <= 0 ? Math.max(-1500, gmq) : gmq;
}

/** Durée d'engraissement (jours) pour passer du poids de départ au poids de vente */
export function dureeEngraissement(lot: Lot): number {
  const gain = Math.max(0, lot.poidsVente - lot.poidsDepart);
  return lot.gmq > 0 ? Math.round((gain / lot.gmq) * 1000) : 0;
}

