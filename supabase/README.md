# Installation de la base Pré Vert

Projet cible : `lzufwduwpngrshkzayaz` (Pré Vert Engraissement).

## 1. Installer les tables et les règles d’accès

Dans le tableau de bord Supabase du projet, ouvrir **SQL Editor → New query**. Copier le contenu intégral de `migrations/202610280001_prevert.sql`, puis exécuter la requête une fois comme administrateur du projet.

Ce script crée quatre nouvelles tables `pv_farms`, `pv_members`, `pv_records`, `pv_operations` et deux fonctions. Il ne supprime aucune table et n’importe aucune donnée de l’application. L’ensemble est transactionnel : si une instruction échoue, aucune modification de cette migration n’est validée. Ne pas relancer après succès : ce n’est pas une migration idempotente. En cas d’erreur, transmettre le message exact ; ne pas supprimer les tables pour contourner l’erreur.

La clé publique ne donne pas les droits nécessaires à cette opération. Ne jamais la remplacer par une clé secrète dans le site.

## 2. Initialiser l’équipe après installation

À effectuer lors du raccordement des utilisateurs : créer les comptes dans **Authentication → Users**, puis attribuer un élevage et un rôle via une opération administrateur. Le compte propriétaire du tableau de bord Supabase n’est pas automatiquement un utilisateur de l’application. Aucun utilisateur ne peut s’inscrire lui-même comme membre d’un élevage via les tables publiques. Les inscriptions Auth ouvertes, si elles restent activées, ne donnent aucun accès aux données sans appartenance explicite.

Ne pas exécuter de commandes contenant des adresses ou UUID d’exemple. L’initialisation du premier administrateur sera préparée avec le compte applicatif choisi.

## Structure et garanties testées

- Un enregistrement par bovin, lot, pesée, pointage, traitement ou ration. Les tableaux d’historique ne sont pas réécrits en bloc dans la fiche animale.
- Chaque enregistrement porte sa version et son dernier auteur. Une écriture sur une version ancienne renvoie un conflit explicite.
- Chaque opération a un UUID et un reçu conservé. Un renvoi identique retourne le même reçu ; réutiliser l’UUID avec un autre contenu ou un autre auteur est refusé.
- Les suppressions sont des marqueurs conservés, pas des suppressions physiques.
- Les rôles sont `admin`, `editor` et `viewer`. Seuls les deux premiers écrivent via la fonction contrôlée. Aucune écriture directe n’est accordée aux utilisateurs.
- Les utilisateurs non membres ne voient aucun enregistrement de l’élevage. Les visiteurs anonymes n’ont pas accès aux tables ou à la fonction d’écriture.
- Les droits sont testés sur PostgreSQL embarqué PGlite avec des rôles non privilégiés. Supabase Auth y est simulé par une fonction `auth.uid()` de test. Ces essais ne remplacent pas la recette sur le projet Supabase réel, ni les essais de concurrence réseau multiappareil.

Commande : `node --test tests/cloud-database.test.js`.

## État de livraison

Le propriétaire a confirmé l’installation de la migration et l’attribution de son compte administrateur. Le client est maintenant relié à l’interface avec authentification, cache IndexedDB et synchronisation. Aucun import des données locales n’est automatique. Voir `docs/PARTAGE_MODE_EMPLOI.md` pour les limites et la validation utilisateur restante. Les sauvegardes automatiques ne sont pas activées.

La synchronisation récupère les enregistrements par pages complètes et ne supprime pas une fiche au seul motif de son absence d’une page. Un marqueur de suppression explicite est nécessaire. Une mise à jour concurrente pendant la pagination peut être récupérée au cycle suivant ; il ne s’agit pas d’un instantané transactionnel de tout l’élevage. Les contraintes SQL actuelles contrôlent l’accès et la structure de base ; elles ne prétendent pas valider tous les critères métier d’un pointage ou d’un traitement.

## Gestion des utilisateurs depuis l’application (1.0.4)

Exécuter une seule fois `migrations/202610290001_team_admin.sql` dans le SQL Editor du projet existant. Cette migration ajoute trois fonctions contrôlées, sans modifier les membres existants ni créer de comptes Auth. Elle doit être installée avec les droits du propriétaire Supabase, pas avec la clé publique du navigateur.

Dans l’application, l’administrateur ouvre **Compte → Gérer les utilisateurs** et saisit l’e-mail exact d’un compte déjà créé dans **Authentication → Users**. Le rôle par défaut **Utilisateur** correspond à `editor` (saisie et modification des données). **Lecture seule** correspond à `viewer`. Seul **Administrateur** (`admin`) gère les accès. Aucun e-mail n’est envoyé par le rattachement. Le retrait d’accès ne supprime ni le compte Auth ni les données de l’élevage ; il est réversible en rattachant de nouveau le compte. Le changement de mot de passe et la création de comptes Auth restent dans Supabase.

Les fonctions vérifient le rôle administrateur à chaque appel, ne montrent que les membres de l’élevage demandé, interdisent l’auto-modification et sérialisent les modifications d’accès par élevage. Un compte déjà rattaché à un autre élevage est refusé, car l’écran de connexion actuel ne gère qu’un élevage par compte. Une copie locale déjà présente ne peut pas être effacée à distance ; les droits retirés sont appliqués lors des prochains échanges avec le serveur.

Validation : `node --test tests/team-admin.test.js` vérifie les droits dans PostgreSQL embarqué.
