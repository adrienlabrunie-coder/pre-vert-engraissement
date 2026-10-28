# Base partagée, mode hors ligne et Android

État au 28 octobre 2026. Besoin confirmé : 2 à 5 utilisateurs, un élevage commun.
Ce document décrit la prochaine évolution ; ni authentification, ni synchronisation cloud, ni sauvegarde automatique ne sont encore activées.

## Architecture proposée

- Comptes individuels sur invitation, identifiant e-mail et mot de passe ; premier accès en ligne obligatoire.
- Un administrateur gère les invitations et la restauration. Les autres utilisateurs peuvent travailler sur le cheptel commun. Les actions sont attribuées à leur auteur.
- Serveur proposé : Supabase Auth et PostgreSQL, région européenne, avec autorisations de base de données pour l’élevage. Le service ne fournit pas à lui seul le mode hors ligne.
- Stockage local transactionnel IndexedDB : animaux, lots, pesées, pointages, traitements, rations, opérations en attente et état de synchronisation. Les clés actuelles localStorage restent intactes jusqu’à validation de la migration.
- Lecture et saisie immédiates en local. Réessai de synchronisation à l’ouverture, au retour au premier plan, au retour réseau, et sur bouton « Synchroniser ». Ne pas dépendre exclusivement d’une synchronisation en arrière-plan du navigateur.
- Indicateurs séparés : état réseau, nombre d’opérations en attente, dernière synchronisation confirmée et dernière sauvegarde serveur confirmée.

## Intégrité et conflits

Chaque opération possède un identifiant unique, un auteur, un appareil et la version de base de l’enregistrement. Le serveur applique une opération une seule fois, même après une coupure pendant la réponse.

Les pesées, traitements, pointages et rations sont des événements indépendants : deux ajouts sur le même bovin sont conservés. Deux modifications concurrentes d’un même champ provoquent un conflit visible à résoudre, pas un écrasement silencieux par la dernière sauvegarde. Les suppressions utilisent des marqueurs conservés pour les autres appareils. Les doublons d’identification sont contrôlés côté serveur.

Une sauvegarde locale préalable et un aperçu de migration précèdent tout premier import dans la base commune. Préserver les champs supplémentaires et les historiques anciens. Ne jamais téléverser les animaux de démonstration comme données réelles sans choix explicite. Ne pas migrer les tableaux complets avec une stratégie « dernier appareil gagnant ».

Hors ligne : accès uniquement au cache d’un utilisateur déjà connecté sur l’appareil. Une révocation distante ne peut pas être connue sans réseau ; la durée maximale d’accès hors ligne doit être définie. Si la session expire, les saisies restent locales et la synchronisation attend une reconnexion. Une déconnexion ne supprime pas silencieusement des opérations non envoyées. Cloisonner le cache par compte/élevage.

## Sauvegardes

La base centrale assure le partage ; un stockage distinct conserve les sauvegardes. Google Drive est envisageable comme destination d’exports datés, pas comme fichier de travail partagé modifié par chaque téléphone.

Proposition : tâche côté serveur quotidienne, archive chiffrée, conservation de 30 sauvegardes quotidiennes et 12 mensuelles, alerte en cas d’échec, test régulier de restauration sur une base isolée. Sauvegarder séparément les fichiers joints et la base si l’application conserve des pièces jointes. Ne pas stocker les secrets Drive ou les clés administrateur dans le JavaScript public.

Une PWA fermée ne permet pas de garantir l’exécution quotidienne. La tâche serveur peut sauvegarder les seules données déjà synchronisées : les saisies encore hors ligne ne sont pas protégées dans le cloud.

Le plan gratuit Supabase ne comprend pas de sauvegardes automatiques gérées ; ne pas confondre hébergement gratuit et sauvegarde gratuite. Aucun abonnement ni compte cloud n’a été créé. Le compte propriétaire, le service, le budget et la destination de sauvegarde restent à définir avant activation.

## Android

Conserver React/Vite et ajouter Capacitor ultérieurement. Le projet Android embarquera la compilation web ; même base centrale et règles de synchronisation que la PWA. Prévoir les permissions caméra, le stockage local adapté, la migration PWA vers application, les liens d’authentification et la signature des versions. APK pour installation directe ; préparer le format de publication requis si distribution sur Google Play. Tester sur appareils réels ; l’empaquetage ne remplace pas la gestion du hors ligne.

## Tests d’acceptation prévus

- Deux comptes autorisés accèdent au même cheptel ; un compte non invité et un utilisateur non connecté n’y accèdent pas.
- Deux appareils ajoutent des événements hors ligne puis synchronisent sans pertes ni doublons ; la répétition d’une requête est sans effet supplémentaire.
- Modification concurrente du même champ : conflit explicite, deux valeurs récupérables.
- Coupure pendant synchronisation, session expirée, stockage saturé, changement de compte et révocation : aucune perte silencieuse.
- Migration d’une sauvegarde ancienne, restauration complète, pièces jointes et historique d’auteurs vérifiés.
- PWA et APK : mêmes données après synchronisation, caméra et reprise hors ligne vérifiées sur téléphone.

## Sources techniques

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/platform/backups
- https://developers.google.com/workspace/drive/api/guides/appdata
- https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/android
