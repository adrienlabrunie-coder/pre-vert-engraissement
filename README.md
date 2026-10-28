# Le Pré Vert — Engraissement bovins BIO

PWA React + Vite autonome, créée comme première base de travail indépendante de Lovable.

## Installation

```bash
npm install
npm run dev
```

Ouvrir l'adresse locale indiquée par Vite. Pour générer la PWA :

```bash
npm run build
npm run preview
```

Pour installer l'application sur téléphone, la servir en **HTTPS** (ou localhost pour le développement) puis choisir « Ajouter à l'écran d'accueil ».

## Fonctionnel en V1

- Tableau de bord, fiches bovins, création et édition manuelles.
- Lots, bâtiments et emplacements (champ texte).
- Pesées datées, courbe et GMQ calculé sur les première et dernière pesées.
- Pointage daté, critères morphologiques issus de la structure du *Guide pratique du pointage des bovins de race à viande* (Institut de l'Élevage, 2014).
- Saisie des traitements et export/import de sauvegarde JSON.
- PWA installable avec mise en cache des ressources de l'application.

## Limites importantes

- **Stockage uniquement local** dans `localStorage` du navigateur. Les données ne sont ni partagées ni synchronisées entre appareils et peuvent disparaître lors d'une suppression des données du navigateur. Exporter régulièrement une sauvegarde JSON.
- **Données initiales fictives** fournies pour démonstration : les supprimer avant utilisation réelle.
- **Aucun OCR de passeport**, aucune intégration Beef Ration Planner ni DMV à ce stade.
- **Aucune validation sanitaire, réglementaire BIO ou calcul automatique des délais d'attente** : le champ de délai est une saisie libre et doit être vérifié sur les sources réglementaires et vétérinaires applicables.
- Le pointage V1 couvre les postes de conformation, format, fonctionnalité et état. Il ne constitue pas une reproduction complète du manuel : il manque les illustrations détaillées, les particularités de notation, les défauts codifiés et les postes mamelle.
- Une PWA hors ligne ne garantit pas la disponibilité de toutes les ressources si elle n'a jamais été chargée en ligne.

## Suite technique conseillée

Supabase/PostgreSQL + authentification et RLS, IndexedDB pour l'offline-first, synchronisation avec gestion des conflits, contrôle des habilitations, audit des modifications, scan OCR avec validation humaine, bibliothèque de traitements réglementée et interconnexion contrôlée avec Beef Ration Planner.

## Import dans GitHub / Lovable

Créer un dépôt GitHub et y pousser les fichiers de ce dossier (sans `node_modules` ni `dist`). Ensuite utiliser les fonctionnalités d'importation de dépôt disponibles dans l'environnement Lovable. Vérifier la prise en charge du flux d'importation avant de s'engager dans une migration.
