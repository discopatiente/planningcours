import { supabase } from './supabaseClient'
import type { Eleve } from '../types/eleve'

export async function fetchEleves(classeId: string): Promise<Eleve[]> {
  const { data, error } = await supabase
    .from('eleves')
    .select('*')
    .eq('classe_id', classeId)
    .order('nom')
    .order('prenom')
  if (error) throw error
  return data
}

// Tous les élèves, toutes classes confondues — pour les vues qui doivent
// résoudre un nom d'élève sans connaitre sa classe à l'avance (panneau de
// séance, onglet Élèves pour la liste des rattrapages en attente).
export async function fetchTousEleves(): Promise<Eleve[]> {
  const { data, error } = await supabase.from('eleves').select('*').order('nom').order('prenom')
  if (error) throw error
  return data
}

export async function createEleve(classeId: string, nom: string, prenom: string): Promise<Eleve> {
  const { data, error } = await supabase
    .from('eleves')
    .insert({ classe_id: classeId, nom, prenom })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEleve(id: string, changes: Partial<Pick<Eleve, 'nom' | 'prenom'>>): Promise<Eleve> {
  const { data, error } = await supabase.from('eleves').update(changes).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteEleve(id: string): Promise<void> {
  const { error } = await supabase.from('eleves').delete().eq('id', id)
  if (error) throw error
}
