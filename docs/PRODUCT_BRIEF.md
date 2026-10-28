# Pré Vert Engraissement — cible fonctionnelle et visuelle

Référence utilisateur du 28 octobre 2026. Ce document décrit la cible, pas des fonctionnalités déjà livrées.

## Références graphiques

Les visuels du projet « Tableau de bord d’élevage bovin bio », « Gestion d’élevage bovin au Pré Vert » et « Icône bio d’élevage bovin rural » constituent les références : bleu nuit, vert Pré Vert, cartes claires, bandeau rural illustré, navigation latérale sur ordinateur, présentation compacte sur mobile, fiches à onglets et cartes de pointage illustrées.

La version actuelle conserve le logo et les couleurs, mais ne reproduit pas encore fidèlement ces maquettes. Restent notamment le bandeau photographique, les illustrations anatomiques du pointage et les onglets de fiche. Les nombres et résultats des maquettes sont des exemples : les indicateurs devront être calculés sur les données réelles. Les notes restent sur 10 conformément au besoin et au manuel, même si la maquette affiche une échelle sur 9. Aucun score global de qualité ni indicateur « conformité BIO : OK » ne doit être déduit sans règle métier vérifiée.

## Parcours cible

1. Créer un bovin manuellement ou depuis son passeport : numéro, races du sujet/père/mère, naissance, sexe et poids d’entrée. Le scan doit proposer une extraction à vérifier avant enregistrement, avec contrôle des doublons.
2. Fiche individuelle avec suivi d’engraissement, pesées, pointages datés, sanitaire, ration et lot/emplacement.
3. Pointage en fenêtre guidée : étapes visuelles, explications conformes au manuel Idele, notes et observations, historique physiologique individuel.
4. Pesées datées, idéalement mensuelles : courbe, GMQ, objectifs et repérage des pesées à réaliser.
5. Lots et emplacements permettant de retrouver facilement un animal. Vue des bâtiments à construire à partir des emplacements réels.
6. Rations individuelles ou de lot, en réutilisant le moteur existant de rationnement et ses objectifs.
7. Sanitaire : traitements, accès aux données médicamenteuses, délais viande et autres durées distinctement définies, règles BIO vérifiées et traçables.

## État et dépendances

| Élément | État / prochaine dépendance |
| --- | --- |
| Création manuelle, fiches, pesées, lots, traitements | Présents dans le dépôt ; ergonomie à aligner sur les maquettes |
| Pointage guidé et historique | Développés dans la PR de pointage ; illustrations anatomiques encore à réaliser |
| Scan des passeports | À développer ; extraction et validation humaine nécessaires |
| Farm Animal Manager | Projet cité ; dépôt source non identifié parmi les dépôts recherchés sous ce nom |
| Rationnement | Dépôt privé `adrienlabrunie-coder/ration-pre-vert` retrouvé ; candidat à examiner pour réutilisation, équivalence avec « Beef Ration Planner » non encore confirmée par audit |
| DMV | URL fournie : https://www.lepointveterinaire.fr/dmv/recherche ; lecture automatisée refusée (403) lors de cette session ; API, export et conditions d’accès non confirmés |
| Règles BIO et délais | Moteur à concevoir à partir de sources officielles à jour, des données du médicament et du traitement ; aucune règle réglementaire nouvelle implémentée à ce stade |

## Contraintes

PWA pour ordinateur, tablette, Android et iPhone. Préserver les données locales existantes et les sauvegardes. Pas de génération Lovable, pas de dépenses sans accord. Développement sur branches dédiées, tests et présentation des changements avant fusion. Les illustrations métier doivent rester exactes ; une image de maquette ne constitue pas une référence anatomique ou réglementaire.
