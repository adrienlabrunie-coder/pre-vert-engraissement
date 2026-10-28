import { besoinEau, calculerRejets, risqueAcidose } from "./environnement";
import { estConcentre, estFourrage, estFourrageSec } from "./feeds";
import { calculerInteractions, uflDepuisUfv } from "./interactions";
import { calculerBesoins, gmqDepuisUFV, proteineDuGain } from "./requirements";
import type {
  Apports,
  Correction,
  Diagnostic,
  Feed,
  Indicateur,
  LigneRation,
  Lot,
  Niveau,
} from "./types";

export interface Contexte {
  lot: Lot;
  pv: number;
  feeds: Feed[];
}

export function feedById(feeds: Feed[], id: string): Feed | undefined {
  return feeds.find((f) => f.id === id);
}

export { SEUILS } from "./seuils";
import { SEUILS } from "./seuils";

/**
 * Apports réels de la ration.
 * `pv` (poids vif) est optionnel : il sert à calculer le niveau d'ingestion,
 * l'un des trois facteurs d'interaction digestive du système INRA 2018.
 */
export function calculerApports(lignes: LigneRation[], feeds: Feed[], pv?: number): Apports {
  let ms = 0,
    ufv = 0,
    ufl = 0,
    pdi = 0,
    bpr = 0,
    ueb = 0,
    ndf = 0,
    ndfFourrage = 0,
    peNdf = 0,
    amidon = 0,
    amidonRapide = 0,
    sucres = 0,
    msConcentre = 0,
    msFourrage = 0,
    msFourrageSec = 0,
    ca = 0,
    p = 0,
    coutJour = 0,
    eauDesAliments = 0;

  for (const l of lignes) {
    const f = feedById(feeds, l.feedId);
    if (!f || l.kgMS <= 0) continue;
    const kg = l.kgMS;
    ms += kg;
    ufv += kg * f.ufv;
    ufl += kg * uflDepuisUfv(f.ufv);
    pdi += kg * f.pdi;
    bpr += kg * f.bpr;
    ueb += kg * f.ueb;
    ndf += kg * f.ndf;
    peNdf += kg * f.ndf * f.fibrosite;
    if (estFourrage(f)) {
      ndfFourrage += kg * f.ndf;
      msFourrage += kg;
    }
    amidon += kg * f.amidon;
    amidonRapide += kg * f.amidon * f.amidonRapide;
    sucres += kg * f.sucres;
    if (estConcentre(f)) msConcentre += kg;
    if (estFourrageSec(f)) msFourrageSec += kg;
    ca += kg * f.ca;
    p += kg * f.p;
    const kgBrut = kg / (f.ms / 100);
    // prix en €/t brute -> €/kg MS
    coutJour += kgBrut * (f.prix / 1000);
    // eau contenue dans l'aliment (litres)
    eauDesAliments += kgBrut - kg;
  }

  const pct = (g: number) => (ms > 0 ? g / ms / 10 : 0); // g/kg MS -> % MS
  const partConcentre = ms > 0 ? (msConcentre / ms) * 100 : 0;
  const bprKg = ms > 0 ? bpr / ms : 0;

  // Interactions digestives : la ration ne vaut pas la somme de ses aliments
  const inter = calculerInteractions(ms, pv, partConcentre, bprKg);

  return {
    ms,
    ufv: ufv * inter.facteurUfv,
    ufvTable: ufv,
    ufl: ufl * inter.facteurUfv,
    pdi: pdi * inter.facteurPdi,
    pdiTable: pdi,
    bpr,
    ueb,
    ndf: pct(ndf),
    ndfFourrage: pct(ndfFourrage),
    peNdf: pct(peNdf),
    amidon: pct(amidon),
    amidonRapide: pct(amidonRapide),
    sucres: pct(sucres),
    partConcentre,
    msFourrageSec,
    partFourrageSec: ms > 0 ? (msFourrageSec / ms) * 100 : 0,
    partFourrage: ms > 0 ? (msFourrage / ms) * 100 : 0,
    ca,
    p,
    coutJour,
    eauDesAliments,
  };
}

/** Détail des interactions digestives d'une ration (pour l'affichage) */
export function interactionsRation(a: Apports, pv?: number) {
  const bprKg = a.ms > 0 ? a.bpr / a.ms : 0;
  return calculerInteractions(a.ms, pv, a.partConcentre, bprKg);
}

function pire(a: Niveau, b: Niveau): Niveau {
  const ordre: Niveau[] = ["vert", "orange", "rouge"];
  return ordre[Math.max(ordre.indexOf(a), ordre.indexOf(b))]!;
}

function plafond(valeur: number, orange: number, rouge: number): Niveau {
  if (valeur >= rouge) return "rouge";
  if (valeur >= orange) return "orange";
  return "vert";
}

function plancher(valeur: number, orange: number, rouge: number): Niveau {
  if (valeur <= rouge) return "rouge";
  if (valeur <= orange) return "orange";
  return "vert";
}

export function diagnostiquer(ctx: Contexte, lignes: LigneRation[]): Diagnostic {
  const { lot, pv, feeds } = ctx;
  const apports = calculerApports(lignes, feeds, pv);
  const besoins = calculerBesoins(lot, pv);
  const gmqPrevu = apports.ms > 0 ? gmqDepuisUFV(lot, pv, apports.ufv) : 0;
  const inter = calculerInteractions(
    apports.ms,
    pv,
    apports.partConcentre,
    apports.ms > 0 ? apports.bpr / apports.ms : 0,
  );
  const ind: Indicateur[] = [];

  // Unité d'énergie des tables : UFL en dessous de 1 000 g/j de croissance
  const ratioUfl = apports.ufv > 0 ? apports.ufl / apports.ufv : 1.08;
  const enUfl = besoins.unite === "UFL";
  const energieApportee = enUfl ? apports.ufl : apports.ufv;
  const energieBesoin = besoins.ufv * (enUfl ? ratioUfl : 1);

  const ecartUfv = besoins.ufv > 0 ? ((apports.ufv - besoins.ufv) / besoins.ufv) * 100 : 0;
  ind.push({
    cle: "ufv",
    libelle: `Énergie (${besoins.unite})`,
    valeur: energieApportee,
    unite: `${besoins.unite}/j`,
    cible: `${energieBesoin.toFixed(1)} ${besoins.unite}/j`,
    niveau: Math.abs(ecartUfv) <= 5 ? "vert" : Math.abs(ecartUfv) <= 12 ? "orange" : "rouge",
    message:
      (ecartUfv >= 0
        ? `Excédent de ${ecartUfv.toFixed(0)} % : croissance prévue ${Math.round(gmqPrevu)} g/j.`
        : `Déficit de ${Math.abs(ecartUfv).toFixed(0)} % : croissance prévue ${Math.round(gmqPrevu)} g/j au lieu de ${lot.gmq}.`) +
      (inter.explication ? ` ${inter.explication}` : ""),
    aide:
      "L'énergie détermine la vitesse d'engraissement. Trop peu : les animaux ne prennent pas. Trop : gaspillage et gras excessif." +
      (enUfl
        ? " En dessous de 1 000 g de croissance par jour, les tables comptent en UFL et non en UFV."
        : ""),
  });

  const ecartPdi = besoins.pdi > 0 ? ((apports.pdi - besoins.pdi) / besoins.pdi) * 100 : 0;
  const surcoutPdi = coutExcesPdi(apports, besoins.pdi);
  ind.push({
    cle: "pdi",
    libelle: "Protéines (PDI)",
    valeur: apports.pdi,
    unite: "g/j",
    cible: `${Math.round(besoins.pdi)} g/j`,
    niveau:
      ecartPdi >= 0
        ? ecartPdi <= SEUILS.pdiExcesOrange
          ? "vert"
          : ecartPdi <= SEUILS.pdiExcesRouge
            ? "orange"
            : "rouge"
        : ecartPdi >= -6
          ? "vert"
          : ecartPdi >= -15
            ? "orange"
            : "rouge",
    message:
      ecartPdi > SEUILS.pdiExcesBloquant
        ? `Excédent de ${ecartPdi.toFixed(0)} % : beaucoup trop d'azote. Le foie et les reins travaillent pour rien, les animaux boivent et urinent plus, les bouses se relâchent et vous payez environ ${euroTexte(surcoutPdi)} par animal et par jour pour rien. Ration à revoir.`
        : ecartPdi > SEUILS.pdiExcesRouge
          ? `Excédent de ${ecartPdi.toFixed(0)} % : l'azote en trop part en urée (foie et reins sollicités, appétit qui peut baisser) et vous coûte environ ${euroTexte(surcoutPdi)} par animal et par jour.`
          : ecartPdi > SEUILS.pdiExcesOrange
            ? `Excédent de ${ecartPdi.toFixed(0)} % : sans danger, mais environ ${euroTexte(surcoutPdi)} par animal et par jour de gaspillé.`
            : ecartPdi >= 0
              ? `Excédent de ${ecartPdi.toFixed(0)} % : marge de sécurité normale.`
              : `Déficit de ${Math.abs(ecartPdi).toFixed(0)} % : muscle et croissance limités.`,
    aide: "Les PDI sont les protéines réellement utilisables par l'animal. Un déficit freine la croissance ; un excédent est transformé en urée, éliminé dans les urines, et coûte cher.",
  });

  const bprParKg = apports.ms > 0 ? apports.bpr / apports.ms : 0;
  ind.push({
    cle: "bpr",
    libelle: "Équilibre azote du rumen (BPR)",
    valeur: bprParKg,
    unite: "g/kg MS",
    cible: "0 à +20 g/kg MS",
    niveau:
      bprParKg < SEUILS.bprBasRouge || bprParKg > SEUILS.bprHautRouge
        ? "rouge"
        : bprParKg < SEUILS.bprBasOrange || bprParKg > SEUILS.bprHautOrange
          ? "orange"
          : "vert",
    message:
      bprParKg < SEUILS.bprBasRouge
        ? "Les microbes du rumen manquent nettement d'azote : les fourrages sont mal digérés, l'animal mange moins et pousse moins."
        : bprParKg < SEUILS.bprBasOrange
          ? "Les microbes du rumen manquent d'azote : la digestion des fourrages baisse."
          : bprParKg > SEUILS.bprHautRouge
            ? "Surcharge d'azote dégradable : le rumen produit un excès d'ammoniac, que le foie doit transformer en urée. Réduisez la source d'azote."
            : bprParKg > SEUILS.bprHautOrange
              ? "Azote dégradable en excès : ammoniac, rejets et coût inutiles."
              : "Les microbes du rumen sont bien alimentés.",
    aide: "Le bilan protéique du rumen mesure si les microbes ont assez d'azote pour digérer la ration — ni trop peu, ni beaucoup trop.",
  });

  // Efficacité d'utilisation des PDI : indicateur biologique de l'adéquation
  // des apports azotés aux besoins (INRA 2018). En dessous du pivot de la
  // catégorie, les apports sont excédentaires ; au-dessus, ils sont déficitaires.
  const pdiEndogene = 0.312 * pv;
  const pdiDispo = Math.max(1, apports.pdi - pdiEndogene);
  const proteinesProduites = (proteineDuGain(lot, pv) * Math.max(0, gmqPrevu)) / 1000;
  const effPdiRealisee = apports.ms > 0 ? proteinesProduites / pdiDispo : 0;
  const ecartEff = besoins.effPdi > 0 ? (effPdiRealisee / besoins.effPdi - 1) * 100 : 0;
  ind.push({
    cle: "eff_pdi",
    libelle: "Protéines réellement valorisées",
    valeur: effPdiRealisee,
    unite: "g fixés / g disponible",
    cible: `${besoins.effPdi.toFixed(2).replace(".", ",")} pour ce type d'animal`,
    niveau:
      apports.ms <= 0
        ? "vert"
        : Math.abs(ecartEff) <= 20
          ? "vert"
          : Math.abs(ecartEff) <= 40
            ? "orange"
            : "rouge",
    message:
      apports.ms <= 0
        ? "Ration vide."
        : ecartEff < -20
          ? `Seulement ${Math.round(effPdiRealisee * 100)} % des protéines disponibles finissent en viande (repère ${Math.round(besoins.effPdi * 100)} %) : le reste part dans les urines. Trop de protéines pour ce que les animaux peuvent en faire.`
          : ecartEff > 20
            ? `Les protéines sont très sollicitées (${Math.round(effPdiRealisee * 100)} % valorisées pour un repère de ${Math.round(besoins.effPdi * 100)} %) : la croissance risque d'être bridée par l'azote.`
            : `${Math.round(effPdiRealisee * 100)} % des protéines disponibles servent à faire de la viande : c'est le bon niveau pour ce type d'animal.`,
    aide: "Un animal ne transforme jamais toutes les protéines : un jeune en valorise environ 55 %, un animal fini 40 %, une vache de réforme 50 %. Ce qui dépasse repart dans les urines, au prix du tourteau.",
  });



  const remplissage = besoins.ci > 0 ? (apports.ueb / besoins.ci) * 100 : 0;
  ind.push({
    cle: "encombrement",
    libelle: "Encombrement / appétit",
    valeur: remplissage,
    unite: "% de la capacité",
    cible: "90 à 100 %",
    niveau: remplissage > 105 ? "rouge" : remplissage > 100 || remplissage < 85 ? "orange" : "vert",
    message:
      remplissage > 100
        ? `La ration dépasse ce que les animaux peuvent avaler (${apports.ueb.toFixed(1)} UEB pour ${besoins.ci.toFixed(1)} UEB d'appétit) : refus à l'auge.`
        : `Les animaux avalent la ration (${apports.ueb.toFixed(1)} UEB sur ${besoins.ci.toFixed(1)} UEB d'appétit).`,
    aide: "L'encombrement mesure la place que prend la ration dans le rumen. Au-delà de la capacité, l'animal laisse des refus.",
  });

  ind.push({
    cle: "concentre",
    libelle: "Part de concentré",
    valeur: apports.partConcentre,
    unite: "% de la MS",
    cible: `< ${SEUILS.concentreOrange} %`,
    niveau: plafond(apports.partConcentre, SEUILS.concentreOrange, SEUILS.concentreRouge),
    message:
      apports.partConcentre >= SEUILS.concentreRouge
        ? "Trop de concentré : risque d'acidose élevé."
        : apports.partConcentre >= SEUILS.concentreOrange
          ? "Part de concentré élevée : surveillez les bouses et l'appétit."
          : "Part de concentré maîtrisée.",
    aide: "Plus la part de concentré monte, plus le rumen s'acidifie vite.",
  });

  ind.push({
    cle: "amidon",
    libelle: "Amidon total",
    valeur: apports.amidon,
    unite: "% de la MS",
    cible: `< ${SEUILS.amidonOrange} %`,
    niveau: plafond(apports.amidon, SEUILS.amidonOrange, SEUILS.amidonRouge),
    message:
      apports.amidon >= SEUILS.amidonRouge
        ? "Amidon trop élevé : acidose probable."
        : apports.amidon >= SEUILS.amidonOrange
          ? "Amidon élevé : fractionnez les repas."
          : "Amidon dans la zone sûre.",
    aide: "L'amidon des céréales fermente très vite et fait chuter le pH du rumen.",
  });

  ind.push({
    cle: "amidon_rapide",
    libelle: "Amidon rapidement dégradable",
    valeur: apports.amidonRapide,
    unite: "% de la MS",
    cible: `< ${SEUILS.amidonRapideOrange} %`,
    niveau: plafond(apports.amidonRapide, SEUILS.amidonRapideOrange, SEUILS.amidonRapideRouge),
    message:
      apports.amidonRapide >= SEUILS.amidonRapideRouge
        ? "Trop de blé / orge finement broyés : fermentation trop rapide."
        : apports.amidonRapide >= SEUILS.amidonRapideOrange
          ? "Remplacez une partie du blé ou de l'orge par du maïs grain, plus lent."
          : "Vitesse de fermentation de l'amidon correcte.",
    aide: "Blé et orge fermentent bien plus vite que le maïs : à quantité égale d'amidon, le risque n'est pas le même.",
  });

  ind.push({
    cle: "sucres",
    libelle: "Sucres solubles",
    valeur: apports.sucres,
    unite: "% de la MS",
    cible: `< ${SEUILS.sucresOrange} %`,
    niveau: plafond(apports.sucres, SEUILS.sucresOrange, SEUILS.sucresRouge),
    message:
      apports.sucres >= SEUILS.sucresOrange
        ? "Sucres élevés (betterave, mélasse) : cumul de risque avec l'amidon."
        : "Sucres dans la zone sûre.",
    aide: "Les sucres fermentent encore plus vite que l'amidon.",
  });

  ind.push({
    cle: "ndf",
    libelle: "Fibres totales (NDF)",
    valeur: apports.ndf,
    unite: "% de la MS",
    cible: `> ${SEUILS.ndfMinOrange} %`,
    niveau: plancher(apports.ndf, SEUILS.ndfMinOrange, SEUILS.ndfMinRouge),
    message:
      apports.ndf <= SEUILS.ndfMinRouge
        ? "Ration trop pauvre en fibres : le rumen ne peut pas tamponner."
        : apports.ndf <= SEUILS.ndfMinOrange
          ? "Fibres justes : ajoutez du fourrage grossier."
          : "Niveau de fibres satisfaisant.",
    aide: "Les fibres font ruminer, la salive tamponne l'acidité.",
  });

  ind.push({
    cle: "ndf_fourrage",
    libelle: "Fibres venant des fourrages",
    valeur: apports.ndfFourrage,
    unite: "% de la MS",
    cible: `> ${SEUILS.ndfFourrageMinOrange} %`,
    niveau: plancher(
      apports.ndfFourrage,
      SEUILS.ndfFourrageMinOrange,
      SEUILS.ndfFourrageMinRouge,
    ),
    message:
      apports.ndfFourrage <= SEUILS.ndfFourrageMinRouge
        ? "Pas assez de fibres de fourrage : ajoutez du foin ou de la paille."
        : "Les fourrages apportent assez de fibres.",
    aide: "Seules les fibres de fourrage font vraiment ruminer ; celles des coproduits beaucoup moins.",
  });

  ind.push({
    cle: "pendf",
    libelle: "Fibres efficaces (brins longs)",
    valeur: apports.peNdf,
    unite: "% de la MS",
    cible: `> ${SEUILS.peNdfMinOrange} %`,
    niveau: plancher(apports.peNdf, SEUILS.peNdfMinOrange, SEUILS.peNdfMinRouge),
    message:
      apports.peNdf <= SEUILS.peNdfMinRouge
        ? "Ration trop finement hachée ou trop pauvre en brins longs."
        : "La ration fait ruminer correctement.",
    aide: "Coupez les fourrages assez long (4 à 6 cm) pour garder de la fibrosité.",
  });

  ind.push({
    cle: "fourrage_sec",
    libelle: "Foin ou paille distribué",
    valeur: apports.msFourrageSec,
    unite: "kg MS/j",
    cible: `≥ ${SEUILS.fourrageSecMinOrange.toString().replace(".", ",")} kg MS/j`,
    niveau: plancher(
      apports.msFourrageSec,
      SEUILS.fourrageSecMinOrange,
      SEUILS.fourrageSecMinRouge,
    ),
    message:
      apports.msFourrageSec <= SEUILS.fourrageSecMinRouge
        ? "Sans foin ni paille en brins longs, le rumen ne se remue plus : le tapis fibreux disparaît, la rumination chute et l'acidose s'installe, même si les fibres calculées semblent suffisantes."
        : apports.msFourrageSec <= SEUILS.fourrageSecMinOrange
          ? "Un peu juste en foin/paille : montez vers 1,5 à 2 kg MS par animal et par jour, distribués en brins longs."
          : `${nombreFr(apports.msFourrageSec)} kg MS de fourrage sec : le tapis fibreux du rumen est assuré.`,
    aide: "Le foin ou la paille en brins longs forme un « matelas » dans le rumen : il fait ruminer, donc saliver, et c'est la salive qui neutralise l'acidité.",
  });


  ind.push({
    cle: "bio_fourrage",
    libelle: "Part de fourrage (cahier des charges bio)",
    valeur: apports.partFourrage,
    unite: "% de la MS",
    cible: "≥ 60 % de la MS",
    niveau:
      apports.ms <= 0
        ? "vert"
        : plancher(
            apports.partFourrage,
            SEUILS.bioFourrageMinOrange,
            SEUILS.bioFourrageMinRouge,
          ),
    message:
      apports.ms <= 0
        ? "Ration vide."
        : apports.partFourrage < SEUILS.bioFourrageMinRouge
          ? `Seulement ${Math.round(apports.partFourrage)} % de fourrage : interdit en bio. Le cahier des charges impose au moins 60 % de fourrage (herbe, foin, paille, enrubannage, ensilage) dans la matière sèche de la ration du jour. Il faut remonter le fourrage ou baisser les concentrés.`
          : apports.partFourrage < SEUILS.bioFourrageMinOrange
            ? `${Math.round(apports.partFourrage)} % de fourrage : conforme mais tout juste. Gardez 2 à 3 points de marge, les pesées à l'auge ne sont jamais exactes.`
            : `${Math.round(apports.partFourrage)} % de fourrage : conforme au cahier des charges bio.`,
    aide: "En bio, au moins 60 % de la matière sèche mangée chaque jour doit venir de fourrages grossiers : herbe pâturée, foin, paille, enrubannage, ensilage. Les concentrés (céréales, tourteaux, aliments du commerce) restent donc sous 40 %.",
  });

  const caP = apports.p > 0 ? apports.ca / apports.p : 0;
  ind.push({
    cle: "mineraux",
    libelle: "Minéraux (Ca / P)",
    valeur: caP,
    unite: "rapport",
    cible: "1,5 à 2,5",
    niveau:
      apports.ca < besoins.ca * 0.85 || apports.p < besoins.p * 0.85
        ? "orange"
        : caP < 1.2 || caP > 3.5
          ? "orange"
          : "vert",
    message:
      apports.ca < besoins.ca * 0.85
        ? `Calcium insuffisant (${Math.round(apports.ca)} g pour ${Math.round(besoins.ca)} g) : ajoutez un CMV.`
        : apports.p < besoins.p * 0.85
          ? `Phosphore insuffisant (${Math.round(apports.p)} g pour ${Math.round(besoins.p)} g).`
          : `Ca ${Math.round(apports.ca)} g / P ${Math.round(apports.p)} g : équilibre correct.`,
    aide: "Une ration à base de céréales est pauvre en calcium : un CMS/CMV adapté est indispensable.",
  });

  let niveau: Niveau = "vert";
  for (const i of ind) niveau = pire(niveau, i.niveau);

  const clesAcidose = [
    "concentre",
    "amidon",
    "amidon_rapide",
    "sucres",
    "ndf",
    "ndf_fourrage",
    "pendf",
    "fourrage_sec",
  ];
  // Indice global de risque d'acidose : tous les signaux du rumen en une note
  const acidose = risqueAcidose(apports);
  const rejets = calculerRejets(apports, pv, besoins.effPdi);
  const eau = besoinEau(apports, apports.eauDesAliments);

  const bloquant =
    ind.some((i) => clesAcidose.includes(i.cle) && i.niveau === "rouge") ||
    ind.some((i) => i.cle === "bio_fourrage" && i.niveau === "rouge") ||
    ind.some((i) => i.cle === "encombrement" && i.niveau === "rouge") ||
    ecartPdi > SEUILS.pdiExcesBloquant ||
    (apports.ms > 0 && acidose.classe === "fort");

  return {
    apports,
    besoins,
    indicateurs: ind,
    niveau,
    bloquant,
    gmqPrevu,
    acidose,
    rejets,
    eau,
    interactions: inter,
    effPdiRealisee,
    corrections: corrections(ctx, lignes, ind),
  };
}

/** Corrections proposées en un clic pour lever les alertes */
function corrections(ctx: Contexte, lignes: LigneRation[], ind: Indicateur[]): Correction[] {
  const { feeds } = ctx;
  const res: Correction[] = [];
  const rouge = (cle: string) => ind.find((i) => i.cle === cle && i.niveau !== "vert");

  const paille =
    feeds.find((f) => f.famille === "paille") ?? feeds.find((f) => f.famille === "fourrage_sec");
  const manqueSec = rouge("fourrage_sec");
  if (manqueSec && paille) {
    const apport = apportsFourrageSec(lignes, feeds);
    const dose = round2(Math.max(0.5, SEUILS.fourrageSecMinOrange + 0.2 - apport));
    res.push({
      libelle: `Distribuer ${nombreFr(dose)} kg MS de ${paille.nom.toLowerCase()} en brins longs`,
      appliquer: (ls) => ajouter(ls, paille.id, dose),
    });
  }
  // Bio : remonter la part de fourrage à 60 % minimum de la MS
  const manqueBio = rouge("bio_fourrage");
  if (manqueBio) {
    const a = calculerApports(lignes, feeds);
    const fourragePresent = lignes
      .map((l) => ({ l, f: feedById(feeds, l.feedId) }))
      .filter((x) => x.f && estFourrage(x.f) && x.l.kgMS > 0)
      .sort((a2, b2) => b2.l.kgMS - a2.l.kgMS)[0];
    const cible = SEUILS.bioFourrageMinOrange + 1;
    // kg de fourrage à ajouter pour atteindre la cible à MS totale croissante
    const msFourrage = (a.partFourrage / 100) * a.ms;
    const ajout = round2(Math.max(0.3, (cible / 100) * a.ms - msFourrage) / (1 - cible / 100));
    const support = fourragePresent?.f ?? paille;
    if (support) {
      res.push({
        libelle: `Ajouter ${nombreFr(ajout)} kg MS de ${support.nom.toLowerCase()} pour repasser au-dessus de 60 % de fourrage (bio)`,
        appliquer: (ls) => ajouter(ls, support.id, ajout),
      });
    }
    const concentresPresents = lignes.filter((l) => {
      const f = feedById(feeds, l.feedId);
      return f && estConcentre(f) && l.kgMS > 0;
    });
    if (concentresPresents.length > 0) {
      res.push({
        libelle: "Réduire les concentrés de 20 % (règle bio des 60 % de fourrage)",
        appliquer: (ls) =>
          ls.map((l) => {
            const f = feedById(feeds, l.feedId);
            return f && estConcentre(f) ? { ...l, kgMS: round2(l.kgMS * 0.8) } : l;
          }),
      });
    }
  }

  const fibreProbleme = rouge("ndf") ?? rouge("ndf_fourrage") ?? rouge("pendf");
  if (fibreProbleme && !manqueSec && paille) {
    res.push({
      libelle: `Ajouter 0,5 kg MS de ${paille.nom.toLowerCase()}`,
      appliquer: (ls) => ajouter(ls, paille.id, 0.5),
    });
  }

  const cerealesPresentes = lignes.filter((l) => {
    const f = feedById(feeds, l.feedId);
    return f && f.famille === "cereale" && l.kgMS > 0;
  });
  if ((rouge("amidon") ?? rouge("concentre")) && cerealesPresentes.length > 0) {
    res.push({
      libelle: "Réduire les céréales de 15 %",
      appliquer: (ls) =>
        ls.map((l) => {
          const f = feedById(feeds, l.feedId);
          return f && f.famille === "cereale" ? { ...l, kgMS: round2(l.kgMS * 0.85) } : l;
        }),
    });
  }

  const rapide = rouge("amidon_rapide");
  const mais = feeds.find((f) => f.id === "mais_grain");
  const bleOuOrge = cerealesPresentes.find(
    (l) => l.feedId === "ble" || l.feedId === "orge" || l.feedId === "triticale",
  );
  if (rapide && mais && bleOuOrge) {
    res.push({
      libelle: "Remplacer la moitié du blé/orge par du maïs grain (amidon plus lent)",
      appliquer: (ls) => {
        const part = round2(bleOuOrge.kgMS / 2);
        const reduit = ls.map((l) =>
          l.feedId === bleOuOrge.feedId ? { ...l, kgMS: round2(l.kgMS - part) } : l,
        );
        return ajouter(reduit, mais.id, part);
      },
    });
  }

  const bicarbonate = feeds.find((f) => f.id === "bicarbonate");
  if ((rouge("amidon") ?? rouge("concentre")) && bicarbonate) {
    res.push({
      libelle: "Ajouter 100 g de bicarbonate de soude (effet tampon)",
      appliquer: (ls) => ajouter(ls, bicarbonate.id, 0.1),
    });
  }

  const encombrement = ind.find((i) => i.cle === "encombrement");
  if (encombrement && encombrement.valeur > 100) {
    const plusEncombrant = [...lignes]
      .filter((l) => l.kgMS > 0)
      .sort((a, b) => (feedById(feeds, b.feedId)?.ueb ?? 0) - (feedById(feeds, a.feedId)?.ueb ?? 0))[0];
    if (plusEncombrant) {
      const nom = feedById(feeds, plusEncombrant.feedId)?.nom ?? "l'aliment le plus encombrant";
      res.push({
        libelle: `Réduire ${nom.toLowerCase()} de 0,5 kg MS`,
        appliquer: (ls) =>
          ls.map((l) =>
            l.feedId === plusEncombrant.feedId
              ? { ...l, kgMS: round2(Math.max(0, l.kgMS - 0.5)) }
              : l,
          ),
      });
    }
  }

  const ufvInd = ind.find((i) => i.cle === "ufv");
  if (ufvInd && ufvInd.niveau !== "vert") {
    const cereale = feeds.find((f) => f.famille === "cereale");
    const deficit = ufvInd.message.includes("Déficit");
    if (cereale) {
      res.push({
        libelle: deficit
          ? `Ajouter 0,5 kg MS de ${cereale.nom.toLowerCase()}`
          : `Retirer 0,5 kg MS de ${cereale.nom.toLowerCase()}`,
        appliquer: (ls) => ajouter(ls, cereale.id, deficit ? 0.5 : -0.5),
      });
    }
  }

  const pdiInd = ind.find((i) => i.cle === "pdi");
  if (pdiInd && pdiInd.niveau !== "vert") {
    const deficit = pdiInd.message.includes("Déficit");
    if (deficit) {
      const correcteur =
        [...feeds].filter((f) => f.pdi >= 130).sort((a, b) => b.pdi - a.pdi)[0] ??
        feeds.find((f) => f.id === "tourteau_colza");
      if (correcteur) {
        res.push({
          libelle: `Ajouter 0,3 kg MS de ${correcteur.nom.toLowerCase()}`,
          appliquer: (ls) => ajouter(ls, correcteur.id, 0.3),
        });
      }
    } else {
      // 1. Retirer d'abord le correcteur azoté présent dans la ration
      const correcteurPresent = lignes
        .filter((l) => l.kgMS > 0)
        .map((l) => ({ l, f: feedById(feeds, l.feedId) }))
        .filter((x) => x.f && x.f.pdi >= 130)
        .sort((a, b) => (b.f?.pdi ?? 0) - (a.f?.pdi ?? 0))[0];
      if (correcteurPresent?.f) {
        const f = correcteurPresent.f;
        const dose = round2(Math.min(correcteurPresent.l.kgMS, 0.3));
        res.push({
          libelle: `Retirer ${nombreFr(dose)} kg MS de ${f.nom.toLowerCase()} (azote en trop)`,
          appliquer: (ls) => ajouter(ls, f.id, -dose),
        });
      } else {
        // 2. Sinon l'excès vient du fourrage : on en remplace une part par de l'énergie pauvre en azote
        const fourrageAzote = lignes
          .filter((l) => l.kgMS > 0.5)
          .map((l) => ({ l, f: feedById(feeds, l.feedId) }))
          .filter((x) => x.f && estFourrage(x.f) && !estFourrageSec(x.f) && x.f.pdi >= 65)
          .sort((a, b) => (b.f?.pdi ?? 0) - (a.f?.pdi ?? 0))[0];
        const energie = [...feeds]
          .filter((f) => f.pdi < 110 && f.ufv >= 0.9 && f.famille !== "mineral")
          .sort((a, b) => b.ufv - a.ufv)[0];
        if (fourrageAzote?.f && energie) {
          const fa = fourrageAzote.f;
          const retire = round2(Math.min(fourrageAzote.l.kgMS - 0.5, 1));
          const ajout = round2((retire * fa.ufv) / energie.ufv);
          res.push({
            libelle: `Remplacer ${nombreFr(retire)} kg MS de ${fa.nom.toLowerCase()} par ${nombreFr(ajout)} kg MS de ${energie.nom.toLowerCase()}`,
            appliquer: (ls) => ajouter(ajouter(ls, fa.id, -retire), energie.id, ajout),
          });
        }
      }
    }
  }

  return res.slice(0, 4);
}

export function ajouter(lignes: LigneRation[], feedId: string, kgMS: number): LigneRation[] {
  const existe = lignes.find((l) => l.feedId === feedId);
  if (existe) {
    return lignes.map((l) =>
      l.feedId === feedId ? { ...l, kgMS: round2(Math.max(0, l.kgMS + kgMS)) } : l,
    );
  }
  if (kgMS <= 0) return lignes;
  return [...lignes, { feedId, kgMS: round2(kgMS) }];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function nombreFr(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function apportsFourrageSec(lignes: LigneRation[], feeds: Feed[]): number {
  return lignes.reduce((t, l) => {
    const f = feedById(feeds, l.feedId);
    return f && estFourrageSec(f) && l.kgMS > 0 ? t + l.kgMS : t;
  }, 0);
}

function euroTexte(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} €`;
}

/** Coût approximatif de l'azote distribué en trop, en € / animal / jour */
export function coutExcesPdi(apports: Apports, besoinPdi: number): number {
  if (apports.pdi <= besoinPdi || apports.pdi <= 0) return 0;
  const coutParGramme = apports.coutJour / apports.pdi;
  return Math.max(0, (apports.pdi - besoinPdi) * coutParGramme);
}

