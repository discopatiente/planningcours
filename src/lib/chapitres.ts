import { supabase } from './supabaseClient'
import type { Chapitre } from '../types/chapitre'

type ChampsModifiables = Partial<Pick<Chapitre, 'nom' | 'titre_court' | 'matiere_id' | 'archive'>>

export async function fetchChapitres(): Promise<Chapitre[]> {
  const { data, error } = await supabase.from('chapitres').select('*').order('nom')
  if (error) throw error
  return data
}

export async function createChapitre(nom: string, matiereId: string): Promise<Chapitre> {
  const { data, error } = await supabase
    .from('chapitres')
    .insert({ nom, matiere_id: matiereId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateChapitre(id: string, changes: ChampsModifiables): Promise<Chapitre> {
  const { data, error } = await supabase
    .from('chapitres')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteChapitre(id: string): Promise<void> {
  const { error } = await supabase.from('chapitres').delete().eq('id', id)
  if (error) throw error
}
