-- Introduction des chapitres, séparation Unités / Progressions, ressources multiples.
-- Voir note_mise_a_jour_progressions.md pour le contexte de cette révision.

-- ---------------------------------------------------------------------------
-- Chapitres : regroupent des unités, servent de trame par défaut réutilisable.
-- ---------------------------------------------------------------------------

create table chapitres (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  matiere_id uuid not null references matieres(id) on delete restrict,
  -- true = archivé : masqué de la vue courante, reste piochable pour les progressions.
  -- L'archivage n'est jamais une suppression.
  archive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_chapitres_updated_at
  before update on chapitres
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Unités : rattachement à un chapitre (nullable — une unité survit à son
-- chapitre d'origine) et position dans la trame par défaut du chapitre.
-- Le lien PDF unique est remplacé par la table ressources ci-dessous.
-- ---------------------------------------------------------------------------

alter table unites
  add column chapitre_id uuid references chapitres(id) on delete set null,
  add column ordre_interne_par_defaut integer,
  drop column lien_pdf;

create index unites_chapitre_id_idx on unites(chapitre_id);

-- ---------------------------------------------------------------------------
-- Ressources : plusieurs par unité, aucune mutualisation entre unités.
-- ---------------------------------------------------------------------------

create table ressources (
  id uuid primary key default gen_random_uuid(),
  unite_id uuid not null references unites(id) on delete cascade,
  type text not null check (type in ('support', 'video', 'exercice', 'devoir_possible', 'lien_utile')),
  libelle text,
  url text not null,
  ordre integer not null default 0
);

create index ressources_unite_id_idx on ressources(unite_id);

-- ---------------------------------------------------------------------------
-- Séances : override_lien_pdf n'a plus de champ template correspondant.
-- La surcharge locale des ressources reste à concevoir avec le moteur de
-- projection (voir brief_planificateur_cours.md, Niveau 3).
-- ---------------------------------------------------------------------------

alter table seances drop column override_lien_pdf;

-- ---------------------------------------------------------------------------
-- Row Level Security — même politique que le reste du schéma.
-- ---------------------------------------------------------------------------

alter table chapitres enable row level security;
create policy "authenticated_full_access" on chapitres for all to authenticated using (true) with check (true);

alter table ressources enable row level security;
create policy "authenticated_full_access" on ressources for all to authenticated using (true) with check (true);
