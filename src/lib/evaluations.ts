import { supabase } from './supabaseClient'
import type { Evaluation } from '../types/evaluation'

// Toutes les évaluations déjà planifiées pour une année scolaire, tous
// plannings (donc toutes classes) confondus — nécessaire pour faire
// respecter la règle max_evaluations_semaine « toutes classes confondues ».
export async function fetchEvaluationsAnnee(anneeScolaireId: string): Promise<{ date: string }[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('date, plannings!inner(annee_scolaire_id)')
    .eq('plannings.annee_scolaire_id', anneeScolaireId)
  if (error) throw error
  return data
}

export async function fetchEvaluationsPlanning(planningId: string): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('planning_id', planningId)
    .order('date')
  if (error) throw error
  return data
}

export async function insertEvaluations(
  planningId: string,
  evaluations: { date: string; heure_debut: string; trimestre: 1 | 2 | 3 }[],
): Promise<Evaluation[]> {
  if (evaluations.length === 0) return []
  const { data, error } = await supabase
    .from('evaluations')
    .insert(
      evaluations.map((e) => ({
        planning_id: planningId,
        date: e.date,
        heure_debut: e.heure_debut,
        trimestre: e.trimestre,
        statut: 'a_venir' as const,
      })),
    )
    .select()
  if (error) throw error
  return data
}
