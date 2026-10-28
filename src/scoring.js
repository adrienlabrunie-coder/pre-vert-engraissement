export const criteria=[{group:'Conformation',items:[['ARC','Arrondi de culotte','Profil de la cuisse : concave (2), rectiligne (5), convexe (8).'],['DEE',"Dessus d’épaule",'Écartement des omoplates vu en surplomb.'],['EPD','Épaisseur du dessus','Musculature des reins et de l’aloyau.'],['LAC','Largeur de culotte','Largeur de la musculature arrière.'],['LAD','Largeur du dos','Largeur musculaire derrière les omoplates.'],['LOC','Longueur de culotte','De la pointe des fesses au-dessus du jarret.']]},{group:'Format',items:[['DEV','Développement','Taille comparée à la race et à l’âge.'],['GRC','Grosseur du canon','Diamètre du canon antérieur.'],['INB','Inclinaison du bassin','Angle du bassin : optimum intermédiaire.'],['LAH','Largeur aux hanches','Largeur du bassin aux hanches.'],['LAI','Largeur aux ischions','Largeur aux pointes des ischions.'],['LAT','Largeur aux trochanters','Largeur du bassin aux trochanters.'],['LAP','Largeur de poitrine','Largeur de l’avant-main.'],['LOB','Longueur du bassin','Distance longitudinale du bassin.'],['LOD','Longueur du dessus','Longueur du dos.'],['PRF','Profondeur de flanc','Profondeur du flanc.'],['PRP','Profondeur de poitrine','Profondeur thoracique.']]},{group:'Fonctionnalité',items:[['ANS','Angle du sabot','Angle du pied.'],['AAV','Aplombs avant','Observer les membres antérieurs.'],['AAR','Aplombs arrière','Observer les membres postérieurs.'],['EPT','Épaisseur du talon','Épaisseur du talon.'],['LAM','Largeur de mufle','Largeur du mufle.'],['LCO','Locomotion','Qualité de déplacement.'],['LOS','Longueur du sabot','Longueur de l’onglon.'],['PAS','Passage de sangle','Observation derrière les membres antérieurs.'],['RED','Rectitude du dessus','Rectitude de la ligne dorsale.']]},{group:'État',items:[['ETA','État corporel','Couverture graisseuse et état d’engraissement.']]}];

// Repères reformulés du guide Idele, février 2014. Pages imprimées du manuel.
export const guidance = {
  ARC: [23, 'De profil, regarder toute la courbure entre la pointe des fesses et le jarret.', '2 : concave · 5 : rectiligne · 8 : convexe. Ne pas juger uniquement le haut de la culotte.'],
  DEE: [24, 'En surplomb, de préférence depuis l’arrière : écart entre les omoplates.', '2 : écart faible, apophyse saillante · 5 : écart moyen · 8 : écart important, apophyse masquée.'],
  EPD: [25, 'De profil droit, apprécier la musculature des reins, en avant des hanches.', '2 : relief osseux saillant · 5 : légère épaisseur · 8 : muscles épais formant une gouttière.'],
  LAC: [26, 'De derrière, largeur totale à mi-hauteur de la cuisse.', '2 : étroite · 5 : moyenne · 8 : large. Comparer à la largeur aux trochanters.'],
  LAD: [27, 'En surplomb depuis l’arrière, largeur musculaire derrière les omoplates.', '2 : très resserré · 5 : moyen · 8 : très large. Comparer au dessus d’épaule, sans confondre largeur et épaisseur.'],
  LOC: [28, 'De derrière, de la pointe des fesses à l’attache du muscle au-dessus du jarret.', '2 : courte · 5 : moyenne · 8 : longue. Ne pas intégrer l’arrondi ou l’inclinaison du bassin.'],
  DEV: [31, 'De profil et au même niveau que l’animal : hauteur au garrot et canons avant.', '1–3 : petit · 8–10 : grand. Référence de race et d’âge indispensable ; considérer aussi le sexe et le potentiel de développement.'],
  GRC: [32, 'De profil, diamètre à mi-longueur du canon antérieur droit.', '2 : fin · 5 : moyen · 8 : épais. Attention au poil et aux effets de perspective.'],
  INB: [33, 'De profil à l’arrêt, angle hanches–pointes des fesses par rapport à l’horizontale.', '1 : renversé · 3 : horizontal · 5 : légèrement incliné · 7 : nettement incliné · 9 : très incliné. Optimum intermédiaire.'],
  LAH: [34, 'De derrière, distance entre les pointes des hanches.', '2 : serrées · 5 : moyennes · 8 : larges. Comparer au dessus d’épaule et aux trochanters.'],
  LAI: [35, 'De derrière, écart entre les faces externes des pointes des fesses.', '2 : très serrés · 5 : moyens · 8 : larges. Un excès d’état gêne l’appréciation.'],
  LAT: [36, 'De derrière, écart entre les trochanters, en incluant la musculature.', '2 : très serrés · 5 : moyens · 8 : larges. Comparer aux hanches et au dessus d’épaule.'],
  LAP: [37, 'De trois quarts arrière puis de devant, ouverture derrière les omoplates.', '2 : très serrée · 5 : moyenne · 8 : large. Attention aux épaules décollées et aux aplombs cagneux.'],
  LOB: [38, 'De profil, distance horizontale entre pointe de hanche et pointe de fesse.', '2 : court · 5 : moyen · 8 : long. Comparer à la longueur du dessus sans intégrer l’arrondi de culotte.'],
  LOD: [39, 'De profil, distance entre l’arrière de l’omoplate et la pointe de hanche.', '2 : court · 5 : moyen · 8 : long. Comparer au développement ; ne pas pénaliser un défaut de rectitude ici.'],
  PRF: [40, 'De profil, ligne du dessous et pli du grasset, en faisant abstraction de la mamelle.', '2 : relevé · 5 : moyennement profond · 8 : profond. Comparer à la profondeur de poitrine. La fiche du guide mentionne un optimum intermédiaire sans le chiffrer.'],
  PRP: [41, 'De profil, hauteur thoracique au passage de sangle, sans compter le fanon.', '2 : faible · 5 : moyenne · 8 : profonde. Attention au sol, au poil et au format de l’animal.'],
  ANS: [45, 'Sur le pied arrière droit, de profil et de derrière, angle du devant du sabot.', '1 : très fermé · 3 : fermé · 5 : normal · 7 : ouvert · 9 : très ouvert.'],
  AAV: [46, 'De face et de trois quarts arrière, de l’épaule au sabot, à l’arrêt puis en marche.', '1–5 : défaut à codifier · 6–7 : correct · 8–9 : bon · 10 : parfait, vérifié à l’arrêt et en marche.'],
  AAR: [50, 'De profil et de derrière, du bassin au sabot, à l’arrêt puis en marche.', '1–5 : défaut à codifier · 6–7 : correct · 8–9 : bon · 10 : parfait, vérifié à l’arrêt et en marche.'],
  EPT: [54, 'Sur le pied arrière droit, de profil et de derrière, hauteur du talon.', '1 : très faible · 3 : faible · 5 : normale · 7 : bonne · 9 : très bonne. Tenir compte de l’âge et de la conduite.'],
  LAM: [55, 'De face, largeur totale du mufle au niveau des naseaux.', '2 : très étroit · 5 : moyen · 8 : très large. Ne pas se laisser influencer par la longueur de la tête.'],
  LCO: [56, 'Observer l’animal en déplacement sur un sol permettant une marche normale.', '2 : démarche très hésitante · 5 : normale · 8 : franche. Une blessure ou le sol peuvent fausser l’observation.'],
  LOS: [57, 'De profil, longueur du sabot arrière droit.', '1 : très court · 3 : court · 5 : normal · 7 : long · 9 : très long. Prendre en compte un éventuel parage.'],
  PAS: [58, 'De profil et de trois quarts arrière, creux derrière l’épaule.', '2 : manque de soudure · 5 : soudure moyenne · 8 : bien soudé. L’état corporel peut influencer la note.'],
  RED: [59, 'De profil, écart à la droite garrot–sacrum ; confirmer en mouvement sur sol horizontal.', '2 : défaut marqué · 5 : défaut léger · 8 : dos rectiligne · 10 : parfait à l’arrêt et en marche. Ne pas noter l’horizontalité.'],
  ETA: [69, 'Observer côtes, dépôts autour de la queue et aspect du poil.', '2 : maigre, côtes visibles, creux autour de la queue · 5 : dépôts modérés · 8 : dépôts importants, côtes masquées · 10 : très gras. Évaluer indépendamment des autres postes.'],
  DPJ: [63, 'De profil, position du plancher de mamelle par rapport à la pointe du jarret ; retenir le quartier le plus bas.', '1 : très haute · 3 : nettement au-dessus · 5 : légèrement au-dessus · 7 : au niveau du jarret · 9 : bien en dessous. Optimum intermédiaire.'],
  EQQ: [64, 'De trois quarts avant, position des quartiers avant par rapport aux quartiers arrière.', '1 : fortement basculée vers l’arrière · 3 : vers l’arrière · 5 : horizontale · 7 : vers l’avant · 9 : fortement vers l’avant. Optimum intermédiaire.'],
  GRT: [65, 'De profil puis de derrière, diamètre du plus gros trayon.', '1 : très fin · 3 : fin · 5 : normal · 7 : gros · 9 : très gros. Considérer l’âge, le rang et la date du vêlage.'],
  LOT: [66, 'De profil puis de derrière, longueur du trayon le plus long.', '1 : très court · 3 : court · 5 : normal · 7 : long · 9 : très long. Considérer l’âge, le rang et la date du vêlage.'],
};
criteria.splice(3, 0, {group:'Mamelle', items:[['DPJ','Distance plancher/jarret'],['EQQ','Équilibre des quartiers'],['GRT','Grosseur des trayons'],['LOT','Longueur des trayons']]});
export const defects = {
  AAV: [['avca','Cagneux'],['avlj','Longs jointés'],['avpa','Panards']],
  AAR: [['arco','Coudés'],['ardl','Jarret derrière lui'],['arjd','Jarret droit'],['arlj','Longs jointés'],['arca','Cagneux'],['arpa','Panards']],
};
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function validateScore(score, animal = {}, now = localDate()) {
  const errors = [];
  const date = score.date || '';
  const parsed = new Date(date+'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10)!==date) errors.push('Choisissez une date valide.');
  else if (date > now || (animal.birth && date < animal.birth)) errors.push('La date doit être comprise entre la naissance et aujourd’hui.');
  const values = score.values || {};
  if (!Object.keys(values).length) errors.push('Renseignez au moins un poste.');
  for (const [code, value] of Object.entries(values)) {
    if (!guidance[code] || !Number.isInteger(value) || value < 1 || value > 10) errors.push(`${code} : choisissez une note entière de 1 à 10.`);
    if (defects[code]) {
      const chosen = score.defects?.[code] || [];
      if (chosen.some(d=>!defects[code].some(([key])=>key===d))) errors.push(`${code} : défaut inconnu.`);
      if (value < 6 && !chosen.length) errors.push(`${code} : indiquez le défaut observé pour une note inférieure à 6.`);
      if (score.multipleDefects?.[code] && (chosen.length < 2 || value > 3)) errors.push(`${code} : plusieurs défauts marquants sur un même membre exigent au moins deux codes et une note maximale de 3.`);
      if (value === 10 && !score.movementConfirmed?.[code]) errors.push(`${code} : confirmez l’observation complète à l’arrêt et en marche pour attribuer 10.`);
    }
  }
  return errors;
}
export function appendScore(animals, animalId, score) {
  if (!animals.some(a=>a.id===animalId)) throw new Error('Bovin introuvable.');
  return animals.map(a=>a.id===animalId?{...a,scores:[...(a.scores||[]),score]}:a);
}
