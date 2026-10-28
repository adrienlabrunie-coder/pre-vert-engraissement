# Estimation EUROP, provenance et tri du cheptel

L’estimation est une saisie manuelle facultative sur le vivant, séparée du pointage et d’un résultat d’abattoir. Formats acceptés : E/U/R/O/P, signe + ou - facultatif, puis état 1 à 5 (exemples U-3, R+2, R3). Une valeur vide est acceptée et permet d’effacer l’estimation. La date technique de dernière modification est conservée dans `europEstimatedAt` ; aucune équivalence avec les notes de pointage n’est calculée.

Nouveaux champs additifs sur la fiche : `europEstimate`, `europEstimatedAt`, `originHerd`, `originBreeder`. Le cheptel est stocké en texte pour préserver les zéros initiaux. Ces champs sont modifiables à la création et sur les fiches existantes, affichés dans la liste et la fiche, exportés avec les données existantes et transportés par la synchronisation de fiche actuelle. Aucun changement de schéma Supabase ou migration de données n’est nécessaire. La provenance n’est pas automatiquement déduite de l’exploitation de délivrance d’une ASDA.

La ligne affiche le dernier pointage daté. Sa moyenne descriptive est calculée uniquement si les six postes ARC, DEE, EPD, LAC, LAD, LOC sont tous présents et valides dans ce même pointage. ETA est présenté séparément. Aucun comblement par des observations plus anciennes et aucun mélange musculature/état. Ce résumé applicatif n’est pas un index officiel Idele.

Tri ascendant/descendant : identification, âge, race, moyenne de conformation, EUROP estimé, date d’entrée, chacun des sept postes et éleveur. Les valeurs manquantes restent en fin de liste dans les deux directions. EUROP est ordonné par conformation P/O/R/U/E, subdivision -/sans signe/+, puis état 1 à 5 ; cet ordre est explicité dans l’interface et ne prétend pas exprimer une qualité commerciale globale. Recherche élargie au classement, cheptel et éleveur. Liste adaptée aux écrans étroits.

Validation : 34 tests de logique réussis ; build Vite/PWA réussi (avertissement préexistant de taille du bundle) ; parcours navigateur édition EUROP/provenance, conservation des historiques/champs inconnus, tri, persistance après rechargement et absence de débordement à 320/390/768/1280 px ; non-régression du parcours de pointage. Capture mobile inspectée. Appareils physiques non testés.

## Complément documentaire : tiers médian

Les documents NORMABEV (guide pédagogique, mise à jour novembre 2015, pages imprimées 15–19 et 26) et Interbev Normandie fournis ensuite précisent la notation du tiers médian `=`. La saisie accepte maintenant `R=3` et continue d’accepter `R3` ; ils ont le même rang de tri, sans réécriture des données existantes. Une aide repliable explique les trois parties de la conformation, les cinq niveaux d’engraissement et les limites de l’estimation sur le vivant. Aucun calcul automatique du classement n’est ajouté. Les fichiers sources ne sont pas republiés dans le dépôt public. Cette aide reprend des repères pédagogiques historiques et ne certifie pas la réglementation en vigueur.
