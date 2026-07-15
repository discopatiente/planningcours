-- Banque de devoirs : réservoir réutilisable de devoirs (titre, matière,
-- niveau, notion, liens sujet/corrigé), consultable depuis Construire au
-- même titre que les unités de cours. Indépendante des évaluations
-- programmées dans les plannings — piocher dedans reste manuel pour l'instant.

create table banque_devoirs (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  matiere_id uuid not null references matieres(id) on delete restrict,
  niveau text not null check (niveau in ('seconde', 'premiere', 'terminale')),
  notion text,
  lien_sujet text,
  lien_corrige text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index banque_devoirs_matiere_id_idx on banque_devoirs(matiere_id);

create trigger set_banque_devoirs_updated_at
  before update on banque_devoirs
  for each row
  execute function set_updated_at();

alter table banque_devoirs enable row level security;
create policy "authenticated_full_access" on banque_devoirs for all to authenticated
  using (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com')
  with check (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com');
