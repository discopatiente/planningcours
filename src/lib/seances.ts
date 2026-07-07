import { supabase } from './supabaseClient'
import type { Seance } from '../types/seance'

export async function fetchSeancesPlanning(planningId: string): Promise<Seance[]> {
  const { data, error } = await supabase
    .from('seances')
    .select('*')
    .eq('planning_id', planningId)
    .order('date')
    .order('heure_debut')
  if (error) throw error
  return data
}

export async function insertSeances(
  planningId: string,
  seances: { unite_id: string; date: string; heure_debut: string }[],
): Promise<Seance[]> {
  if (seances.length === 0) return []
  const { data, error } = await supabase
    .from('seances')
    .insert(
      seances.map((s) => ({
        planning_id: planningId,
        unite_id: s.unite_id,
        date: s.date,
        heure_debut: s.heure_debut,
        statut: 'a_venir' as const,
      })),
    )
    .select()
  if (error) throw error
  return data
}
