-- Schéma initial du planificateur de cours annuel
-- Voir brief_planificateur_cours.md pour le détail des règles métier.

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables de support
-- ---------------------------------------------------------------------------

create table matieres (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  couleur text not null
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  niveau text
);

create table annees_scolaires (
  id uuid primary key default gen_random_uuid(),
  libelle text not null,
  date_debut date not null,
  date_fin date not null,
  active boolean not null default false
);

create table emploi_du_temps (
  id uuid primary key default gen_random_uuid(),
  annee_scolaire_id uuid not null references annees_scolaires(id) on delete cascade,
  jour_semaine smallint not null check (jour_semaine between 0 and 4),
  heure_debut time not null,
  classe_id uuid not null references classes(id) on delete cascade,
  matiere_id uuid not null references matieres(id) on delete cascade
);

create table periodes_calendrier (
  id uuid primary key default gen_random_uuid(),
  annee_scolaire_id uuid not null references annees_scolaires(id) on delete cascade,
  nom text not null,
  date_debut date not null,
  date_fin date not null,
  type text not null check (type in ('vacances', 'ferie'))
);

-- Table singleton (une seule ligne de paramètres globaux).
create table parametres (
  id smallint primary key default 1 check (id = 1),
  evaluations_par_trimestre integer not null default 3,
  max_evaluations_semaine integer not null default 2
);

insert into parametres (id) values (1);

-- ---------------------------------------------------------------------------
-- Niveau 1 — Unités de cours (templates)
-- ---------------------------------------------------------------------------

create table unites (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  matiere_id uuid not null references matieres(id) on delete restrict,
  lien_pdf text,
  delai_impression_jours integer,
  delai_eleves_jours integer,
  instruction_eleves text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_unites_updated_at
  before update on unites
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Niveau 2 — Progressions (templates)
-- ---------------------------------------------------------------------------

create table progressions (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  matiere_id uuid not null references matieres(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_progressions_updated_at
  before update on progressions
  for each row
  execute function set_updated_at();

create table progression_unites (
  id uuid primary key default gen_random_uuid(),
  progression_id uuid not null references progressions(id) on delete cascade,
  unite_id uuid not null references unites(id) on delete cascade,
  position integer not null,
  unique (progression_id, position)
);

-- ---------------------------------------------------------------------------
-- Niveau 3 — Plannings annuels (instances)
-- ---------------------------------------------------------------------------

create table plannings (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references classes(id) on delete restrict,
  progression_id uuid not null references progressions(id) on delete restrict,
  annee_scolaire_id uuid not null references annees_scolaires(id) on delete restrict,
  -- Nombre de séances en excès (débordement non bloquant, cf. règles métier).
  nb_seances_en_exces integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_plannings_updated_at
  before update on plannings
  for each row
  execute function set_updated_at();

create table seances (
  id uuid primary key default gen_random_uuid(),
  planning_id uuid not null references plannings(id) on delete cascade,
  -- Référence vers le template d'origine (permet le push de mises à jour).
  unite_id uuid references unites(id) on delete set null,
  date date not null,
  heure_debut time not null,
  statut text not null default 'a_venir' check (statut in ('a_venir', 'fait', 'annulee', 'deplacee')),
  motif_annulation text,
  notes_seance text,
  -- Champs override_* : si null, la séance hérite des valeurs du template.
  override_titre text,
  override_lien_pdf text,
  override_instruction_eleves text,
  override_delai_impression_jours integer,
  override_delai_eleves_jours integer
);

create index seances_planning_id_idx on seances(planning_id);
create index seances_date_idx on seances(date);

-- ---------------------------------------------------------------------------
-- Niveau 4 — Évaluations (instances)
-- ---------------------------------------------------------------------------

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  planning_id uuid not null references plannings(id) on delete cascade,
  date date not null,
  heure_debut time not null,
  trimestre smallint not null check (trimestre in (1, 2, 3)),
  titre text,
  statut text not null default 'a_venir' check (statut in ('a_venir', 'fait', 'annulee'))
);

create index evaluations_planning_id_idx on evaluations(planning_id);
create index evaluations_date_idx on evaluations(date);

-- ---------------------------------------------------------------------------
-- Row Level Security — application strictement mono-utilisateur mais hébergée
-- publiquement : on restreint tout accès aux utilisateurs authentifiés.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'matieres', 'classes', 'annees_scolaires', 'emploi_du_temps',
      'periodes_calendrier', 'parametres', 'unites', 'progressions',
      'progression_unites', 'plannings', 'seances', 'evaluations'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
