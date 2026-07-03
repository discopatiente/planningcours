import { supabase } from './supabaseClient'
import type { AnneeScolaire } from '../types/anneeScolaire'

export async function fetchAnneesScolaires(): Promise<AnneeScolaire[]> {
  const { data, error } = await supabase
    .from('annees_scolaires')
    .select('*')
    .order('date_debut', { ascending: false })
  if (error) throw error
  return data
}

export async function createAnneeScolaire(
  libelle: string,
  dateDebut: string,
  dateFin: string,
): Promise<AnneeScolaire> {
  const { data, error } = await supabase
    .from('annees_scolaires')
    .insert({ libelle, date_debut: dateDebut, date_fin: dateFin, active: false })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateReferenceSemaineA(
  id: string,
  referenceSemaineADate: string | null,
): Promise<AnneeScolaire> {
  const { data, error } = await supabase
    .from('annees_scolaires')
    .update({ reference_semaine_a_date: referenceSemaineADate })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setAnneeActive(id: string): Promise<void> {
  const { error: clearError } = await supabase
    .from('annees_scolaires')
    .update({ active: false })
    .neq('id', id)
  if (clearError) throw clearError

  const { error: setError } = await supabase
    .from('annees_scolaires')
    .update({ active: true })
    .eq('id', id)
  if (setError) throw setError
}
