-- Resserre les policies RLS : jusqu'ici, la policy "authenticated_full_access"
-- utilisait `using (true)`, donc n'importe quel compte Supabase authentifié
-- (pas seulement l'enseignant) obtenait un accès complet en lecture/écriture
-- à toutes les tables. La seule barrière était externe au code : le statut
-- "Testing" de l'écran de consentement Google OAuth, qui limite les
-- connexions à une liste de testeurs approuvés côté Google Cloud Console.
--
-- On remplace cette policy par une vérification de l'email du compte
-- authentifié, portée par la base elle-même plutôt que par un réglage tiers
-- modifiable indépendamment du code.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'matieres', 'classes', 'annees_scolaires', 'emploi_du_temps',
      'periodes_calendrier', 'parametres', 'unites', 'progressions',
      'progression_unites', 'plannings', 'seances', 'evaluations',
      'chapitres', 'ressources'
    ])
  loop
    execute format('drop policy if exists "authenticated_full_access" on %I', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all to authenticated using (auth.jwt() ->> ''email'' = ''remi.girardet@gmail.com'') with check (auth.jwt() ->> ''email'' = ''remi.girardet@gmail.com'')',
      t
    );
  end loop;
end $$;
