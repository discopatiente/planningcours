import { supabase } from './supabaseClient'
import type { Unite } from '../types/unite'

type ChampsModifiables = Partial<
  Pick<
    Unite,
    | 'titre'
    | 'matiere_id'
    | 'lien_pdf'
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
  const { data, error } = await supabase
    .from('unites')
    .insert({
      titre: `${unite.titre} (copie)`,
      matiere_id: unite.matiere_id,
      lien_pdf: unite.lien_pdf,
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
