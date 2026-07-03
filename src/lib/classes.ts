import { supabase } from './supabaseClient'
import type { Classe } from '../types/classe'

export async function fetchClasses(): Promise<Classe[]> {
  const { data, error } = await supabase.from('classes').select('*').order('nom')
  if (error) throw error
  return data
}

export async function createClasse(nom: string, niveau: string): Promise<Classe> {
  const { data, error } = await supabase
    .from('classes')
    .insert({ nom, niveau: niveau || null })
    .select()
    .single()
  if (error) throw error
  return data
}
