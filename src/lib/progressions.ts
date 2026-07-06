import { supabase } from './supabaseClient'
import type { Progression } from '../types/progression'

export async function fetchProgressions(): Promise<Progression[]> {
  const { data, error } = await supabase.from('progressions').select('*').order('nom')
  if (error) throw error
  return data
}

export async function createProgression(nom: string, matiereId: string): Promise<Progression> {
  const { data, error } = await supabase
    .from('progressions')
    .insert({ nom, matiere_id: matiereId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProgression(
  id: string,
  changes: Partial<Pick<Progression, 'nom' | 'matiere_id'>>,
): Promise<Progression> {
  const { data, error } = await supabase
    .from('progressions')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProgression(id: string): Promise<void> {
  const { error } = await supabase.from('progressions').delete().eq('id', id)
  if (error) throw error
}
