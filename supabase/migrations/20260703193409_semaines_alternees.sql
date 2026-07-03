-- Support de l'alternance semaine A / semaine B.
-- La référence est une date explicite (lundi d'une semaine "A") par année
-- scolaire ; l'alternance de chaque créneau se calcule à partir de là.

alter table annees_scolaires
  add column reference_semaine_a_date date;

alter table emploi_du_temps
  add column frequence text not null default 'toutes_les_semaines'
    check (frequence in ('toutes_les_semaines', 'semaine_a', 'semaine_b'));
