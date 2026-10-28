# Refonte visuelle et pointage illustré — 28 octobre 2026

La maquette du tableau de bord guide la disposition : navigation bleu nuit, bandeau rural, indicateurs, accès rapides, graphique, actions et panneaux de bovins/lots. La fiche individuelle dispose désormais de rubriques Suivi, Pointages, Pesées, Sanitaire et Ration. Les modules non connectés restent explicitement indiqués.

Le bandeau est une illustration décorative générée avec l’outil intégré, sans appel à Lovable ni à une API externe facturée. Fichier : `public/pasture-banner.webp`. Prompt : photographie panoramique de bovins Limousins dans une prairie française, haies et bâtiment rural, espace sombre à gauche pour le titre, sans texte ni logo. Ce visuel ne représente pas les animaux réels de l’atelier.

Chaque poste propose la planche correspondante du manuel fourni, agrandissable et ouvrable en plein écran. 37 pages ont été rendues en WebP, y compris les descriptions complémentaires d’aplombs. Source : *Guide pratique du pointage des bovins de race à viande*, Institut de l’Élevage, février 2014, référence 0014201001. Les planches conservent les dessins et repères originaux ; aucun dessin anatomique génératif n’a été substitué au manuel. Le script `scripts/render-manual.py` permet de reproduire ces rendus depuis le PDF fourni. Les droits du document source restent ceux de ses auteurs.

Les indicateurs ignorent les poids inconnus, affichent les données réellement connues et ne simulent ni taux de conformité BIO ni traitements en cours. Le graphique présente l’historique d’un animal sélectionné, pas une fausse courbe moyenne de lots de compositions variables. L’objectif est une ligne horizontale correspondant au poids cible saisi. Le rappel de pesée utilise un seuil explicite de 30 jours.

Validation : 12 tests unitaires ; compilation Vite/PWA ; parcours Chromium, tableau de bord et pointage aux largeurs 320/375/768/1280/1440 px ; consultation des cinq rubriques de fiche ; agrandissement d’une planche ; historique et données annexes conservés ; échec d’écriture simulé ; rechargement hors ligne et disponibilité d’une planche après mise en cache. Captures ordinateur et mobile inspectées. Safari/iPhone matériel non testé.

Le poids connu peut différer de l’ancien écran lorsqu’un animal n’a aucun poids : « — » remplace désormais le zéro artificiel. Aucune migration de stockage ni suppression de données. Les raccourcis demandent de choisir l’animal lorsqu’il y en a plusieurs.
