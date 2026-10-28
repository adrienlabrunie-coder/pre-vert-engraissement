# Passeports et registre sanitaire

## Livraison

Lecture locale des codes-barres par ZXing, via caméra ou photo du code. Aucun OCR, aucune IA et aucun service distant. Le numéro FR suivi de dix chiffres (ou dix chiffres avec confirmation explicite du pays FR) est proposé. Les autres contenus restent affichés bruts sans extraction supposée. Naissance, sexe et races sont à compléter manuellement. Le décodage d’un code synthétique est testé ; le format complet des passeports de l’élevage reste à vérifier sur un exemplaire réel. La caméra nécessite HTTPS et l’autorisation du navigateur.

Le registre sanitaire regroupe les traitements individuels et exporte un CSV. Dose, voie, ordonnance, vétérinaire, référence, dernière administration et rémanence sont des champs distincts. Les anciennes saisies libres sont conservées.

Le calcul facultatif prend exclusivement un délai légal saisi et vérifié par l’utilisateur pour une utilisation normale. La règle BIO sélectionnable double ce délai avec un minimum de 48 heures. Aucune durée, dose ou rémanence n’est déduite du médicament. Aucun accès automatisé au DMV : lien externe seulement. La date d’administration réelle ne peut être future.

Source vérifiée le 28 octobre 2026 : règlement (UE) 2018/848, annexe II, partie II, §1.5.2.5, version consolidée du 25 mars 2025, https://eur-lex.europa.eu/eli/reg/2018/848/2025-03-25 . Le résultat ne valide pas le statut biologique, les règles de nombre de traitements, ni la commercialisation. Les cas hors conditions normales restent à déterminer par le vétérinaire.

## Données et validation

Clés `pv_animals` / `pv_lots` et format JSON version 1 conservés. Les nouveaux champs sont additifs ; aucun historique existant n’est converti ni effacé. Les calculs enregistrent leur source, règle et échéance ISO. L’écriture du traitement précède la fermeture du formulaire et une erreur de stockage conserve la saisie.

Commandes : `npm test`, `npm run build`, `TEST_PRODUCTION=1 npm run test:browser`, `npm run test:passport`, `node tests/health-browser.cjs`.

Le test du scanner utilise un code-barres Code 128 synthétique. La fiabilité sur des photos de passeports réels, prises dans l’élevage, reste à valider. Le parcours sanitaire couvre le refus sans source vérifiée, le calcul avec changement d’heure, quatre largeurs d’écran et la conservation d’un traitement ancien. Le test général couvre aussi les données de pointage historiques et le mode hors ligne.

## Suite du projet

Le module de ration a été ajouté après la première livraison sanitaire. Sa réutilisation depuis le dépôt privé a été autorisée ; voir RATIONS_LOCAL_REVIEW.md. Les traitements de lot, la validation réglementaire complète et la synchronisation entre appareils ne sont pas encore implémentés.

## Validation sur un document réel

Le 28 octobre 2026, décodage réussi de la photo complète fournie par le propriétaire après ajout d’une recherche par zones dans l’image. Le code de l’attestation sanitaire est en Code 128 et contient un préfixe FR + dix chiffres, deux espaces et 24 chiffres supplémentaires. Pour ce format observé, seul le numéro initial est extrait ; les autres positions ne sont pas interprétées. Ce constat n’établit pas une compatibilité universelle avec tous les passeports/ASDA. La photo et son contenu réel ne sont pas publiés dans le dépôt.
