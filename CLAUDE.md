# CLAUDE.md — Planificateur de cours annuel

## Ce que tu construis

Une application web hébergée pour un enseignant gérant 7+ classes et matières. Elle permet de construire un référentiel de cours réutilisable (templates) et de le projeter automatiquement sur une année scolaire réelle (instances). Le brief complet est dans `brief_planificateur_cours.md`.

## Stack

- React + Vite (frontend)
- Supabase (base de données PostgreSQL + authentification Google)
- Vercel (hébergement)

## Conventions de code

- Langue de l'interface : français
- Nommage des variables et fonctions : camelCase en anglais
- Nommage des tables et colonnes Supabase : snake_case en français (ex : `annee_scolaire_id`)
- Composants React : PascalCase
- Un composant par fichier
- Les appels Supabase sont isolés dans un dossier `/src/lib/` — jamais directement dans les composants

## Structure des dossiers

```
src/
  components/       composants réutilisables (boutons, modales, etc.)
  pages/            une page par vue principale (Semaine, Gantt, Referentiel, Parametres)
  lib/              appels Supabase, helpers, moteur de projection
  hooks/            hooks React personnalisés
  types/            types TypeScript
```

## Règles métier critiques à ne jamais oublier

**Template vs instance** : les unités et progressions dans le référentiel sont des templates. Quand un planning annuel est créé, des instances (séances) sont générées. Modifier une instance ne modifie jamais le template. Modifier un template peut être poussé vers des instances choisies par l'utilisateur — jamais automatiquement.

**Annuler ≠ déplacer** : annuler une séance décale toutes les séances suivantes du planning d'un créneau. Déplacer une séance la repositionne sans toucher aux autres.

**Recalcul en cascade** : toute modification du calendrier (annulation, ajout, déplacement) déclenche un recalcul du planning à partir de la date modifiée uniquement — pas un recalcul complet de l'année.

**Débordement non bloquant** : si la progression contient plus d'unités que de créneaux disponibles dans l'année, ne pas bloquer. Enregistrer le nombre de séances en excès et afficher un avertissement visible dans la vue Gantt et dans les paramètres.

**Règle évaluations** : les évaluations sont placées automatiquement, mais la règle s'applique sur l'ensemble des classes de l'enseignant — pas par classe. Si une semaine dépasse `max_evaluations_semaine` (défaut : 2) toutes classes confondues, décaler à la semaine suivante disponible.

## Ordre de développement

Suis cet ordre et ne passe à l'étape suivante que quand la précédente est testée et fonctionnelle.

1. Mise en place du projet (Supabase, Vercel, GitHub, authentification Google)
2. Schéma de base de données complet (voir brief)
3. Paramètres — Matières (CRUD + couleurs)
4. Paramètres — Emploi du temps (grille cliquable)
5. Paramètres — Calendrier (import API Éducation nationale + édition manuelle)
6. Référentiel — Unités de cours (CRUD)
7. Référentiel — Progressions (ordonnancement drag-and-drop)
8. Moteur de projection (algorithme de distribution des séances)
9. Vue Semaine — sous-vue Liste
10. Vue Semaine — sous-vue Calendrier
11. Actions sur les séances (annulation, déplacement, ajout exceptionnel)
12. Alertes de préparation (impression, instructions élèves)
13. Vue Gantt avec zoom (3 niveaux : année, trimestre, mois)
14. Push template vers instances
15. Export PDF et CSV

## Ce qu'il ne faut pas faire

- Ne pas créer de logique de calcul directement dans les composants React — tout passe par `/src/lib/`
- Ne pas permettre à une modification d'instance de remonter vers le template
- Ne pas bloquer l'utilisateur en cas de conflit ou de débordement — toujours afficher un avertissement et laisser sauvegarder
- Ne pas construire de fonctionnalité d'édition de documents de cours — les documents sont des liens PDF externes, c'est tout
- Ne pas prévoir de gestion multi-utilisateur — l'application est strictement mono-utilisateur

## API Éducation nationale

L'API publique du calendrier scolaire est disponible à l'adresse suivante :
`https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records`

L'académie est paramétrable par l'utilisateur dans les paramètres. Prévoir un fallback en saisie manuelle si l'API est indisponible.

## Design

Le code couleur par matière est défini par l'utilisateur dans les paramètres (section Matières). Il doit être cohérent dans toutes les vues. Les séances passées sont toujours affichées en opacité réduite (0.45). Les évaluations ont un fond coloré distinctif dans la vue semaine et apparaissent comme des points colorés (#D85A30) dans le Gantt.
