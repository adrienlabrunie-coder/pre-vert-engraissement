// Types du moteur de calcul de ration (référentiel INRA 2018)

import type { Interactions } from "./interactions";

export type { Interactions };

export type Categorie = "vache" | "genisse" | "boeuf";

export type Etat = 1 | 2 | 3 | 4 | 5; // note d'état corporel (0-5 simplifiée)

export interface Breed {
  id: string;
  nom: string;
  /** Poids adulte de référence de la femelle (kg) */
  poidsAdulte: number;
  /** Format : influe sur la capacité d'ingestion et la composition du gain */
  format: "petit" | "moyen" | "grand";
  /** Aptitude à l'engraissement (1 = tardif/maigre, 1.15 = précoce/gras) */
  precocite: number;
}

export type FamilleAliment =
  | "fourrage_humide"
  | "fourrage_sec"
  | "paille"
  | "racine"
  | "cereale"
  | "proteique"
  | "coproduit"
  | "aliment_complet"
  | "mineral";

export interface Feed {
  id: string;
  nom: string;
  famille: FamilleAliment;
  /** % de matière sèche du produit brut */
  ms: number;
  /** UFV par kg de MS */
  ufv: number;
  /** PDI (g/kg MS) — système INRA 2018 */
  pdi: number;
  /** Bilan protéique du rumen (g/kg MS), = PDIN - PDIE historique */
  bpr: number;
  /** NDF (g/kg MS) */
  ndf: number;
  /** Part du NDF réellement fibrogène (0-1) : brins longs = 1 */
  fibrosite: number;
  /** Amidon total (g/kg MS) */
  amidon: number;
  /** Part de l'amidon rapidement dégradable dans le rumen (0-1) */
  amidonRapide: number;
  /** Sucres solubles (g/kg MS) */
  sucres: number;
  /** Encombrement, UEB par kg de MS */
  ueb: number;
  /** Calcium et phosphore (g/kg MS) */
  ca: number;
  p: number;
  /** Prix indicatif €/t brute */
  prix: number;
  /** Aliment personnalisé de l'éleveur */
  perso?: boolean;
}

export interface Lot {
  categorie: Categorie;
  raceId: string;
  effectif: number;
  poidsDepart: number;
  poidsVente: number;
  ageMois: number;
  etat: Etat;
  gmq: number; // g/jour visé
  duree: number; // jours (calculé, ajustable)
  paturage: boolean;
}

export interface LigneRation {
  feedId: string;
  /** kg de MS distribués par animal et par jour */
  kgMS: number;
}

export interface Besoins {
  ci: number; // capacité d'ingestion (UEB)
  ufv: number;
  pdi: number;
  ca: number;
  p: number;
  msTheorique: number; // kg MS attendus
  gmqMax: number; // GMQ atteignable au maximum d'ingestion
  /** Unité d'énergie des tables : UFL en dessous de 1 000 g/j de croissance, sinon UFV */
  unite: "UFL" | "UFV";
  /** Efficacité d'utilisation des PDI retenue pour cette catégorie d'animal */
  effPdi: number;
}

export type Niveau = "vert" | "orange" | "rouge";

export interface Indicateur {
  cle: string;
  libelle: string;
  valeur: number;
  unite: string;
  cible: string;
  niveau: Niveau;
  message: string;
  aide: string;
}

export interface Apports {
  ms: number;
  /** UFV réellement disponibles, interactions digestives comprises */
  ufv: number;
  /** UFV de la somme des valeurs de table, avant interactions digestives */
  ufvTable: number;
  /** Énergie en UFL (échelle utilisée en dessous de 1 000 g/j de croissance) */
  ufl: number;
  pdi: number;
  /** PDI de la somme des valeurs de table, avant interactions digestives */
  pdiTable: number;
  bpr: number;
  ueb: number;
  ndf: number; // % MS
  ndfFourrage: number; // % MS
  peNdf: number; // % MS (NDF physiquement efficace)
  amidon: number; // % MS
  amidonRapide: number; // % MS
  sucres: number; // % MS
  partConcentre: number; // % MS
  /** kg MS de fourrage sec à brins longs (foin, paille) par animal et par jour */
  msFourrageSec: number;
  /** part du fourrage sec dans la MS totale (%) */
  partFourrageSec: number; // % MS
  /** Part de fourrages grossiers (frais, séchés, ensilés) dans la MS — règle bio des 60 % */
  partFourrage: number; // % MS
  ca: number;
  p: number;
  coutJour: number; // € / animal / jour
  /** Eau contenue dans les aliments distribués, litres / animal / jour */
  eauDesAliments: number;
}

export interface RisqueAcidose {
  indice: number;
  phEstime: number;
  classe: "negligeable" | "faible" | "fort";
  niveau: Niveau;
  libelle: string;
  message: string;
}

export interface Rejets {
  ch4: number;
  nUrine: number;
  nFecal: number;
  nTotal: number;
}

export interface BesoinEau {
  totale: number;
  parLaRation: number;
  boisson: number;
}

export interface Diagnostic {
  apports: Apports;
  besoins: Besoins;
  indicateurs: Indicateur[];
  niveau: Niveau;
  bloquant: boolean;
  gmqPrevu: number;
  corrections: Correction[];
  /** Indice global de risque d'acidose (pH du rumen estimé) */
  acidose: RisqueAcidose;
  /** Méthane et azote rejetés */
  rejets: Rejets;
  /** Besoin d'abreuvement estimé */
  eau: BesoinEau;
  /** Efficacité d'utilisation des PDI réellement obtenue */
  effPdiRealisee: number;
  /** Détail des interactions digestives de la ration */
  interactions: Interactions;
}

export interface Correction {
  libelle: string;
  appliquer: (lignes: LigneRation[]) => LigneRation[];
}

