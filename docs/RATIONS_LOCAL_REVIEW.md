# Intégration du calculateur de ration — publication autorisée

Publication du moteur et du catalogue autorisée explicitement par le propriétaire le 28 octobre 2026.

## Modifications proposées

- Réutilisation de onze fichiers TypeScript du moteur et du catalogue du dépôt privé `adrienlabrunie-coder/ration-pre-vert`, sans modifier ce dépôt source.
- Écran Pré Vert pour choisir un bovin ou un lot, reprendre le poids connu et l’objectif, confirmer catégorie, race de référence et état corporel.
- Quantités en matière sèche, conversion en brut, prix ajustables, comparaison des apports et besoins estimés et coût du groupe.
- Instantanés datés sur `animal.rations` ou `lot.rations`, avec profil, membres, aliments, prix et résultat conservés. Ces champs sont inclus dans la sauvegarde JSON existante. Erreur de stockage affichée avant confirmation d’enregistrement.
- La catégorie « mâle entier » bloque le calcul : le moteur existant ne la prend pas en charge. Aucune conversion du pointage 1–10 en état corporel 1–5.

## Portée de la publication autorisée

Publier cette branche rendrait le code du moteur et son catalogue alimentaire accessibles publiquement dans `adrienlabrunie-coder/pre-vert-engraissement`. Le propriétaire a autorisé explicitement cette publication. Aucun de ces fichiers n’est inclus dans les PR 1 ou 2 déjà fusionnées.

## Limites

Le moteur source est réutilisé, sans validation nutritionnelle indépendante. Les résultats sont explicitement présentés comme des estimations à faire valider, sans certification BIO. Le catalogue n’a pas de mise à jour en ligne ; seuls les prix sont modifiables dans cette première interface. L’état corporel et la race de référence nécessitent une sélection explicite. Aucun équilibrage automatique ni recommandation de distribution n’est appliqué.

## Vérification

`npm run build` : compilation de l’intégration locale. `node tests/ration-browser.cjs` : contrôle de la catégorie, calcul réel, sauvegardes individuelles et par lot, conservation des données préexistantes, rechargement et affichage à 1280, 768, 390 et 320 px.
