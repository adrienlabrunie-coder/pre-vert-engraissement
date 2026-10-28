# Passeports et registre sanitaire

## Livraison

Lecture de photo locale via Tesseract.js 7 et modèle français, sans service OCR payant et sans envoi de photo. Les ressources sont copiées depuis les dépendances au démarrage et à la compilation (`scripts/prepare-ocr.mjs`). La première utilisation nécessite leur chargement ; le service worker les conserve à la demande. Le texte reste modifiable, les numéros multiples demandent une sélection et la vérification humaine est obligatoire avant préremplissage. Aucun bovin n’est créé automatiquement. Formats d’identification assistés : FR et dix chiffres ; les autres pays restent accessibles par saisie manuelle.

Le registre sanitaire regroupe les traitements individuels et exporte un CSV. Dose, voie, ordonnance, vétérinaire, référence, dernière administration et rémanence sont des champs distincts. Les anciennes saisies libres sont conservées.

Le calcul facultatif prend exclusivement un délai légal saisi et vérifié par l’utilisateur pour une utilisation normale. La règle BIO sélectionnable double ce délai avec un minimum de 48 heures. Aucune durée, dose ou rémanence n’est déduite du médicament. Aucun accès automatisé au DMV : lien externe seulement. La date d’administration réelle ne peut être future.

Source vérifiée le 28 octobre 2026 : règlement (UE) 2018/848, annexe II, partie II, §1.5.2.5, version consolidée du 25 mars 2025, https://eur-lex.europa.eu/eli/reg/2018/848/2025-03-25 . Le résultat ne valide pas le statut biologique, les règles de nombre de traitements, ni la commercialisation. Les cas hors conditions normales restent à déterminer par le vétérinaire.

## Données et validation

Clés `pv_animals` / `pv_lots` et format JSON version 1 conservés. Les nouveaux champs sont additifs ; aucun historique existant n’est converti ni effacé. Les calculs enregistrent leur source, règle et échéance ISO. L’écriture du traitement précède la fermeture du formulaire et une erreur de stockage conserve la saisie.

Commandes : `npm test`, `npm run build`, `TEST_PRODUCTION=1 npm run test:browser`, `npm run test:passport`, `node tests/health-browser.cjs`.

Le test OCR utilise une véritable reconnaissance sur une image synthétique. La fiabilité sur des photos de passeports réels, prises dans l’élevage, reste à valider. Le parcours sanitaire couvre le refus sans source vérifiée, le calcul avec changement d’heure, quatre largeurs d’écran et la conservation d’un traitement ancien. Le test général couvre aussi les données de pointage historiques et le mode hors ligne.

## Suite du projet

Le moteur de ration n’est pas inclus dans cette livraison. Sa réutilisation depuis un dépôt privé dans ce dépôt public nécessite une validation de publication spécifique. Les traitements de lot, la validation réglementaire complète et la synchronisation entre appareils ne sont pas encore implémentés.
