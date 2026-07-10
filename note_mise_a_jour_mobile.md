# Note de mise à jour: expérience mobile

Cette note décrit l'expérience mobile à construire. Elle complète `brief_planificateur_cours.md` et `CLAUDE.md`. Applique ces éléments au brief, au CLAUDE.md et au plan de développement.

## Intention

Sur mobile, l'application sert à consulter rapidement, pas à éditer. L'utilisateur veut vérifier une information en déplacement: quels cours aujourd'hui, qu'est-ce qui suit, qu'est-ce qu'il faut préparer. La construction des progressions, la création d'unités, le paramétrage de l'emploi du temps restent des tâches d'ordinateur. On ne cherche pas à optimiser ces pages complexes pour mobile, on assume qu'elles sont secondaires et simplement accessibles en lecture.

## Principe technique

Approche économe, en deux temps:

1. Responsive classique (Tailwind, préfixes de breakpoint) partout par défaut. Les vues existantes s'adaptent en largeur, les colonnes se replient, mais leur logique n'est pas repensée.
2. Une seule vue vraiment pensée pour le mobile: la vue du jour, décrite ci-dessous. C'est peu de travail pour beaucoup de confort.

Ne pas construire d'application mobile dédiée ni de double base de code. Une seule application React responsive, avec un affichage conditionnel limité à ce qui le justifie.

## La vue du jour (nouvel écran, mobile)

C'est l'écran d'accueil quand l'application est ouverte sur mobile. Elle affiche les cours du jour.

Contenu:
- En-tête avec le jour et la date en grand.
- Pastilles d'alerte du jour juste sous la date (nombre de documents à imprimer, nombre d'instructions élèves à transmettre).
- Liste verticale des cours du jour dans l'ordre chronologique. Chaque cours affiche: l'heure, un trait de couleur de la matière, le titre de l'unité, la classe et la matière, une icône de lien vers le document.
- Les alertes spécifiques à un cours (par exemple prévenir les élèves) apparaissent sous le cours concerné.
- Les évaluations ont un fond coloré distinctif.
- Les séances déjà faites sont barrées et estompées, avec une coche.
- Navigation simple en bas de la liste: hier / aujourd'hui / demain.

Actions possibles depuis cette vue (gestes simples, mobiles):
- Marquer une séance comme faite.
- Ouvrir le document lié.
- Cocher un document comme imprimé ou distribué (rejoint le système d'alertes de préparation).

## Navigation mobile

Sur mobile, remplacer la barre latérale de navigation par une barre d'onglets en bas de l'écran, plus naturelle au pouce. Onglets:
- Jour (la vue du jour, écran d'accueil mobile)
- Semaine (la vue semaine en liste, qui fonctionne bien en responsive vertical)
- Alertes (la liste de ce qui est à préparer: impressions, instructions élèves)
- Référentiel (accessible en lecture)

Le Gantt et les pages de paramétrage ne sont pas dans la barre d'onglets mobile principale. Ils restent atteignables mais ne sont pas mis en avant sur mobile.

## Ce qui reste en lecture seule confortable sur mobile

La vue calendrier en grille, le Gantt annuel, le référentiel en colonnes, la construction de progressions et les paramètres restent utilisables sur mobile via le responsive classique, sans refonte de leur interface d'édition. On ne bloque pas leur accès, on n'y investit pas de travail spécifique.

## Impact sur le plan de développement

Ajouter, après la vue Semaine (étapes actuelles autour de la vue semaine):
- Construire la vue du jour (mobile) comme écran d'accueil sur petit écran.
- Mettre en place la barre d'onglets mobile en bas.
- Vérifier le comportement responsive des vues complexes (calendrier, Gantt, référentiel, progressions, paramètres) pour qu'elles restent lisibles sans être repensées.

Ces éléments viennent après que les vues principales de bureau sont fonctionnelles. L'expérience mobile s'appuie sur les mêmes données et la même logique métier, seule la présentation change.
