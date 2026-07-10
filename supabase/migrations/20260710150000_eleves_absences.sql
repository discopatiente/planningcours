-- TODO points 5+6 : liste d'élèves par classe et rattrapage des devoirs
-- manqués. Une absence n'est enregistrée que pour les élèves cochés
-- absents lors de la prise de présence d'une évaluation (pas de ligne pour
-- les présents) ; rattrapage_seance_id reste null tant que l'absence n'est
-- pas rattrapée dans un créneau de cours, et référence ce créneau une fois
-- attachée.
create table eleves (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references classes(id) on delete cascade,
  nom text not null,
  prenom text not null,
  created_at timestamptz not null default now()
);

create table absences_evaluation (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  eleve_id uuid not null references eleves(id) on delete cascade,
  rattrapage_seance_id uuid references seances(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (evaluation_id, eleve_id)
);

alter table eleves enable row level security;
alter table absences_evaluation enable row level security;

create policy "authenticated_full_access" on eleves for all to authenticated
  using (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com')
  with check (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com');

create policy "authenticated_full_access" on absences_evaluation for all to authenticated
  using (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com')
  with check (auth.jwt() ->> 'email' = 'remi.girardet@gmail.com');
