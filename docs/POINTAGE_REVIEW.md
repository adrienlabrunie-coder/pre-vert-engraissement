# Pointage guidé — revue avant fusion

Date : 28 octobre 2026. Base examinée : `117e2ac` (branche `main`).
Branche de travail : `feat/pointage-guide-historique`.

## Architecture et état constaté

Application React 18 / Vite 5, sans serveur de données ni authentification. `src/main.jsx` porte les écrans et les mutations ; `src/style.css` porte l’identité graphique. `vite-plugin-pwa` génère le manifeste et le service worker. Les logos existants sont conservés.

| Module | État dans le dépôt initial |
| --- | --- |
| Bovins | Création, modification et fiche individuelle |
| Lots | Création, affectation via fiche bovin, bâtiment et case en texte |
| Pesées | Dates, poids, courbe, historique, GMQ et progression |
| Sanitaire | Saisie et affichage de traitements, sans validation réglementaire |
| Pointage | 27 postes, boutons de notes, date du jour uniquement ; historique limité au nombre de postes |
| Sauvegarde | Export/import JSON ; stockage local uniquement |
| Rations et OCR | Emplacements / annonces de fonctions futures, non implémentées |

L’audit est fondé sur le code actuel du dépôt, pas sur une version Lovable supposée ni sur les données personnelles du navigateur de l’utilisateur.

## Modifications

- Module de règles `src/scoring.js` et composants `src/Scoring.jsx` séparés de l’application principale.
- Préparation, familles de critères, récapitulatif et sauvegarde explicite.
- Date locale choisie et validée, pointeur, stade, contexte, observations générales et par poste.
- 31 postes du guide : conformation, format, fonctionnalité, mamelle en option pour les femelles, état.
- Repères de notation et positions d’observation reformulés, avec pages du manuel.
- Notes entières de 1 à 10, sans note par défaut ni total de « qualité ». Pointage partiel autorisé.
- Aplombs : défaut codifié sous 6 ; plusieurs défauts marquants sur le même membre nécessitent au moins deux codes et une note ≤ 3 ; note 10 conditionnée à l’observation à l’arrêt et en marche.
- Historique individuel dépliable, trié par date, avec détail des notes, observations et défauts.
- Confirmation d’abandon ; avertissement de fermeture d’onglet lorsque le navigateur le permet ; échec d’écriture signalé sans fermer la saisie.
- Boutons tactiles de 44 px de haut ; grille sur cinq colonnes sur petit écran ; correction de l’en-tête à 320 px.
- Lockfile pour installer les dépendances de façon reproductible, tests unitaires et navigateur.

## Référence métier

*Guide pratique du pointage des bovins de race à viande, du sevrage à l’âge adulte*, Institut de l’Élevage, février 2014, référence 0014201001, fourni dans le projet.

Pages imprimées 18–19 : principes ; 23–28 : conformation ; 31–41 : format ; 45–59 : fonctionnalité ; 63–66 : mamelle ; 69 : état. Les grilles d’aplombs ont été également vérifiées sur le rendu de la page 46.

Le résumé général du manuel cite trois postes à optimum intermédiaire (INB, DPJ, EQQ). La fiche PRF, page 40, emploie aussi cette mention sans en chiffrer l’optimum : l’aide signale cette particularité sans inventer de cible. Les notes ne sont donc pas agrégées en un indicateur de qualité.

Le manuel complet et ses illustrations ne sont pas redistribués dans le dépôt. Le module fournit des aides, pas une habilitation ni un pointage officiellement certifié.

## Compatibilité des données

Clés `pv_animals` et `pv_lots` inchangées. Structure historique `{id, date, values}` conservée ; nouveaux champs additifs : `schemaVersion: 2`, `reference`, `createdAt`, `animalContext`, `observer`, `stage`, `context`, `notes`, `observations`, `defects`, `multipleDefects`, `movementConfirmed`.

Aucune migration, renumérotation ou normalisation des anciens pointages. Les anciennes notes sont affichées telles quelles, y compris les codes inconnus. Les champs supplémentaires des bovins, pesées et traitements sont conservés lors de l’ajout. L’enveloppe de sauvegarde JSON reste en version 1, avec les nouvelles propriétés imbriquées.

L’écriture du nouveau pointage dans `localStorage` doit réussir avant fermeture du formulaire. Cette protection est propre à ce parcours ; l’ancien système global de chargement/import n’a pas été entièrement durci contre des sauvegardes malformées ou un stockage déjà corrompu.

La compatibilité a été vérifiée sur des données de test représentatives ; les données réelles de l’utilisateur ne sont pas accessibles ici. Avant utilisation, exporter une sauvegarde. Le stockage reste lié à l’origine du site : changer de port, d’hôte ou de protocole ne transfère pas les données.

## Résultats des contrôles

- `npm test` : **9 tests réussis**, couvrant les notes, dates, règles d’aplombs et l’ajout non destructif avec aller-retour JSON.
- `npm run build` : **réussi**, assets et service worker générés.
- `npm run test:browser` : **réussi** sous Chromium, avec parcours de saisie, refus des aplombs incomplets, mamelle, historique antérieur, persistance après rechargement, abandon confirmé/annulé et simulation de quota dépassé.
- Largeurs **320, 375, 768 et 1280 px** : pas de débordement horizontal de la page ou de la boîte de dialogue ; cibles de notation contrôlées.
- Captures mobile et ordinateur examinées visuellement.
- `TEST_PRODUCTION=1 npm run test:browser` : **réussi**, incluant le rechargement hors ligne après installation du service worker.
- Aucune erreur JavaScript de page dans ces parcours.
- `git diff --check` : réussi.

Avertissement non bloquant de compilation : bundle principal d’environ 577 kB minifié, au-dessus du seuil Vite de 500 kB. La séparation des graphiques en chargement différé reste une optimisation future. Les essais Chromium ne remplacent pas une recette sur un vrai iPhone/Safari ni une vérification métier avec un pointeur.

## Avant fusion

Relire les repères métier et essayer un pointage sur un jeu de sauvegarde copié. Vérifier la prise en main sur les appareils habituels. Aucun déploiement ni aucune fusion dans `main` n’est réalisé par cette modification. Aucun code généré avec Lovable et aucun achat ou service payant engagé.
