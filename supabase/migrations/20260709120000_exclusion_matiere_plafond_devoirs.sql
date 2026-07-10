-- Permet d'exclure une matière (ex. SNT) de la règle max_evaluations_semaine :
-- ses devoirs ne sont ni bloqués par le plafond hebdomadaire, ni comptés
-- dedans pour les devoirs des autres matières.
alter table matieres add column max_evaluations_exclu boolean not null default false;
