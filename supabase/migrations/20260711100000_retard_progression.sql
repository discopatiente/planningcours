-- Rattrapage de retard de progression : deux niveaux.
--
-- Léger (pas de décalage de dates) : `non_terminee` marque qu'une séance
-- déborde sur la suivante, dont le titre affiché est alors recalculé
-- dynamiquement pour montrer les deux unités (aucun champ dénormalisé côté
-- séance suivante — retrouvée par ordre chronologique à l'affichage).
alter table seances add column non_terminee boolean not null default false;

-- Important (décalage de toute la suite d'un cran) : nouveau statut
-- `retard`, volontairement distinct de `annulee` pour ne jamais confondre
-- un choix de rythme de progression avec une vraie annulation (absence,
-- jour férié...). Le nom exact de la contrainte check existante n'est pas
-- garanti (auto-généré par Postgres) : on la retrouve dynamiquement plutôt
-- que de supposer son nom.
do $$
declare
  nom_contrainte text;
begin
  select conname into nom_contrainte
  from pg_constraint
  where conrelid = 'seances'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%statut%';
  if nom_contrainte is not null then
    execute format('alter table seances drop constraint %I', nom_contrainte);
  end if;
end $$;

alter table seances add constraint seances_statut_check
  check (statut in ('a_venir', 'fait', 'annulee', 'deplacee', 'retard'));
