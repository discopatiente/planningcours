# Note de mise à jour: devoirs, avancement, export, import, navigation

Cette note complète `brief_planificateur_cours.md` et `CLAUDE.md` et les notes précédentes. Applique ces changements au brief, au CLAUDE.md et au plan de développement.

## 1. Onglet Devoirs (remplace l'onglet Frise)

Renommer l'onglet Frise en Devoirs.

Nouvelle vue à l'intérieur: la liste des dates de devoir.
- Sélecteur de trimestre en haut (trimestre 1, 2 ou 3).
- Liste des devoirs du trimestre sélectionné avec leur date.
- Les dates sont modifiables directement dans cette vue.
- Modifier une date de devoir met à jour la progression correspondante dans la vue Semaine (recalcul en cascade, cohérent avec la logique déjà en place pour les séances).

La règle de placement automatique et la contrainte du nombre maximum de devoirs par semaine (toutes classes confondues) restent valables. Cette vue permet l'ajustement manuel des dates après placement automatique.

## 2. Remplacement du Gantt par un tableau de bord d'avancement

La vue Gantt ne fonctionne pas bien: en affichant les unités sur un axe calendaire, l'information utile n'est pas lisible. On la remplace.

Nouvelle vue « Où j'en suis » (tableau de bord d'avancement par classe):
- L'axe n'est plus le temps calendaire mais la séquence de chapitres.
- Une ligne par classe.
- Sur chaque ligne, les chapitres s'enchainent de gauche à droite. La largeur d'un bloc de chapitre reflète son nombre d'unités.
- États visuels: chapitre terminé en couleur claire avec une coche, chapitre en cours en couleur pleine, chapitres à venir en gris.
- Sous chaque ligne, une phrase indique précisément la position (quelle unité dans quel chapitre) et le statut: dans les temps ou en retard.
- En haut de la vue, un indicateur temporel léger (par exemple « semaine 13 sur 36 ») et un résumé des classes en retard.

Ce qu'on affiche donc: les chapitres, pas les unités individuelles. L'objectif de cette vue est de répondre d'un coup d'oeil à la question « où j'en suis avec chaque classe ». On accepte de perdre la dimension calendaire précise (vacances, dates exactes) qui n'est pas l'objet de cette vue.

Supprimer l'ancienne vue Gantt et ses trois niveaux de zoom. Le tableau de bord d'avancement la remplace entièrement.

## 3. Revue du panneau d'export

- Retirer la visualisation du tableau de prévisualisation, inutile.
- Proposer deux modes d'export:
  - Export d'une progression à sélectionner (une seule progression).
  - Export d'une année entière (toutes les progressions de toutes les classes et matières).
- L'export reste dans les Paramètres.
- Conserver les formats de sortie déjà prévus (PDF imprimable, CSV).

## 4. Import CSV des unités de cours

- L'import d'unités de cours doit supporter le format CSV séparé par point-virgule (format français), en plus de la virgule.
- Détecter ou permettre de choisir le séparateur.
- L'import reste dans la page Unités de cours (ne pas le déplacer).

## 5. Nouvel ordre des onglets du panneau latéral

Regrouper les onglets en trois familles avec des séparateurs visuels. L'ordre reflète l'usage: consulter en haut (usage quotidien une fois l'année lancée), construire au milieu (préparation), régler en bas (rare une fois configuré).

Consulter:
- Semaine (écran d'accueil par défaut sur ordinateur)
- Devoirs
- Élèves
- Où j'en suis (le tableau de bord d'avancement qui remplace le Gantt)

Construire:
- Unités de cours (contient l'import CSV)
- Chapitres
- Progressions

Régler:
- Paramètres (emploi du temps, calendrier, matières, export)

Semaine reste l'écran d'accueil par défaut sur ordinateur.

## Note sur les onglets Élèves et Chapitres

Ces deux onglets font partie de l'application mais n'étaient pas détaillés dans le brief initial.
- Élèves: suivi de qui a passé quel devoir et qui était absent. Rattaché à la famille Consulter.
- Chapitres: création et modification des chapitres (cohérent avec la note précédente introduisant le niveau chapitre entre unité et progression). Rattaché à la famille Construire.

Point à clarifier plus tard avec l'utilisateur si besoin: la relation exacte entre l'onglet Devoirs et l'onglet Élèves (deux onglets distincts pour l'instant, éventuellement Élèves comme sous-vue de Devoirs à reconsidérer).
