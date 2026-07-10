-- Suivi imprimé/distribué par ressource et par occurrence de séance, pour
-- l'onglet Impressions : contrairement aux alertes de préparation
-- (calculées à la volée depuis les délais de l'unité), cet état doit
-- persister et être coché indépendamment pour chaque ressource utilisée
-- dans chaque séance.
create table seance_ressources_etat (
  id uuid primary key default gen_random_uuid(),
  seance_id uuid not null references seances(id) on delete cascade,
  ressource_id uuid not null references ressources(id) on delete cascade,
  imprime boolean not null default false,
  distribue boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seance_id, ressource_id)
);

create trigger set_seance_ressources_etat_updated_at
  before update on seance_ressources_etat
  for each row
  execute function set_updated_at();

alter table seance_ressources_etat enable row level security;

create policy "authenticated_full_access" on seance_ressources_etat for all to authenticated
  using (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com')
  with check (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com');
