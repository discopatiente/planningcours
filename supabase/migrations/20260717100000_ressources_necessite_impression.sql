-- Chaque ressource porte désormais explicitement si elle nécessite une
-- impression, plutôt que de le déduire uniquement de son type. Pré-rempli
-- selon le type à la création, modifiable ensuite au cas par cas (ex. un
-- support PDF prévu uniquement pour être projeté au tableau).
alter table ressources
  add column necessite_impression boolean not null default true;

update ressources
set necessite_impression = false
where type in ('video', 'lien_utile');
