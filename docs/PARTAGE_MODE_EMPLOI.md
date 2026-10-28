# Connexion et synchronisation de l’élevage

## Première utilisation

1. Mettre à jour l’application. Le mode local existant reste accessible.
2. Cliquer sur **Connexion équipe**. Utiliser le compte applicatif créé dans Supabase, avec son mot de passe personnel. Le compte doit figurer dans `pv_members` pour l’élevage.
3. La base partagée démarre avec ses seules données serveur : les animaux de démonstration ne sont jamais importés automatiquement.
4. Pour transférer les données d’un appareil, commencer par **Exporter** en mode local. Se connecter à l’équipe puis utiliser **Importer** avec ce fichier. Vérifier qu’il contient les données réelles. L’import cloud est réservé à une base vide, afin de ne pas remplacer les données des collègues. Garder le fichier exporté.
5. Cliquer sur **Synchroniser** et attendre « 0 en attente ». Un autre appareil peut alors se connecter avec son propre compte.

Les comptes sont toujours administrés depuis Supabase ; l’interface d’invitation des collègues n’est pas encore développée. Le propriétaire doit créer chaque utilisateur puis lui attribuer un rôle dans l’élevage.

## Hors ligne

Après une connexion réussie, les données et opérations en attente sont conservées dans IndexedDB, séparées par compte et par élevage. Au rechargement hors ligne, choisir **Ouvrir ma copie hors ligne**. Cette possibilité reste ouverte pendant sept jours après la dernière vérification en ligne des droits. Elle ne remplace pas le verrouillage de l’appareil : les données locales ne sont pas chiffrées par un mot de passe applicatif.

La première connexion et la récupération des données d’un nouvel appareil nécessitent Internet. Une révocation de droits ne peut pas être connue sans connexion ; lorsqu’elle est constatée en ligne, l’accès est verrouillé et les saisies non envoyées sont conservées.

Chaque enregistrement est écrit localement avant confirmation. La synchronisation se déclenche à l’ouverture, au retour réseau, au retour au premier plan et toutes les 60 secondes quand la page est visible ; le bouton permet aussi de la lancer. Elle est suspendue pendant l’édition d’un formulaire modal. Une PWA fermée ne garantit pas l’envoi en arrière-plan.

## Conflits et interruptions

Une pesée ou un traitement constitue une opération indépendante : deux ajouts sont conservés. Deux versions différentes d’une même fiche déclenchent un conflit explicite. Comparer les valeurs puis choisir la version partagée ou confirmer le renvoi de sa version locale. En cas de doute, exporter une copie avant de résoudre le conflit.

Une réponse réseau perdue conserve l’UUID de l’opération pour son renvoi, sans double création. Une erreur de validation n’efface pas la saisie. Si un autre onglet a changé le cache, une erreur impose le rechargement au lieu de remplacer son travail. Privilégier un seul onglet par appareil.

Le cache reste sur l’appareil après déconnexion pour permettre de récupérer les opérations non envoyées lors de la prochaine connexion du même compte. Ne pas effacer les données du navigateur ni désinstaller l’application tant que des opérations sont en attente. Le navigateur ou le système peut aussi supprimer du stockage local ; une donnée non synchronisée n’est pas une sauvegarde cloud.

## Configuration et limites

La clé publique du projet est incluse dans la configuration web ; elle est conçue pour être distribuée au navigateur et ne donne aucun droit administrateur. Les variables Vite peuvent remplacer la configuration ; une chaîne vide pour `VITE_SUPABASE_PUBLISHABLE_KEY` désactive le client. Aucune clé secrète n’est embarquée.

L’accès anonyme aux tables du projet réel a été testé : il est refusé (HTTP 401, code PostgreSQL 42501). Les scénarios multiappareil sont testés avec deux contextes de navigateur et une API simulée ; les droits SQL sont testés séparément sur PostgreSQL embarqué. La connexion avec le mot de passe réel du propriétaire et les téléphones de l’équipe reste à valider par les utilisateurs.

Les sauvegardes automatiques indépendantes du serveur ne sont pas activées. Le bouton **Exporter** conserve une copie JSON manuelle. La destination cloud et son exécution planifiée restent à configurer. La synchronisation ne remplace pas ces sauvegardes.

## Validation

- `npm test` : tests métier, droits SQL et fusion de copies locales.
- `npm run build` puis `TEST_PRODUCTION=1 npm run test:browser` : pointage, anciennes données et PWA hors ligne.
- `npm run build` puis `node tests/cloud-browser.cjs` : deux sessions, connexion, cache hors ligne après rechargement, réponse perdue sans doublon, modifications concurrentes, ajouts indépendants et quatre largeurs d’écran.
- `node tests/health-browser.cjs`, `node tests/ration-browser.cjs` : enregistrements sanitaires et rations.
