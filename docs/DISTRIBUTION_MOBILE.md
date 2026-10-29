# Distribution mobile Pré Vert Engraissement

## Android stable : identité et mises à jour

Identifiant permanent : `fr.leprevert.engraissement.mobile`. La version de test historique `fr.leprevert.engraissement` peut rester installée pendant la migration. Exporter les données locales de l’ancienne application puis les importer dans la version stable ; pour l’élevage partagé, se reconnecter avec le compte existant et synchroniser. Les futurs builds debug ont le suffixe `.debug` et ne remplacent jamais la version stable.

`app-release.json` définit la version et l’empreinte du certificat public. La clé privée n’est jamais stockée sur GitHub : sa sauvegarde privée est `PreVert-signature-Android-CONFIDENTIEL.zip`. Ce ZIP contient la clé et son mot de passe ; il doit rester privé et être conservé dans un coffre sécurisé. Ne jamais générer une nouvelle clé pour une mise à jour.

Le téléphone vérifie `android/latest.json` au lancement, au retour au premier plan et au retour du réseau. Une version supérieure affiche un lien de téléchargement. L’utilisateur ouvre l’APK téléchargée et valide l’installation Android. Ce n’est ni une installation silencieuse ni une notification push quand l’application est fermée. Sans réseau, le suivi reste utilisable et une vérification manuelle peut être relancée.

Le contrôle vérifie l’identifiant, le numéro de version croissant, l’origine du téléchargement, la présence d’un hash SHA-256 et l’empreinte annoncée. Android vérifie cryptographiquement la signature de l’APK lors de l’installation ; le contrôle JavaScript ne remplace pas cette vérification.

## Publier une prochaine version

1. Augmenter `versionName` et `versionCode` dans `app-release.json`, sans modifier `applicationId` ni `signingCertificateSha256`. Convention initiale : majeur × 1 000 000 + mineur × 1 000 + correctif.
2. Actualiser la version de `package.json`/`package-lock.json` et le libellé/lien d’installation web dans `src/AppUpdates.jsx`.
3. Laisser passer les tests et le workflow **Android Release preparation**. L’archive `pre-vert-release-UNSIGNED-do-not-install` contient le binaire non signé et l’outil officiel `apksigner.jar`. Ce binaire ne doit pas être distribué.
4. Extraire la sauvegarde de signature dans un dossier privé extérieur au dépôt. Signer avec `python3 scripts/sign-android-release.py CHEMIN_BUILD CHEMIN_CLE_PRIVEE`. Le script vérifie l’identifiant et la version, refuse un build débogable et contrôle l’empreinte après signature.
5. Publier ensemble l’APK signée et `distribution/android/latest.json`. Le workflow Pages copie ce dossier vers `dist/android`, après le build web. Ces APK ne sont jamais embarquées dans les builds natifs suivants ni mises dans le cache hors ligne de la PWA.
6. Tester une mise à jour sur un téléphone contenant des données, sans désinstaller, et vérifier caméra, saisies, import/export et synchronisation.

Ne pas remplacer un APK publié sous un même numéro de version. La compilation CI ne publie pas automatiquement une nouvelle version Android : la signature privée et la publication du manifeste sont des étapes indispensables. Aucun secret de signature n’est requis dans GitHub avec cette méthode. Une automatisation future peut utiliser des secrets de signature GitHub, jamais des fichiers en clair dans le dépôt.

Le code et l’hébergement GitHub actuels sont publics : les liens APK peuvent être transmis. Cette diffusion directe n’est pas un contrôle d’accès privé au binaire. L’accès aux données partagées reste soumis aux comptes et droits Supabase ; pour restreindre aussi les téléchargements, utiliser un hébergement authentifié ou une distribution gérée.

## iPhone

La PWA installée depuis Safari (Partager → Sur l’écran d’accueil) reste la solution utilisable sans compte développeur. Elle utilise ses propres données locales ; se connecter à l’élevage partagé ou importer une sauvegarde.

Le workflow **iOS unsigned build** compile une archive native sans signature de distribution. Cette archive n’est PAS installable sur un iPhone. Une distribution native nécessite l’identité et les profils Apple appropriés : abonnement Apple Developer pour TestFlight/App Store/Custom Apps selon le mode choisi, revue éventuelle et configuration App Store Connect. TestFlight est une solution de test limitée à 90 jours par build, pas une distribution définitive.

Après ouverture du compte Apple, réserver `fr.leprevert.engraissement.mobile`, configurer la signature, remplir les informations de confidentialité, puis distribuer via la voie Apple retenue. La clé Android n’a aucun rôle pour iOS.
