-- Retire le statut `retard` introduit dans la migration précédente
-- (20260711100000) : la mécanique qui le créait (un créneau vide déplaçant
-- son propre contenu) ne correspondait pas à l'usage réel décrit par
-- l'utilisateur. Remplacée par deux actions qui ne créent jamais de
-- créneau vide : « besoin d'une séance de plus » (insertion d'une vraie
-- suite) et « j'ai de l'avance » (la séance devenue inutile est marquée
-- faite à la date réelle, jamais un trou). Aucune donnée réelle n'utilisait
-- ce statut (seulement des séances de test déjà nettoyées).
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
  check (statut in ('a_venir', 'fait', 'annulee', 'deplacee'));
