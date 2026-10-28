# Raccordement Supabase — préparation

Projet choisi par le propriétaire : Pré Vert Engraissement.
URL : https://lzufwduwpngrshkzayaz.supabase.co
Référence : lzufwduwpngrshkzayaz.

Le client JavaScript et la configuration sont préparés dans `src/cloud/`. Ils ne sont pas encore branchés à l’interface. Les données locales ne sont ni modifiées ni téléversées. Aucun compte utilisateur, table ou politique d’accès n’a été créé sur le serveur. La synchronisation et les sauvegardes cloud ne sont pas actives.

## Information encore nécessaire

La clé **publishable**, commençant par `sb_publishable_`, dans les paramètres du projet > API Keys (ou le panneau Connect). Cette clé est destinée au navigateur et ne remplace pas les règles d’accès à la base. Ne pas fournir de clé secrète ou service_role.

Copier `.env.example` vers `.env.local` et renseigner `VITE_SUPABASE_PUBLISHABLE_KEY`. Pour un hébergement web, renseigner les mêmes variables dans sa configuration de compilation. Les fichiers d’environnement locaux sont exclus de Git.

## Prochaine étape

Préparer et tester les migrations de base, les autorisations par membre de l’élevage et les scénarios de refus d’accès. La clé publique ne permet pas l’administration ni la création de tables : l’application des migrations nécessitera un accès administrateur au projet par un canal approprié, ou leur exécution par le propriétaire dans l’éditeur SQL Supabase.

Après cela : écran de connexion sur invitation, migration contrôlée des données existantes, cache local par utilisateur et opérations de synchronisation. Voir `PARTAGE_HORS_LIGNE_ANDROID.md` pour les exigences de conflits, de sauvegardes et de fonctionnement hors ligne.

Référence : https://supabase.com/docs/guides/getting-started/api-keys
