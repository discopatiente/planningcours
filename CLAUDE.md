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
  pages/            une page par vue principale (Semaine, Gantt, UnitesDeCours, Progressions, Parametres)
  lib/              appels Supabase, helpers, moteur de projection
  hooks/            hooks React personnalisés
  types/            types TypeScript
```

## Règles métier critiques à ne jamais oublier

**Template vs instance** : les unités et progressions dans le référentiel sont des templates. Quand un planning annuel est créé, des instances (séances) sont générées. Modifier une instance ne modifie jamais le template. Modifier un template peut être poussé vers des instances choisies par l'utilisateur — jamais automatiquement.

**Annuler ≠ déplacer** : annuler une séance décale toutes les séances suivantes du planning d'un créneau. Déplacer une séance la repositionne sans toucher aux autres.

**Recalcul en cascade** : toute modification du calendrier (annulation, ajout, déplacement) déclenche un recalcul du planning à partir de la date modifiée uniquement — pas un recalcul complet de l'année.

**Débordement non bloquant** : si la progression contient plus d'unités que de créneaux disponibles dans l'année, ne pas bloquer. Enregistrer le nombre de séances en excès et afficher un avertissement visible dans la vue Gantt et dans les paramètres.

**Chapitres, unités et archivage** : les unités de cours sont regroupées en chapitres, qui servent de trame par défaut (ordre interne) réutilisable. Une progression s'assemble chapitre par chapitre ; une fois un chapitre ajouté, l'ordre de ses unités devient une copie modifiable propre à cette progression — réordonner, retirer ou ajouter des unités dans une progression n'affecte jamais le chapitre d'origine ni les autres progressions. Archiver un chapitre (`archive = true`) n'est jamais une suppression : il disparait de la vue courante mais ses unités restent piochables pour construire de nouvelles progressions. Une unité peut survivre à son chapitre d'origine.

**Ressources multiples, pas de mutualisation** : une unité porte plusieurs ressources typées (`support`, `video`, `exercice`, `devoir_possible`, `lien_utile`) via la table `ressources`, chacune propre à une seule unité. Ne jamais construire de logique de partage/mutualisation de ressources entre unités, même si l'URL est identique.

**Règle évaluations** : les évaluations sont placées automatiquement, mais la règle s'applique sur l'ensemble des classes de l'enseignant — pas par classe. Si une semaine dépasse `max_evaluations_semaine` (défaut : 2) toutes classes confondues, décaler à la semaine suivante disponible.

## Ordre de développement

Suis cet ordre et ne passe à l'étape suivante que quand la précédente est testée et fonctionnelle.

1. Mise en place du projet (Supabase, Vercel, GitHub, authentification Google)
2. Schéma de base de données complet (voir brief)
3. Paramètres — Matières (CRUD + couleurs)
4. Paramètres — Emploi du temps (grille cliquable)
5. Paramètres — Calendrier (import API Éducation nationale + édition manuelle)
6. Page Unités de cours — gestion des chapitres (CRUD, archivage)
7. Page Unités de cours — gestion des unités et de leurs ressources (CRUD, rattachement à un chapitre)
8. Page Progressions — assemblage de chapitres et ordonnancement des unités avec déviation par progression
9. Moteur de projection (algorithme de distribution des séances)
10. Vue Semaine — sous-vue Liste
11. Vue Semaine — sous-vue Calendrier
12. Actions sur les séances (annulation, déplacement, ajout exceptionnel)
13. Alertes de préparation (impression, instructions élèves)
14. Vue Gantt avec zoom (3 niveaux : année, trimestre, mois)
15. Push template vers instances
16. Export PDF et CSV
17. Expérience mobile — vue du jour (écran d'accueil mobile), barre d'onglets en bas, passe responsive sur les vues existantes

## Ce qu'il ne faut pas faire

- Ne pas créer de logique de calcul directement dans les composants React — tout passe par `/src/lib/`
- Ne pas permettre à une modification d'instance de remonter vers le template
- Ne pas bloquer l'utilisateur en cas de conflit ou de débordement — toujours afficher un avertissement et laisser sauvegarder
- Ne pas construire de fonctionnalité d'édition de documents de cours — les documents sont des liens PDF externes, c'est tout
- Ne pas prévoir de gestion multi-utilisateur — l'application est strictement mono-utilisateur
- Ne pas implémenter les activités optionnelles activables en cours d'année (unité de réserve insérée seulement si une classe avance vite ou a des difficultés) — besoin identifié mais reporté

## API Éducation nationale

L'API publique du calendrier scolaire est disponible à l'adresse suivante :
`https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records`

L'académie est paramétrable par l'utilisateur dans les paramètres. Prévoir un fallback en saisie manuelle si l'API est indisponible.

## Design

Le code couleur par matière est défini par l'utilisateur dans les paramètres (section Matières). Il doit être cohérent dans toutes les vues. Les séances passées sont toujours affichées en opacité réduite (0.45). Les évaluations ont un fond coloré distinctif dans la vue semaine et apparaissent comme des points colorés (#D85A30) dans le Gantt.

Sur mobile, l'application sert à la consultation, pas à l'édition (voir étape 17) : seule la vue du jour est pensée spécifiquement pour ce format, le reste passe en responsive classique sans refonte. Pas de Tailwind dans ce projet — le responsive s'implémente avec des media queries CSS classiques dans `src/index.css`, cohérent avec le reste des styles.
