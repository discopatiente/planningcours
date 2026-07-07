import { supabase } from './supabaseClient'
import type { Planning } from '../types/planning'
import type { AnneeScolaire } from '../types/anneeScolaire'
import type { Progression } from '../types/progression'
import { fetchCreneaux } from './emploiDuTemps'
import { fetchPeriodesCalendrier } from './periodesCalendrier'
import { fetchProgressionUnites } from './progressionUnites'
import { fetchParametres } from './parametres'
import { fetchEvaluationsAnnee, insertEvaluations } from './evaluations'
import { insertSeances } from './seances'
import { projeter } from './projectionEngine'

export async function fetchPlanningsAnnee(anneeScolaireId: string): Promise<Planning[]> {
  const { data, error } = await supabase
    .from('plannings')
    .select('*')
    .eq('annee_scolaire_id', anneeScolaireId)
  if (error) throw error
  return data
}

export async function deletePlanning(id: string): Promise<void> {
  const { error } = await supabase.from('plannings').delete().eq('id', id)
  if (error) throw error
}

async function creerPlanning(
  classeId: string,
  progressionId: string,
  anneeScolaireId: string,
  nbSeancesEnExces: number,
): Promise<Planning> {
  const { data, error } = await supabase
    .from('plannings')
    .insert({
      classe_id: classeId,
      progression_id: progressionId,
      annee_scolaire_id: anneeScolaireId,
      nb_seances_en_exces: nbSeancesEnExces,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface ResultatGeneration {
  planning: Planning
  nbSeances: number
  nbEvaluations: number
  nbSeancesEnExces: number
}

// Exécute le moteur de projection pour une classe et une progression
// données, et persiste le planning + ses séances + ses évaluations. Si un
// planning existe déjà pour ce couple classe/progression/année, il est
// supprimé et régénéré en entier (pas de recalcul en cascade ici — cette
// régénération complète sert à tester le moteur ; les actions fines
// d'annulation/déplacement viendront avec les vues Semaine/Gantt).
export async function genererPlanning(
  classeId: string,
  progression: Progression,
  anneeScolaire: AnneeScolaire,
  planningExistant: Planning | null,
): Promise<ResultatGeneration> {
  if (planningExistant) {
    await deletePlanning(planningExistant.id)
  }

  const [creneauxAnnee, periodes, progressionUnites, parametres, evaluationsExistantes] = await Promise.all([
    fetchCreneaux(anneeScolaire.id),
    fetchPeriodesCalendrier(anneeScolaire.id),
    fetchProgressionUnites(progression.id),
    fetchParametres(),
    fetchEvaluationsAnnee(anneeScolaire.id),
  ])

  const creneaux = creneauxAnnee.filter((c) => c.classe_id === classeId && c.matiere_id === progression.matiere_id)
  const uniteIds = progressionUnites.map((pu) => pu.unite_id)

  const resultat = projeter(
    uniteIds,
    creneaux,
    anneeScolaire,
    periodes,
    parametres.evaluations_par_trimestre,
    parametres.max_evaluations_semaine,
    evaluationsExistantes,
  )

  const planning = await creerPlanning(classeId, progression.id, anneeScolaire.id, resultat.nbSeancesEnExces)
  await insertSeances(planning.id, resultat.seances)
  await insertEvaluations(planning.id, resultat.evaluations)

  return {
    planning,
    nbSeances: resultat.seances.length,
    nbEvaluations: resultat.evaluations.length,
    nbSeancesEnExces: resultat.nbSeancesEnExces,
  }
}
