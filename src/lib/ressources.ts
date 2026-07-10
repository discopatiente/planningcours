import { supabase } from './supabaseClient'
import type { Ressource, TypeRessource } from '../types/ressource'

export const LIBELLES_TYPE_RESSOURCE: Record<TypeRessource, string> = {
  support: 'Support de cours',
  video: 'Vidéo',
  exercice: 'Exercice',
  devoir_possible: 'Devoir possible',
  lien_utile: 'Lien utile',
}

export async function fetchRessources(uniteId: string): Promise<Ressource[]> {
  const { data, error } = await supabase
    .from('ressources')
    .select('*')
    .eq('unite_id', uniteId)
    .order('ordre')
  if (error) throw error
  return data
}

// Toutes les ressources, toutes unités confondues — pour les vues qui
// affichent plusieurs unités à la fois (Semaine, Gantt) sans requête par
// unité.
export async function fetchToutesRessources(): Promise<Ressource[]> {
  const { data, error } = await supabase.from('ressources').select('*').order('ordre')
  if (error) throw error
  return data
}

export async function createRessource(
  uniteId: string,
  type: TypeRessource,
  url: string,
  libelle: string | null,
): Promise<Ressource> {
  const { count, error: countError } = await supabase
    .from('ressources')
    .select('id', { count: 'exact', head: true })
    .eq('unite_id', uniteId)
  if (countError) throw countError

  const { data, error } = await supabase
    .from('ressources')
    .insert({ unite_id: uniteId, type, url, libelle, ordre: (count ?? 0) + 1 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRessource(
  id: string,
  changes: Partial<Pick<Ressource, 'type' | 'libelle' | 'url'>>,
): Promise<Ressource> {
  const { data, error } = await supabase
    .from('ressources')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRessource(id: string): Promise<void> {
  const { error } = await supabase.from('ressources').delete().eq('id', id)
  if (error) throw error
}

// Pas de contrainte unique sur (unite_id, ordre) : une seule passe suffit.
export async function reorderRessources(orderedIds: string[]): Promise<void> {
  const updates = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('ressources').update({ ordre: index + 1 }).eq('id', id),
    ),
  )
  for (const { error } of updates) if (error) throw error
}
