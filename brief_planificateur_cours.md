# Brief — Planificateur de cours annuel

## Contexte

Application web hébergée, usage solo, pour un enseignant gérant 7+ classes et matières. L'objectif est de construire un référentiel de cours réutilisable d'une année sur l'autre, puis de le projeter automatiquement sur une année scolaire réelle selon un emploi du temps paramétrable.

---

## Stack technique

- **Frontend** : React + Vite
- **Base de données** : Supabase (PostgreSQL hébergé) — gratuit pour usage personnel
- **Authentification** : Supabase Auth avec connexion Google
- **Hébergement** : Vercel (déploiement continu depuis GitHub)

---

## Architecture des données

### Niveau 1 — Chapitres et unités de cours (templates, la réserve)

Le référentiel de contenu vit dans la page « Unités de cours » : un espace de stockage organisé, sans notion de temps ni de calendrier. Il est structuré en deux niveaux.

**Chapitres** — un chapitre regroupe des unités de cours et sert de trame réutilisable pour construire des progressions.

- `id`
- `nom`
- `matiere_id`
- `archive` (booléen — un chapitre archivé disparaît de la vue courante de la réserve mais reste accessible dans une section « Archives » ; ses unités restent piochables lors de la construction d'une progression. L'archivage n'est jamais une suppression.)
- `created_at`, `updated_at`

**Unités de cours** — l'élément de base du référentiel.

- `id`
- `titre`
- `matiere_id` (référence vers la table matières)
- `chapitre_id` (référence vers un chapitre — optionnelle, une unité doit pouvoir survivre à son chapitre d'origine et être reprise ailleurs)
- `ordre_interne_par_defaut` (entier — position de l'unité dans la trame par défaut de son chapitre, sert de base lorsqu'un chapitre est ajouté à une progression)
- `delai_impression_jours` (entier — nombre de jours avant le cours pour imprimer)
- `delai_eleves_jours` (entier — nombre de jours avant le cours pour prévenir les élèves)
- `instruction_eleves` (texte libre — contenu du message à transmettre aux élèves)
- `notes` (texte libre — observations personnelles)
- `created_at`, `updated_at`

**Ressources** — remplace l'ancien champ unique `lien_pdf`. Une unité peut porter plusieurs ressources de natures différentes (support de cours, vidéos, exercices, devoirs possibles). Les ressources appartiennent à une seule unité, sans mutualisation entre unités : si un même lien réapparait dans deux unités, ce sont deux ressources distinctes.

- `id`
- `unite_id`
- `type` (enum : `support`, `video`, `exercice`, `devoir_possible`, `lien_utile`)
- `libelle`
- `url`
- `ordre` (entier)

> Le document de cours principal devient une ressource de type `support`.

### Niveau 2 — Progressions (templates, la temporalité)

La page « Progressions » est là où les unités reçoivent une temporalité. Une progression s'assemble chapitre par chapitre — elle n'est jamais préremplie automatiquement avec tout le contenu du référentiel. Plusieurs progressions peuvent utiliser les mêmes unités dans un ordre différent.

- `id`
- `nom`
- `matiere_id`
- `created_at`, `updated_at`

Table de jointure `progression_unites` :
- `progression_id`
- `unite_id`
- `position` (entier — ordre dans la progression)

Quand un chapitre est ajouté à une progression, ses unités arrivent dans l'ordre défini par `ordre_interne_par_defaut`, mais cet ordre est copié dans `progression_unites.position` : à partir de là, c'est une copie modifiable propre à cette progression. L'utilisateur peut réordonner, retirer ou ajouter des unités sans que cela affecte le chapitre d'origine ni les autres progressions. C'est un modèle hybride : le chapitre fournit une trame par défaut pour gagner du temps, la progression garde la liberté d'en dévier par classe.

### Niveau 3 — Plannings annuels (instances)

La projection d'une progression sur une année réelle. Chaque planning est associé à une classe, une progression, une année scolaire et un emploi du temps.

- `id`
- `classe_id`
- `progression_id`
- `annee_scolaire_id`
- `created_at`, `updated_at`

Table `seances` (instances des unités dans un planning) :
- `id`
- `planning_id`
- `unite_id` (référence vers le template d'origine — permet le push de mises à jour)
- `date`
- `heure_debut`
- `statut` (enum : `a_venir`, `fait`, `annulee`, `deplacee`)
- `motif_annulation` (texte libre, optionnel)
- `notes_seance` (texte libre, observations post-cours)
- `override_titre` (si l'unité a été modifiée localement)
- `override_instruction_eleves`
- `override_delai_impression_jours`
- `override_delai_eleves_jours`

> Les champs `override_*` permettent de modifier localement une séance sans toucher au template. Si null, la séance hérite des valeurs du template. Le champ `override_lien_pdf` disparait avec le passage aux ressources multiples ; la manière dont une séance surchargera localement ses ressources reste à concevoir lors de la construction du moteur de projection (étape 9).

### Niveau 4 — Évaluations (instances)

- `id`
- `planning_id`
- `date`
- `heure_debut`
- `trimestre` (1, 2 ou 3)
- `titre` (optionnel)
- `statut` (enum : `a_venir`, `fait`, `annulee`)

### Tables de support

**matières**
- `id`, `nom`, `couleur` (code hex)

**classes**
- `id`, `nom`, `niveau`

**annees_scolaires**
- `id`, `libelle` (ex : "2025-2026"), `date_debut`, `date_fin`, `active` (booléen)

**emploi_du_temps**
- `id`, `annee_scolaire_id`, `jour_semaine` (0=lundi…4=vendredi), `heure_debut`, `classe_id`, `matiere_id`

**periodes_calendrier** (vacances et jours fériés)
- `id`, `annee_scolaire_id`, `nom`, `date_debut`, `date_fin`, `type` (enum : `vacances`, `ferie`)

**parametres**
- `id`, `evaluations_par_trimestre` (défaut : 3), `max_evaluations_semaine` (défaut : 2)

---

## Logique métier — Moteur de projection

Au déclenchement (début d'année ou recalcul) :

1. Récupérer l'emploi du temps de l'année pour la classe concernée.
2. Lister toutes les dates de cours de l'année (selon l'emploi du temps).
3. Exclure les dates tombant dans une période de vacances ou un jour férié.
4. Distribuer les unités de la progression dans l'ordre, une par créneau disponible.
5. Placer les évaluations selon les règles : `evaluations_par_trimestre` par trimestre, en vérifiant que la règle `max_evaluations_semaine` (toutes classes confondues) est respectée. Si conflit, décaler l'évaluation à la semaine suivante disponible.
6. En cas de débordement (plus d'unités que de créneaux disponibles), ne pas bloquer — enregistrer le nombre de séances en excès et afficher un avertissement.

### Recalcul en cascade

Tout événement modifiant le calendrier d'un planning déclenche un recalcul partiel à partir de la date modifiée :
- Annulation d'une séance → les suivantes décalent d'un créneau.
- Ajout d'une séance exceptionnelle → les suivantes avancent d'un créneau.
- Déplacement d'une séance → repositionnement sans décalage des autres.

### Push depuis le template vers les instances

Quand l'utilisateur modifie une unité dans le référentiel et choisit de pousser vers des instances :
- Seuls les champs de contenu sont mis à jour (`titre`, `instruction_eleves`, `delai_impression_jours`, `delai_eleves_jours`, ainsi que les ressources rattachées).
- Les champs de position (`date`, `heure_debut`, `statut`) ne sont jamais affectés.
- L'utilisateur choisit les classes cibles via une liste à cocher.

---

## Fonctionnalités et vues

### 1. Vue semaine

Navigation semaine par semaine. Deux sous-vues basculables via un toggle :

**Sous-vue Liste**
- Jours affichés en blocs verticaux.
- Chaque créneau affiche : heure, titre de l'unité, classe, matière, case à cocher (fait/à faire), icône lien PDF.
- Barre d'alertes en haut de page : récapitulatif des impressions à faire et instructions élèves à transmettre cette semaine.
- Les évaluations ont un fond coloré distinctif.
- Les séances passées sont en opacité réduite.

**Sous-vue Calendrier**
- Grille jours (colonnes) × heures (lignes), style Google Calendar.
- Ligne rouge horizontale indiquant l'heure actuelle.
- La date du jour est mise en évidence dans l'en-tête.
- Les jours sans cours ont un fond légèrement différent.
- Toggle Liste / Calendrier en haut à droite — pas deux entrées distinctes dans la navigation.

**Actions sur un créneau** (panneau latéral au clic) :
- Marquer comme fait.
- Annuler la séance (avec motif optionnel) → recalcul en cascade.
- Déplacer vers un autre créneau → repositionnement sans décalage.
- Ajouter une séance exceptionnelle hors emploi du temps → recalcul.
- Ouvrir le lien PDF.
- Ajouter une note post-cours.

### 2. Vue Gantt

Vue annuelle. Toggle en haut pour basculer entre trois modes :
- **Par classe** : une ligne par classe, toutes matières confondues.
- **Par matière** : une ligne par progression — comparaison de l'avancement entre classes.
- **Ma charge** : densité globale semaine par semaine, toutes classes confondues.

Trois niveaux de zoom accessibles via boutons +/− :
- **Année** : tous les mois visibles, blocs compressés avec titre tronqué.
- **Trimestre** : 3 mois visibles, titre complet + nombre de séances dans les blocs.
- **Mois** : 4 semaines visibles, vue la plus détaillée.

Éléments visuels :
- Vacances en hachures sur toutes les lignes.
- Évaluations en points colorés sur la ligne.
- Ligne verticale rouge indiquant aujourd'hui.
- Blocs passés en opacité réduite.
- Alerte de débordement visible en permanence dans la barre du haut si applicable.

### 3. Unités de cours (la réserve)

La réserve, sans notion de temps ni de calendrier. Interface en trois colonnes :

**Colonne gauche — Chapitres**
- Liste des chapitres groupés par matière, chaque matière rétractable.
- Section « Archives » séparée pour les chapitres archivés.
- Recherche par texte.
- Boutons "Nouveau chapitre" et archivage/désarchivage.
- Clic sur un chapitre → affichage de ses unités (dans l'ordre de la trame par défaut) dans la colonne du milieu.

**Colonne du milieu — Unités du chapitre**
- Liste des unités du chapitre sélectionné, réordonnables (met à jour `ordre_interne_par_defaut`).
- Bouton "Nouvelle unité" (rattachée au chapitre courant).
- Clic sur une unité → affichage dans la colonne de droite.

**Colonne droite — Détail de l'unité**
- Deux onglets : Contenu / Instances.
- Onglet Contenu : titre, matière, chapitre, délais de préparation, instruction élèves, notes, et la liste de ses ressources (ajout, édition, réordonnancement, suppression — support, vidéo, exercice, devoir possible, lien utile).
- Onglet Instances : liste des classes qui utilisent cette unité dans leur planning en cours, avec bouton de push individuel ou global.
- Actions en bas : Modifier, Dupliquer, Changer de chapitre, Supprimer.

### 4. Progressions (la temporalité)

Là où les unités reçoivent une date. Interface en deux colonnes :

**Colonne gauche — Liste des progressions**
- Progressions groupées par matière, avec barre de progression (avancement de l'année).
- Bouton "Nouvelle progression".

**Colonne droite — Construction de la progression sélectionnée**
- Sélecteur pour ajouter un chapitre (y compris depuis les Archives) : ses unités sont importées dans l'ordre de leur trame par défaut, en copie propre à cette progression.
- Liste des unités de la progression, réordonnables par drag-and-drop, avec possibilité de retirer une unité ou d'en ajouter une isolément (sans passer par tout son chapitre).
- Chaque unité dans la liste indique son statut (passé, en cours, à venir) et le chapitre dont elle est issue.
- Ces modifications n'affectent jamais le chapitre d'origine ni les autres progressions.

### 5. Paramètres

Navigation secondaire à gauche avec les sections :

**Emploi du temps**
- Grille jours × heures, cliquable pour affecter une classe/matière à un créneau.
- Bouton "Copier depuis l'année précédente".
- Sélecteur d'année active + bouton "Nouvelle année".

**Calendrier**
- Import automatique depuis l'API du calendrier scolaire de l'Éducation nationale (académie paramétrable).
- Liste des périodes importées (vacances, jours fériés) avec possibilité d'ajouter, modifier ou supprimer manuellement.

**Évaluations**
- Nombre d'évaluations par trimestre (défaut : 3, modifiable).
- Nombre maximum d'évaluations par semaine toutes classes confondues (défaut : 2, modifiable).

**Matières**
- Liste des matières avec leur couleur associée.
- Ajout, modification, suppression.

**Export**
- Export du planning annuel en PDF imprimable.
- Export en CSV/Excel.

---

## Règles UX importantes

- La navigation principale (sidebar gauche) contient : Semaine, Gantt, Unités de cours, Progressions, Paramètres.
- Le toggle Liste/Calendrier est dans la vue Semaine uniquement, en haut à droite — pas dans la sidebar.
- Annuler une séance et la déplacer sont deux actions distinctes avec des effets différents sur la progression : l'annulation décale, le déplacement ne décale pas.
- Aucune action ne bloque l'utilisateur : les débordements et conflits sont signalés sans empêcher la sauvegarde.
- Code couleur par matière cohérent dans toutes les vues (semaine, Gantt, unités de cours, progressions).
- Les séances passées sont toujours affichées en opacité réduite.

---

## Ordre de développement recommandé

1. Mise en place du projet (Supabase, Vercel, GitHub, authentification Google).
2. Création du schéma de base de données.
3. Module Paramètres — Matières et Emploi du temps (saisie des données de base).
4. Module Paramètres — Calendrier (import API + édition manuelle).
5. Page Unités de cours — gestion des chapitres (CRUD, archivage).
6. Page Unités de cours — gestion des unités et de leurs ressources (CRUD, rattachement à un chapitre).
7. Page Progressions — assemblage de chapitres et ordonnancement des unités avec déviation par progression.
8. Moteur de projection (algorithme de distribution des séances).
9. Vue Semaine — sous-vue Liste.
10. Vue Semaine — sous-vue Calendrier.
11. Gestion des actions sur les séances (annulation, déplacement, ajout exceptionnel).
12. Système d'alertes de préparation.
13. Vue Gantt avec zoom.
14. Système de push template → instances.
15. Export PDF et CSV.

---

## Évolutions futures (hors périmètre actuel)

- **Activités optionnelles activables en cours d'année** : une unité en réserve dans un chapitre, insérée dans le planning seulement si une classe avance vite ou rencontre des difficultés. Besoin identifié mais reporté — ne pas l'implémenter pour l'instant.
