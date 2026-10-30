# Copie privée — état au 30 octobre 2026

## Production vérifiée

La version 1.0.5 est fusionnée et publiée. Les sauvegardes internes horaires fonctionnent ; 12 copies intègres étaient présentes à 03:00 UTC. La restauration reste réservée aux administrateurs. Aucun bucket ni service de copie n'est actuellement actif.

## Variante préparée, non déployée

La migration `20261030034344_archive_backups_without_deletion.sql` et la fonction `supabase/functions/prevert-backups/index.ts` reprennent la proposition avec une différence : aucun effacement d'archive ni suppression de sauvegarde par ce service. La rétention interne existante de 30 jours n'est pas modifiée. Le stockage privé conserverait les copies sans purge automatique ; son occupation devra être surveillée avant de définir une politique de rétention.

La passerelle doit conserver `verify_jwt=true`. Un secret dédié aléatoire de 256 bits reste dans Vault, jamais dans le navigateur ou Git. La fonction vérifie ce secret via une RPC accessible uniquement au rôle serveur. Un JWT public seul ne donne pas accès aux copies. Chaque copie est relue et comparée avant de marquer son archivage réussi. Aucun contenu de sauvegarde n'est renvoyé à l'appelant.

Le 30 octobre, le contrôle automatique a refusé le déploiement : l'activation d'une fonction de production utilisant le rôle serveur et écrivant des sauvegardes nécessite un accord explicite. Aucun changement de production n'a été effectué. La migration n'a pas été appliquée et aucune nouvelle tâche n'a été planifiée.

## Activation restant à effectuer après accord

1. Appliquer la migration additive ; vérifier le bucket privé et l'absence de droits pour anon/authenticated sur la RPC serveur.
2. Déployer la fonction avec vérification JWT activée.
3. Tester le refus des appels sans JWT, sans secret et avec secret invalide.
4. Appeler `pv_private.dispatch_backup()` puis contrôler la réponse HTTP, la relecture des copies et l'absence d'erreurs d'archivage. Ne pas afficher le secret Vault ni les données d'élevage dans les journaux.
5. Programmer un appel horaire à cinq minutes après l'heure seulement après validation complète ; conserver `prevert-hourly-backups`.
6. Vérifier une exécution planifiée et tester l'import d'une copie sur un environnement isolé.

Cette copie est séparée des tables, mais reste dans le même projet Supabase : elle ne protège pas contre la suppression de tout le projet. Une vraie copie externe nécessite une destination indépendante.

## Tests de la variante

Trois tests exécutent le véritable code de la fonction avec un stockage simulé : refus d'accès sans secret, écriture et relecture y compris perte d'accusé de réception, détection d'une copie corrompue. Ils ne remplacent pas la validation en production décrite ci-dessus.
