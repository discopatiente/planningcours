-- Permet d'attribuer à un devoir programmé (evaluations) un sujet piocher
-- dans la banque de devoirs, au lieu de ressaisir manuellement les liens
-- sujet/corrigé. Optionnel : un devoir programmé reste utilisable sans lien
-- vers la banque (liens manuels existants inchangés).

alter table evaluations
  add column banque_devoir_id uuid references banque_devoirs(id) on delete set null;

create index evaluations_banque_devoir_id_idx on evaluations(banque_devoir_id);
