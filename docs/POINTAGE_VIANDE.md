# Pointage viande et catalogue des aliments

28 octobre 2026 — branche `feat/pointage-viande-visuel`.

Le nouveau parcours propose quatre postes, chacun sur 1 à 10, sans critères de race, de mamelle ou d’aplombs. Un poste non observé reste vide ; au moins une note est requise. La date, le pointeur, le contexte et les observations par poste restent enregistrés. Aucun total musculature/état ni conversion EUROP n’est calculé.

| Zone de l’interface | Caractère effectivement observé | Manuel Idele 2014 |
| --- | --- | --- |
| Culotte | ARC, arrondi de culotte (pas sa largeur ni sa longueur) | p. 23 |
| Dos | EPD, épaisseur du dessus (pas la largeur du dos) | p. 25 |
| Épaule | DEE, dessus d’épaule | p. 24 |
| Note d’état | ETA, état d’engraissement, indépendant des trois autres | p. 69 |

Le protocole applicatif est identifié `prevert-viande-4-v1`, schéma 3. Les anciens pointages restent intégralement lisibles, y compris les codes anciens inconnus. Pas de migration ni suppression de notes. Les nouveaux enregistrements utilisent les mêmes mécanismes de sauvegarde locale et de synchronisation que les événements existants.

Ces quatre observations décrivent le vivant à une date donnée. Leur fiabilité supérieure à EUROP n’est pas démontrée. Un rapprochement quantitatif nécessitera des résultats de carcasse réels et appariés aux animaux, puis une validation métier ; aucune équivalence n’est inventée dans cette version.

## Visuels

`public/meat-zones.webp` : une planche générée par l’outil intégré, affichée par cadrage CSS en quatre vues. Prompt de production : quatre panneaux égaux, même bovin Limousin adulte de proportions normales dans une prairie ; vue arrière trois quarts soulignant la culotte entre fesse et jarret ; vue élevée arrière soulignant les muscles lombaires en avant des hanches ; vue en surplomb soulignant l’espace entre les omoplates ; vue latérale soulignant côtes et attache de queue. Surimpressions vertes légères, sans texte, sans échelle de notes, sans musculature exagérée. Ton photographique naturel compatible avec le bleu nuit et le vert du projet.

`public/ration-banner.webp` : photo décorative générée par l’outil intégré. Prompt de production : bandeau panoramique 3:1 d’une ferme bovine française, Limousines mangeant du foin dans une auge propre sous un bâtiment ouvert en bois, prairie au fond, lumière naturelle, espace sombre à gauche pour le titre, sans personne, texte ni logo. Ce visuel n’est pas une recette de ration.

Aucun appel à Lovable ni à une API externe facturée. Les illustrations ne représentent pas les animaux réels. Les repères normatifs restent ceux du manuel, accessible à chaque étape. Deux fichiers de planches vides déjà présents dans le dépôt (35 et 69) ont été restaurés depuis le PDF fourni. Les nouveaux visuels sont inclus dans le cache PWA.

## Aliments

Le sélecteur natif est remplacé par un catalogue intégré, recherchable sans distinction d’accents ou de casse, avec libellés complets à la ligne, défilement vertical, exclusion des aliments déjà ajoutés et retour du focus après sélection/fermeture. Échap ferme le catalogue. Les quantités et instantanés de ration conservent leur format existant.

La capture du bug annoncé n’était pas accessible dans la conversation. Le changement traite les débordements et les longs libellés ; il reste à confronter le résultat à cette capture et au téléphone réel.

## Références BIO

Le formulaire propose les trois liens fournis, en précisant la date historique de la version 2018/848. La règle du calcul existant est conservée : double du délai légal vérifié, au minimum 48 h pour les médicaments concernés, depuis la dernière administration. Le point de référence est l’annexe II, partie II, 1.5.2.5 du règlement 2018/848. Source officielle vérifiée : https://eur-lex.europa.eu/eli/reg/2018/848/oj?locale=fr . EUR-Lex indique une consolidation au 25 mars 2025 à la vérification.

Le règlement 2021/1165 porte sur les produits et substances autorisés (consolidation indiquée au 1er janvier 2026) : https://eur-lex.europa.eu/eli/reg_impl/2021/1165/oj?locale=fr . Il ne remplace pas le RCP propre au médicament. Le lien national fourni https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044793347 est accessible dans l’interface, mais sa lecture automatisée a été bloquée (403) : aucune règle additionnelle n’en a été déduite. Pas de certification automatique du statut BIO ni de compteur de cures ajouté.

## Éléments encore attendus

Capture du problème d’aliment, PDF « arrêté du 25 septembre 2018… » et URL décrivant le codage ASDA non présents dans les pièces accessibles de cette demande. Aucun nouveau décodage ni catalogue de codes raciaux n’est inventé en leur absence. La lecture de code-barres reste sans analyse IA.

## Validation réalisée

- `npm test` : 28 tests réussis (stockage, synchronisation, PostgreSQL/RLS, données, pointage, passeports, délai sanitaire).
- `npm run build` : compilation Vite et cache PWA réussis ; avertissement préexistant de bundle JavaScript supérieur à 500 kB, sans erreur bloquante.
- `node tests/browser-smoke.cjs` puis `TEST_PRODUCTION=1 node tests/browser-smoke.cjs` : quatre postes, dates/observations, conservation de l’ancien historique, abandon protégé, échec de stockage, rechargement hors ligne et visuels en cache.
- `node tests/ration-browser.cjs` : catalogue ouvert à 320/390/768/1280 px sans débordement de page, recherche sans résultat, exclusion des doublons, calcul et sauvegarde d’instantanés individuels et par lot.
- `node tests/health-browser.cjs` : source obligatoire, délai BIO et changement d’heure, historique et quatre largeurs.
- Captures inspectées du pointage et du catalogue mobile ; page 69 restaurée contrôlée visuellement. Navigateurs sur appareils physiques non testés.
