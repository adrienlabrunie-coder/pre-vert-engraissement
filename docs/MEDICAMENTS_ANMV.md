# Médicaments, rappels et délai viande BIO

## Sources et périmètre

Source à privilégier pour l’import structuré : jeu de données Anses/ANMV sur data.gouv.fr, version XML V2, dont les temps d’attente sont structurés par voie et espèce. Le 28 octobre 2026, l’archive et le dictionnaire renvoyaient une page de maintenance ; l’API data.gouv signalait aussi le fichier comme indisponible (503). Les sites commerciaux proposés ne sont pas utilisés comme API sans interface ni autorisation identifiées ; aucun abonnement souscrit.

Alternative réellement utilisée : index public officiel `https://www.ircp.anmv.anses.fr/`, accessible à cette date. `scripts/import-anmv-index.py` construit un instantané des références dont l’espèce cible mentionne bovins, vaches ou veaux, avec un lien RCP HTML. Ce périmètre n’est pas exhaustif (certaines autorisations centralisées, espèces formulées autrement et RCP PDF ne sont pas couverts). Les résultats sont stockés dans `public/medicines`, par petits fichiers précachés pour le mode hors ligne. Les textes de posologie, temps d’attente et précautions sont extraits sans IA et affichés comme informations documentaires, avec attribution et lien vers le RCP complet. Leur mise en page tabulaire peut perdre des alignements : en cas d’ambiguïté, consulter l’original.

Le catalogue indique sa date de récupération. C’est une copie datée, pas une connexion en temps réel ni une garantie de disponibilité commerciale. La vérification du RCP en vigueur et de l’ordonnance reste nécessaire. Aucune actualisation payante ou tâche récurrente n’est activée. Le script peut être relancé manuellement, puis les données et tests doivent être revus avant publication. L’application ne sélectionne pas un médicament selon un diagnostic.

## Préremplissage

Sélection exacte dans le catalogue : nom, AMM, lien source et textes du RCP. Modifier manuellement le produit détache la fiche et efface les anciennes données de dose/voie/délai/source. Modifier une voie, un délai ou une source annule leur confirmation.

Un seul profil chiffré a été revu à ce stade : MULTIBIO SUSPENSION INJECTABLE, FR/V/0854561 5/1988, RCP du 18 avril 2025, contrôlé dans l’ANMV et la base européenne UPD (600000035550). Pour les bovins et les voies IM, SC, intrapéritonéale indiquées : délai viande proposé de 21 jours, donc 42 jours BIO si la règle s’applique. Le rythme RCP proposé (12 h, six administrations sur trois jours) reste soumis à confirmation de l’ordonnance. Aucun volume individuel n’est calculé ni prescrit. Le profil chiffré est lié à l’empreinte de la copie revue ; un changement de cette copie désactive le préremplissage jusqu’à revue.

Pour les autres références, posologie et temps d’attente remontent sous forme de texte ; le délai numérique et le rythme doivent être renseignés après vérification. L’absence de valeur ne vaut jamais zéro. Le traitement conserve une copie de la fiche sélectionnée pour que son historique ne dépende pas des mises à jour futures. L’import structuré ANMV généralisé reste à terminer quand le téléchargement officiel est rétabli.

## Rappels et administrations réelles

Les rappels sont facultatifs et calculés d’après un intervalle et un nombre total d’administrations explicitement confirmés sur l’ordonnance. La première administration doit déjà avoir eu lieu. Les prochaines restent au statut « prévu » tant qu’elles ne sont pas confirmées une par une avec leur date/heure réelle. Une confirmation future ou antérieure à la précédente est refusée. Le délai repart de la dernière administration réelle. Les rappels ne se décalent pas automatiquement en cas de retard : vérifier la conduite à tenir avec le vétérinaire.

Les rappels restants peuvent être annulés après confirmation de l’arrêt par le vétérinaire ; la trace d’annulation est conservée et le délai de la dernière administration reste applicable. Rappels dans le registre, la fiche individuelle et le compteur du tableau de bord (retards ou prochaines 24 h). Pas de notifications système en arrière-plan, SMS, email ou prise de décision thérapeutique automatique.

## Affichage BIO et jours

L’application affiche « BIO bloqué — délai viande en cours », sa date/heure exacte de fin et les jours restants (arrondis au supérieur). Un traitement avec rappels en attente reste bloqué même si une ancienne échéance est passée. Toute absence de calcul BIO vérifié, y compris les anciens traitements en texte libre, donne « BIO bloqué — délai à vérifier ». Entre plusieurs traitements, la fin la plus tardive est retenue ; une inconnue n’est jamais ignorée.

À expiration, l’affichage devient « Délai BIO échu — statut à vérifier », jamais une certification automatique BIO. Les règles de cumul de traitements, de reconversion et les autres obligations de l’atelier restent distinctes (règlement 2018/848, annexe II, partie II, 1.5.2.4 et 1.5.2.5). Aucun déclassement administratif n’est enregistré par ces badges. Les traitements sont ajoutés par défaut avec l’option BIO activée, à confirmer selon le médicament.

Affichage des durées et export CSV en jours : 48 h = 2 jours. Les données anciennes `appliedHours` sont conservées et les calculs restent en durée réelle pour traverser correctement les changements d’heure. On ne libère pas l’animal au début de la date de fin ; l’heure exacte compte.

## Validation

Tests couvrant minimum BIO, dates exactes et changement d’heure, plusieurs traitements, données inconnues, rappels non confirmés, confirmation réelle et recalcul, annulation et conservation des données. Tests navigateur du catalogue, de la fiche Multibio, de la voie explicite, des confirmations, des rappels, du mode hors ligne et de quatre largeurs d’écran. Les tests utilisent une ordonnance fictive et ne constituent pas une validation clinique. Téléphones physiques, douchettes et exploitation de production non testés.

Instantané livré : 777 références, dont 672 avec les deux rubriques posologie et temps d’attente extraites ; environ 4,7 Mo précachés. Validation locale : 38 tests unitaires/intégration, parcours navigateur médicaments (dont cache hors ligne et largeurs 320/390/768/1280 px), sanitaire, synchronisation simulée et parcours général. Les avertissements de taille du bundle Vite subsistent ; la compilation aboutit.
