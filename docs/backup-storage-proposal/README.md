# Copie séparée des tables — proposition non déployée

Le contrôle automatique a refusé le déploiement Edge et la planification HTTP. Les sauvegardes internes horaires restent actives. Aucun bucket, secret Vault ni fonction Edge de cette proposition n’a été créé.

La proposition utilise un bucket Supabase Storage privé, un secret aléatoire dédié en Vault, une validation JWT activée à la passerelle, puis une vérification du secret côté fonction. Le JWT public anon n’autorise pas les sauvegardes à lui seul. Le header `x-backup-token` est explicitement fourni par `pv_private.dispatch_backup`. Le service ne renvoie pas les données aux appelants ; il télécharge chaque copie après écriture pour en vérifier le contenu. Les clés de service restent exclusivement dans l’environnement Edge.

Ordre d’activation proposé après accord : provisionner les objets sans modifier le cron ; déployer `index.ts` avec `verify_jwt=true` ; vérifier que les appels sans jeton dédié sont refusés ; déclencher un essai par `dispatch_backup()` ; vérifier le fichier privé et son contenu ; seulement ensuite, ajouter une tâche horaire de copie séparée. Ne pas désactiver la tâche de sauvegarde interne. Conserver toutes les copies 30 jours.

Ce stockage séparé des tables reste dans le même projet Supabase. Une copie chez un autre prestataire serait encore nécessaire pour couvrir la suppression de tout le projet.
