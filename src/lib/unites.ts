import { supabase } from './supabaseClient'
import type { Unite } from '../types/unite'

type ChampsModifiables = Partial<
  Pick<
    Unite,
    | 'titre'
    | 'matiere_id'
    | 'delai_impression_jours'
    | 'delai_eleves_jours'
    | 'instruction_eleves'
    | 'notes'
  >
>

export async function fetchUnites(): Promise<Unite[]> {
  const { data, error } = await supabase.from('unites').select('*').order('titre')
  if (error) throw error
  return data
}

export async function createUnite(titre: string, matiereId: string): Promise<Unite> {
  const { data, error } = await supabase
    .from('unites')
    .insert({ titre, matiere_id: matiereId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateUnite(id: string, changes: ChampsModifiables): Promise<Unite> {
  const { data, error } = await supabase
    .from('unites')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteUnite(id: string): Promise<void> {
  const { error } = await supabase.from('unites').delete().eq('id', id)
  if (error) throw error
}

export async function dupliquerUnite(unite: Unite): Promise<Unite> {
  const ordre = unite.chapitre_id ? await nextOrdreDansChapitre(unite.chapitre_id) : null
  const { data, error } = await supabase
    .from('unites')
    .insert({
      titre: `${unite.titre} (copie)`,
      matiere_id: unite.matiere_id,
      chapitre_id: unite.chapitre_id,
      ordre_interne_par_defaut: ordre,
      delai_impression_jours: unite.delai_impression_jours,
      delai_eleves_jours: unite.delai_eleves_jours,
      instruction_eleves: unite.instruction_eleves,
      notes: unite.notes,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Prochaine position en fin de trame par défaut d'un chapitre. Basé sur le
// MAX (et non un COUNT) pour rester correct même si des unités ont été
// détachées du chapitre entre-temps et ont laissé des trous dans la suite.
async function nextOrdreDansChapitre(chapitreId: string): Promise<number> {
  const { data, error } = await supabase
    .from('unites')
    .select('ordre_interne_par_defaut')
    .eq('chapitre_id', chapitreId)
    .order('ordre_interne_par_defaut', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.ordre_interne_par_defaut ?? 0) + 1
}

// Affecte une unité à un chapitre (ou la détache si chapitreId est null), en
// la plaçant en fin de la trame par défaut du chapitre cible.
export async function assignUniteToChapitre(
  uniteId: string,
  chapitreId: string | null,
): Promise<Unite> {
  const ordre = chapitreId ? await nextOrdreDansChapitre(chapitreId) : null

  const { data, error } = await supabase
    .from('unites')
    .update({ chapitre_id: chapitreId, ordre_interne_par_defaut: ordre })
    .eq('id', uniteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Recalcule ordre_interne_par_defaut après un réordonnancement de la trame
// par défaut d'un chapitre (drag-and-drop dans la page Unités de cours).
export async function reorderUnitesDansChapitre(orderedIds: string[]): Promise<void> {
  const updates = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('unites').update({ ordre_interne_par_defaut: index + 1 }).eq('id', id),
    ),
  )
  for (const { error } of updates) if (error) throw error
}
