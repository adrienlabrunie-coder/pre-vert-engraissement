import { estConcentre, estFourrage, estFourrageSec } from "./feeds";
import { calculerApports, diagnostiquer, feedById, round2, SEUILS } from "./ration";
import type { Contexte } from "./ration";
import { calculerBesoins } from "./requirements";
import type { Feed, LigneRation } from "./types";

/**
 * Équilibrage automatique : construit la ration la moins chère qui respecte
 * les besoins (énergie, PDI, minéraux) sans franchir les seuils de sécurité
 * fermentaire (concentré, amidon, fibres, encombrement).
 *
 * Méthode : base fourragère maximisée dans la limite de l'appétit, puis ajout
 * de concentré énergétique et de correcteur azoté par pas fins, en refusant
 * tout pas qui rendrait la ration dangereuse.
 */
export function equilibrer(ctx: Contexte, feedsChoisis: Feed[]): LigneRation[] {
  const { lot, pv, feeds } = ctx;
  const besoins = calculerBesoins(lot, pv);

  const dispo = feedsChoisis.length > 0 ? feedsChoisis : feeds;
  const fourrages = dispo.filter((f) => estFourrage(f));
  const concentres = dispo.filter((f) => estConcentre(f) || f.famille === "racine");
  const mineraux = dispo.filter((f) => f.famille === "mineral");

  // Fourrage principal : le meilleur compromis énergie / prix par kg MS
  const fourrageBase =
    [...fourrages]
      .filter((f) => f.famille !== "paille")
      .sort((a, b) => coutParUFV(a) - coutParUFV(b))[0] ?? fourrages[0];
  const paille = fourrages.find((f) => f.famille === "paille");

  const energetique = [...concentres]
    .filter((f) => f.ufv >= 0.9 && f.pdi < 140)
    .sort((a, b) => coutParUFV(a) - coutParUFV(b))[0];
  const azote = [...concentres]
    .filter((f) => f.pdi >= 130)
    .sort((a, b) => coutParPDI(a) - coutParPDI(b))[0];

  let lignes: LigneRation[] = [];
  if (!fourrageBase) return lignes;
  // Fourrage sec à brins longs : jamais de ration sans foin ni paille
  const secs = fourrages.filter((f) => estFourrageSec(f));
  const fourrageSec =
    paille ?? secs.sort((a, b) => coutParUFV(a) - coutParUFV(b))[0] ?? undefined;
  const fourrageFibre = fourrageSec ?? fourrageBase;
  const minSec = SEUILS.fourrageSecMinOrange + 0.2;

  // 1. Base fourragère : ~85 % de l'appétit en encombrement, dont le fourrage sec réservé
  const cibleUeb = besoins.ci * 0.85;
  if (fourrageSec && !estFourrageSec(fourrageBase)) {
    const uebSec = minSec * fourrageSec.ueb;
    lignes = [
      { feedId: fourrageBase.id, kgMS: round2(Math.max(0.5, (cibleUeb - uebSec) / fourrageBase.ueb)) },
      { feedId: fourrageSec.id, kgMS: round2(minSec) },
    ];
  } else {
    lignes = [{ feedId: fourrageBase.id, kgMS: round2(cibleUeb / fourrageBase.ueb) }];
  }

  // 2. Ajout du concentré énergétique tant qu'il manque de l'énergie et que c'est sûr
  const pas = 0.2;
  if (energetique) {
    for (let i = 0; i < 80; i++) {
      const a = calculerApports(lignes, feeds, ctx.pv);
      if (a.ufv >= besoins.ufv) break;
      const essai = incrementer(lignes, energetique.id, pas);
      if (!sur(ctx, essai, besoins.ci)) {
        // pas de marge de sécurité : on rend de la place en retirant du fourrage humide
        const allege = incrementer(lignes, fourrageBase.id, -0.4);
        const essai2 = incrementer(allege, energetique.id, pas);
        if (sur(ctx, essai2, besoins.ci) && calculerApports(allege, feeds, ctx.pv).ms > 2) {
          lignes = essai2;
          continue;
        }
        break;
      }
      lignes = essai;
    }
  }

  // 3. Correcteur azoté, seulement si le besoin n'est pas déjà couvert, sans dépasser le plafond
  const plafondPdi = besoins.pdi * 1.1;
  if (azote) {
    for (let i = 0; i < 30; i++) {
      const a = calculerApports(lignes, feeds, ctx.pv);
      if (a.pdi >= besoins.pdi) break;
      const essai = incrementer(lignes, azote.id, 0.1);
      if (!sur(ctx, essai, besoins.ci, plafondPdi)) break;
      lignes = essai;
    }
  }

  // 3 bis. Excès d'azote : on remplace l'aliment le plus azoté par le moins azoté disponible
  const substituts = [...dispo]
    .filter((f) => f.famille !== "mineral" && f.ufv > 0.3)
    .sort((a, b) => a.pdi - b.pdi);
  for (let i = 0; i < 40; i++) {
    const a = calculerApports(lignes, feeds, ctx.pv);
    if (a.pdi <= plafondPdi) break;
    const cibles = lignes
      .filter((l) => l.kgMS > 0.6)
      .map((l) => ({ l, f: feeds.find((x) => x.id === l.feedId) }))
      .filter((x) => x.f && !estFourrageSec(x.f) && x.f.famille !== "mineral");
    // On cherche l'échange à énergie constante qui retire le plus d'azote
    let meilleur: { lignes: LigneRation[]; pdi: number } | null = null;
    for (const { l, f } of cibles) {
      if (!f) continue;
      const retire = Math.min(0.5, round2(l.kgMS));
      for (const sub of substituts) {
        if (sub.id === f.id) continue;
        const ajout = round2((retire * f.ufv) / sub.ufv);
        const essai = incrementer(incrementer(lignes, f.id, -retire), sub.id, ajout);
        const ae = calculerApports(essai, feeds, ctx.pv);
        if (!sur(ctx, essai, besoins.ci)) continue;
        if (ae.ufv < besoins.ufv * 0.97) continue;
        if (ae.pdi >= a.pdi - 1) continue;
        if (!meilleur || ae.pdi < meilleur.pdi) meilleur = { lignes: essai, pdi: ae.pdi };
      }
    }
    if (!meilleur) break;
    lignes = meilleur.lignes;
  }

  // 4. Sécurité fibre : foin/paille tant que les brins longs manquent
  for (let i = 0; i < 24; i++) {
    const a = calculerApports(lignes, feeds, ctx.pv);
    if (
      a.peNdf > SEUILS.peNdfMinOrange &&
      a.ndfFourrage > SEUILS.ndfFourrageMinOrange &&
      a.ndf > SEUILS.ndfMinOrange &&
      a.msFourrageSec >= minSec
    )
      break;
    if (a.ueb > besoins.ci) {
      // plus de place : on fait de la place en retirant du fourrage humide
      if (a.msFourrageSec >= minSec || estFourrageSec(fourrageBase)) break;
      const allege = incrementer(lignes, fourrageBase.id, -0.5);
      if (calculerApports(allege, feeds, ctx.pv).ms < 2) break;
      lignes = incrementer(allege, fourrageFibre.id, 0.3);
      continue;
    }
    lignes = incrementer(lignes, fourrageFibre.id, 0.3);
  }

  // 5. Minéraux : CMV adapté au profil de la ration
  const a = calculerApports(lignes, feeds, ctx.pv);
  const cmv =
    a.partConcentre > 45
      ? (mineraux.find((f) => f.id === "cmv_20_5") ?? mineraux[0])
      : (mineraux.find((f) => f.id === "cmv_5_25") ?? mineraux[0]);
  if (cmv) lignes = incrementer(lignes, cmv.id, 0.15);

  return lignes.filter((l) => l.kgMS > 0.01);
}

function coutParUFV(f: Feed): number {
  const coutKgMS = f.prix / 1000 / (f.ms / 100);
  return f.ufv > 0 ? coutKgMS / f.ufv : 999;
}

function coutParPDI(f: Feed): number {
  const coutKgMS = f.prix / 1000 / (f.ms / 100);
  return f.pdi > 0 ? coutKgMS / (f.pdi / 1000) : 999;
}

function incrementer(lignes: LigneRation[], feedId: string, delta: number): LigneRation[] {
  const existe = lignes.find((l) => l.feedId === feedId);
  if (existe) {
    return lignes.map((l) =>
      l.feedId === feedId ? { ...l, kgMS: round2(Math.max(0, l.kgMS + delta)) } : l,
    );
  }
  return delta > 0 ? [...lignes, { feedId, kgMS: round2(delta) }] : lignes;
}

/** Une ration est « sûre » si aucun indicateur de sécurité fermentaire n'est rouge/orange haut */
function sur(ctx: Contexte, lignes: LigneRation[], ci: number, plafondPdi?: number): boolean {
  const a = calculerApports(lignes, ctx.feeds, ctx.pv);
  if (a.ueb > ci) return false;
  if (plafondPdi != null && a.pdi > plafondPdi) return false;
  if (a.partConcentre > SEUILS.concentreOrange) return false;
  // Bio : au moins 60 % de fourrage dans la MS (règlement UE 2018/848)
  if (a.ms > 0 && a.partFourrage < SEUILS.bioFourrageMinOrange) return false;
  if (a.amidon > SEUILS.amidonOrange) return false;
  if (a.amidonRapide > SEUILS.amidonRapideOrange) return false;
  if (a.sucres > SEUILS.sucresOrange) return false;
  if (a.ndf < SEUILS.ndfMinOrange) return false;
  if (a.peNdf < SEUILS.peNdfMinOrange) return false;
  return true;
}

/** Applique en boucle les corrections proposées jusqu'à lever les blocages */
export function corrigerAutomatiquement(ctx: Contexte, lignes: LigneRation[]): LigneRation[] {
  let courant = lignes;
  for (let i = 0; i < 12; i++) {
    const d = diagnostiquer(ctx, courant);
    if (!d.bloquant) return courant;
    const c = d.corrections[0];
    if (!c) return courant;
    courant = c.appliquer(courant);
  }
  return courant;
}

export function nomAliment(feeds: Feed[], id: string): string {
  return feedById(feeds, id)?.nom ?? id;
}

