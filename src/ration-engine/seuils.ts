/** Seuils de sécurité fermentaire (INRA 2018, chap. 15 — acidose ruminale) */
export const SEUILS = {
  concentreOrange: 55, // % MS
  concentreRouge: 65,
  amidonOrange: 26, // % MS
  amidonRouge: 32,
  amidonRapideOrange: 18,
  amidonRapideRouge: 23,
  ndfMinOrange: 33, // % MS
  ndfMinRouge: 28,
  ndfFourrageMinOrange: 22,
  ndfFourrageMinRouge: 18,
  peNdfMinOrange: 21,
  peNdfMinRouge: 18,
  sucresOrange: 6, // % MS
  sucresRouge: 8,
  /** Fourrage sec à brins longs (foin, paille), kg MS / animal / jour */
  fourrageSecMinOrange: 1.5,
  fourrageSecMinRouge: 0.8,
  /** Excédent de PDI toléré (% du besoin) */
  pdiExcesOrange: 10,
  pdiExcesRouge: 25,
  pdiExcesBloquant: 60,
  /**
   * Agriculture biologique — règlement (UE) 2018/848, annexe II, partie II,
   * point 1.9.1.1 f) : au moins 60 % de la matière sèche de la ration journalière
   * provient de fourrages grossiers, frais, séchés ou ensilés.
   */
  bioFourrageMinRouge: 60, // % MS — en dessous, ration non conforme
  bioFourrageMinOrange: 63, // marge de sécurité de pesée
  /** Bilan protéique du rumen, g/kg MS */
  bprBasOrange: -12,
  bprBasRouge: -25,
  bprHautOrange: 25,
  bprHautRouge: 45,
};

