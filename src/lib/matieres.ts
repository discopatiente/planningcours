import { supabase } from './supabaseClient'
import type { Matiere } from '../types/matiere'

export async function fetchMatieres(): Promise<Matiere[]> {
  const { data, error } = await supabase.from('matieres').select('*').order('nom')
  if (error) throw error
  return data
}

export async function createMatiere(nom: string, couleur: string): Promise<Matiere> {
  const { data, error } = await supabase
    .from('matieres')
    .insert({ nom, couleur })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMatiere(
  id: string,
  changes: Partial<Pick<Matiere, 'nom' | 'couleur'>>,
): Promise<Matiere> {
  const { data, error } = await supabase
    .from('matieres')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMatiere(id: string): Promise<void> {
  const { error } = await supabase.from('matieres').delete().eq('id', id)
  if (error) throw error
}
