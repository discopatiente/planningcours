# Note de mise à jour: révision de la gestion des unités et progressions

Cette note décrit des modifications à apporter au modèle défini dans `brief_planificateur_cours.md` et `CLAUDE.md`. Elle prime sur ces deux fichiers en cas de contradiction. Applique ces changements au brief, au CLAUDE.md et au schéma de base de données avant de continuer le développement.

## Résumé de l'intention

La gestion des unités de cours et celle des progressions doivent être séparées en deux pages distinctes. La page des unités est une réserve, un stock organisé. La page des progressions est là où les unités reçoivent une temporalité, en étant assemblées et ordonnées sur l'année. Un niveau intermédiaire nouveau est introduit entre l'unité et la progression: le chapitre.

## Changement 1: introduction des chapitres

Un chapitre est un regroupement d'unités de cours. Il sert à organiser la réserve et à structurer les progressions.

Nouvelle table `chapitres`:
- `id`
- `nom`
- `matiere_id`
- `ordre_interne_par_defaut` (l'ordre des unités dans le chapitre, servant de trame par défaut)
- `archive` (booléen, voir changement 3)
- `created_at`, `updated_at`

Une unité appartient à un chapitre via un champ `chapitre_id` dans la table `unites`. L'ordre des unités à l'intérieur d'un chapitre est défini au niveau du chapitre et sert de trame par défaut lorsqu'on ajoute ce chapitre à une progression.

## Changement 2: séparation en deux pages

La page actuelle du référentiel doit être scindée.

Page « Unités de cours » (la réserve):
- Création et édition des unités.
- Création et édition des chapitres.
- Navigation dans un grand nombre d'unités, regroupées par chapitre.
- C'est un espace de stockage, sans notion de temps ni de calendrier.

Page « Progressions » (la temporalité):
- Construction d'une progression en assemblant des chapitres.
- Quand un chapitre est ajouté à une progression, ses unités arrivent dans l'ordre interne par défaut du chapitre, mais cet ordre devient une copie modifiable propre à cette progression.
- L'utilisateur peut réordonner les unités, en retirer, en ajouter, sans que cela affecte le chapitre d'origine ni les autres progressions.
- La progression est construite chapitre par chapitre, pas préremplie automatiquement avec tout le contenu.

Point important sur la logique: le chapitre porte un ordre par défaut pour éviter de tout reconstruire à chaque fois, mais la progression garde la liberté de dévier de cette trame. C'est un modèle hybride entre « le chapitre décide tout » et « la progression décide tout ». La trame par défaut fait gagner du temps, la déviation par classe reste possible sans effort.

## Changement 3: chapitres et unités archivés

L'utilisateur conserve d'anciens chapitres qu'il n'utilise plus, mais dont certaines unités peuvent resservir. Une unité doit pouvoir survivre à son chapitre d'origine et être reprise ailleurs.

Prévoir une notion d'archive:
- Un chapitre peut être archivé (`archive = true`). Il disparait de la vue courante de la réserve mais reste accessible dans une section « Archives ».
- Lors de la construction d'une progression, l'utilisateur peut piocher des unités dans les chapitres archivés.
- Rien n'est jamais supprimé par l'archivage. C'est une mise de côté, pas une suppression.

## Changement 4: ressources multiples attachées à une unité

Le modèle précédent prévoyait un seul lien PDF par unité. Ce n'est pas suffisant. Une unité peut porter plusieurs ressources de natures différentes: un support de cours, une ou plusieurs vidéos, des exercices, un ou des devoirs possibles.

Nouvelle table `ressources`:
- `id`
- `unite_id`
- `type` (enum: `support`, `video`, `exercice`, `devoir_possible`, `lien_utile`)
- `libelle`
- `url`
- `ordre`

Les ressources appartiennent à une seule unité et vivent avec elle. Il n'y a pas de bibliothèque de ressources partagées entre unités, pas de mutualisation. Si un même lien réapparait dans deux unités, ce sont deux ressources distinctes. Cette décision est volontaire: une ressource comme une vidéo est pensée autour de l'unité qui la contient, l'objet pédagogique est indissociable de sa mise en scène. Ne pas construire de logique de partage de ressources.

Le champ `lien_pdf` de la table `unites` est donc remplacé par cette table `ressources`. Le document de cours principal devient une ressource de type `support`.

## Ce qui ne change pas

La relation template/instance reste identique. Les unités et chapitres et progressions sont des templates. Le moteur de projection génère des instances (séances) sur l'année. Modifier une instance ne modifie jamais le template. La logique de push du template vers les instances choisies reste valable, appliquée maintenant aussi aux ressources.

Le reste du brief (moteur de projection, vue semaine, vue Gantt, paramètres, gestion des débordements, règles d'évaluation) reste inchangé.

## Point reporté

La gestion des activités optionnelles activables en cours d'année (une unité en réserve dans un chapitre, qu'on insère dans le planning seulement si la classe avance vite ou a des difficultés) est un besoin identifié mais reporté à plus tard. Ne pas l'implémenter pour l'instant. Le noter simplement comme évolution future.

## Ordre de développement révisé

Remplacer les étapes 6 et 7 du CLAUDE.md par:
6. Page Unités de cours: gestion des chapitres (CRUD, archivage)
7. Page Unités de cours: gestion des unités et de leurs ressources (CRUD, rattachement à un chapitre)
8. Page Progressions: assemblage de chapitres et ordonnancement des unités avec déviation par progression

Décaler les étapes suivantes en conséquence.
