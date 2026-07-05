import { supabase } from './supabaseClient'
import type { Parametres } from '../types/parametres'

export async function fetchParametres(): Promise<Parametres> {
  const { data, error } = await supabase.from('parametres').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function updateAcademie(academie: string | null): Promise<Parametres> {
  const { data, error } = await supabase
    .from('parametres')
    .update({ academie })
    .eq('id', 1)
    .select()
    .single()
  if (error) throw error
  return data
}
