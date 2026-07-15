-- Liens vers le sujet et le corrigé d'un devoir, éditables directement
-- depuis l'onglet Devoirs (liste des devoirs).

alter table evaluations
  add column lien_sujet text,
  add column lien_corrige text;
