-- Bornes de trimestres, configurables par année scolaire (nécessaires au
-- moteur de projection pour répartir les évaluations par trimestre).
-- Si non renseignées, le moteur retombe sur un découpage automatique en
-- trois tiers égaux de l'année scolaire (comportement non bloquant).

alter table annees_scolaires
  add column trimestre_2_debut date,
  add column trimestre_3_debut date;
