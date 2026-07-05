import { supabase } from './supabaseClient'
import type { PeriodeCalendrier, TypePeriode } from '../types/periodeCalendrier'

export async function fetchPeriodesCalendrier(anneeScolaireId: string): Promise<PeriodeCalendrier[]> {
  const { data, error } = await supabase
    .from('periodes_calendrier')
    .select('*')
    .eq('annee_scolaire_id', anneeScolaireId)
    .order('date_debut')
  if (error) throw error
  return data
}

export async function createPeriodeCalendrier(
  anneeScolaireId: string,
  nom: string,
  dateDebut: string,
  dateFin: string,
  type: TypePeriode,
): Promise<PeriodeCalendrier> {
  const { data, error } = await supabase
    .from('periodes_calendrier')
    .insert({ annee_scolaire_id: anneeScolaireId, nom, date_debut: dateDebut, date_fin: dateFin, type })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createPeriodesCalendrier(
  anneeScolaireId: string,
  periodes: { nom: string; date_debut: string; date_fin: string; type: TypePeriode }[],
): Promise<PeriodeCalendrier[]> {
  if (periodes.length === 0) return []
  const { data, error } = await supabase
    .from('periodes_calendrier')
    .insert(periodes.map((p) => ({ annee_scolaire_id: anneeScolaireId, ...p })))
    .select()
  if (error) throw error
  return data
}

export async function updatePeriodeCalendrier(
  id: string,
  changes: Partial<Pick<PeriodeCalendrier, 'nom' | 'date_debut' | 'date_fin' | 'type'>>,
): Promise<PeriodeCalendrier> {
  const { data, error } = await supabase
    .from('periodes_calendrier')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePeriodeCalendrier(id: string): Promise<void> {
  const { error } = await supabase.from('periodes_calendrier').delete().eq('id', id)
  if (error) throw error
}
