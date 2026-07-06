import { supabase } from './supabaseClient'
import type { ProgressionUnite } from '../types/progressionUnite'

const SELECT_AVEC_UNITE = '*, unite:unites(*, chapitre:chapitres(id, nom))'

export async function fetchProgressionUnites(progressionId: string): Promise<ProgressionUnite[]> {
  const { data, error } = await supabase
    .from('progression_unites')
    .select(SELECT_AVEC_UNITE)
    .eq('progression_id', progressionId)
    .order('position')
  if (error) throw error
  return data
}

export async function addUniteToProgression(
  progressionId: string,
  uniteId: string,
): Promise<ProgressionUnite> {
  const { count, error: countError } = await supabase
    .from('progression_unites')
    .select('id', { count: 'exact', head: true })
    .eq('progression_id', progressionId)
  if (countError) throw countError

  const { data, error } = await supabase
    .from('progression_unites')
    .insert({ progression_id: progressionId, unite_id: uniteId, position: (count ?? 0) + 1 })
    .select(SELECT_AVEC_UNITE)
    .single()
  if (error) throw error
  return data
}

// Assemble un chapitre entier dans une progression : uniteIds doit déjà être
// filtré des unités déjà présentes et ordonné selon la trame par défaut du
// chapitre. Une fois insérées, ces positions sont une copie propre à cette
// progression — les réordonner n'affecte plus le chapitre d'origine.
export async function addChapitreToProgression(
  progressionId: string,
  uniteIds: string[],
): Promise<ProgressionUnite[]> {
  if (uniteIds.length === 0) return []

  const { count, error: countError } = await supabase
    .from('progression_unites')
    .select('id', { count: 'exact', head: true })
    .eq('progression_id', progressionId)
  if (countError) throw countError

  const base = count ?? 0
  const { data, error } = await supabase
    .from('progression_unites')
    .insert(
      uniteIds.map((uniteId, index) => ({
        progression_id: progressionId,
        unite_id: uniteId,
        position: base + index + 1,
      })),
    )
    .select(SELECT_AVEC_UNITE)
    .order('position')
  if (error) throw error
  return data
}

export async function removeProgressionUnite(id: string): Promise<void> {
  const { error } = await supabase.from('progression_unites').delete().eq('id', id)
  if (error) throw error
}

// Recalcule les positions en deux passes pour éviter toute collision avec la
// contrainte unique (progression_id, position) : on passe d'abord par des
// valeurs négatives (jamais utilisées autrement), puis on fixe les positions
// finales.
export async function reorderProgressionUnites(orderedIds: string[]): Promise<void> {
  const phase1 = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('progression_unites')
        .update({ position: -(index + 1) })
        .eq('id', id),
    ),
  )
  for (const { error } of phase1) if (error) throw error

  const phase2 = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('progression_unites')
        .update({ position: index + 1 })
        .eq('id', id),
    ),
  )
  for (const { error } of phase2) if (error) throw error
}
