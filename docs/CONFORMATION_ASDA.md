# Conformation complète, état et lecture ASDA

Cette évolution remplace le parcours à quatre postes pour les nouveaux pointages. Les historiques restent inchangés.

## Pointage

Les six postes du chapitre II.1 du manuel Idele 2014 sont proposés dans son ordre : ARC (arrondi de culotte), DEE (dessus d’épaule), EPD (épaisseur du dessus), LAC (largeur de culotte), LAD (largeur du dos), LOC (longueur de culotte). ETA, chapitre II.5, complète le parcours. Notes entières de 1 à 10, observations datées, possibilité de laisser un poste non observé, au moins une note requise. Pas de moyenne réunissant musculature et engraissement, ni de conversion EUROP.

Protocole `prevert-conformation-etat-7-v1`, schéma 4. Les historiques du protocole à quatre postes et les pointages plus anciens restent affichés avec leurs codes originaux. Chaque poste dispose d’une image propre dans `public/scoring/{code}.webp`, mise en cache PWA, et de la planche correspondante du manuel (23 à 28, 69).

Les sept images ont été générées séparément avec l’outil intégré imagegen, sans Lovable ni API externe facturée. Elles localisent les zones de façon indicative et ne sont pas des étalons de notation. Le texte et les planches du manuel restent la référence. Prompt commun : photographie agricole naturelle d’un bovin Limousin adulte, proportions normales, prairie, zone anatomique soulignée par une légère surimpression verte, sans texte ni note ni collage. Consignes par poste : profil et contour complet de cuisse pour ARC ; surplomb depuis l’arrière et espace entre omoplates pour DEE ; profil droit et région lombaire en avant des hanches pour EPD ; arrière, largeur totale à mi-hauteur des cuisses pour LAC ; surplomb arrière et largeur derrière les omoplates pour LAD ; arrière et longueur de cuisse de la fesse à l’attache au-dessus du jarret pour LOC ; côtes, attache de queue et fanon pour ETA.

## ASDA et races

Source de structure consultée le 28 octobre 2026 : https://www.frgdsaura.fr/frgds_rhone-alpes_98_634_4530_utiliser-une-douchette-lecteur-code-barre.html . La page distingue les anciens formats et le format 2007. Le PDF historique lié n’a pas fourni la note ministérielle attendue ; l’implémentation se fonde sur le tableau de la page, sans prétendre à une certification de tous les documents actuels.

Le nouveau parseur reconnaît strictement les 60 caractères décodés du format 2007 (14 caractères textuels, 46 chiffres). Le changement de mode Code 128 relève de la symbologie et ne fait pas partie du texte reçu. Pour un identifiant français reconnu, il propose numéro, naissance, sexe, race sujet, race père puis race mère. Il contrôle longueur, espaces de remplissage, date réelle non future, sexe et zones réservées connues. Les code-barres à identifiant seul et les anciens formats de 38 caractères conservent le comportement limité au numéro. Les autres pays restent en saisie manuelle. Aucun statut sanitaire actuel n’est déduit du document.

Le référentiel `src/breed-codes.js` transcrit les 74 entrées de l’annexe du PDF fourni : arrêté du 25 septembre 2018, JORFTEXT000037457981. Il est étiqueté comme référentiel 2018, sans prétendre constituer la liste réglementaire actualisée. Un code 00 reste inconnu ; un code absent produit un avertissement et aucune race inventée. Des suggestions de noms sont également proposées dans la saisie manuelle.

Le décodage reste local, sans IA ni envoi de photo. Une confirmation de l’identité puis des données ASDA est requise. Modifier le numéro dans le scanner invalide les autres données préremplies. Aucun bovin n’est créé avant validation de sa fiche. Les données d’exploitation contenues dans le code ne sont pas enregistrées.

## Bug et validation

La capture reçue montre les libellés tronqués dans l’ancien menu natif de sélection d’aliments sur Windows/Chrome. Ce menu a déjà été remplacé par le catalogue intégré recherchable dans la PR 6. Le parcours de ration reste testé dans cette évolution.

31 tests de logique réussis, build Vite/PWA réussi, parcours Chromium pointage en production avec les sept images hors ligne et conservation de l’ancien historique, scanner sur vrai code-barres synthétique puis ASDA saisie avec confirmation et champs préremplis, ration aux quatre largeurs. Les photographies générées ont été inspectées, ainsi que le rendu mobile du parcours. Tests sur appareils physiques et lecture d’une ASDA réelle au format 2007 à réaliser ; aucune image de passeport privé n’est publiée dans le dépôt. Avertissement préexistant de taille du bundle JavaScript, sans erreur de compilation.
